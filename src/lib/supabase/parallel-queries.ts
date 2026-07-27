type ActionFailure = {
  success: false;
  status: number;
  error: string;
};

type ActionSuccess<T> = {
  success: true;
  data: T;
};

type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export type SupabaseError = {
  success: false;
  error: string;
  status?: number;
};

export type SupabaseSuccess<T> = {
  success: true;
  data: T;
};

export type IndependentQueryConfig<T> = {
  query: () => Promise<SupabaseSuccess<T> | SupabaseError>;
  required?: boolean;
  defaultValue?: T;
  statusCode?: number;
  condition?: boolean;
};

export type DependentQueryConfig<T, TDeps = Record<string, unknown>> = {
  query: (deps: TDeps) => Promise<SupabaseSuccess<T> | SupabaseError>;
  required?: boolean;
  defaultValue?: T;
  statusCode?: number;
  dependsOn: ReadonlyArray<string>;
  condition?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryConfig<T, TDeps = any> =
  | IndependentQueryConfig<T>
  | DependentQueryConfig<T, TDeps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConditionalQueryConfig<T, TDeps = any> = QueryConfig<T, TDeps> & {
  condition: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuerySchema = Record<string, QueryConfig<any, any>>;

type ExtractResultType<T> = T extends
  | IndependentQueryConfig<infer U>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | DependentQueryConfig<infer U, any>
  ? U
  : never;

type QueryResults<T extends QuerySchema> = {
  [K in keyof T]: ExtractResultType<T[K]>;
};

function toActionResult<T>(
  result: SupabaseSuccess<T> | SupabaseError,
  defaultStatus: number = 500,
): ActionResult<T> {
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    status: result.status ?? defaultStatus,
    error: result.error,
  };
}

/** Dependency-aware parallel query runner — safe for client and server. */
export async function createParallelQueries<T extends QuerySchema>(
  schema: T,
): Promise<QueryResults<T>> {
  const activeQueries = Object.entries(schema)
    .filter(([, def]) => {
      if (def.condition !== undefined) {
        return def.condition;
      }
      return true;
    })
    .map(([key, def]) => {
      const dependsOn =
        'dependsOn' in def && def.dependsOn
          ? Array.isArray(def.dependsOn)
            ? (def.dependsOn as readonly string[]).slice()
            : []
          : [];

      return {
        key,
        query: def.query,
        required: def.required ?? false,
        defaultValue: def.defaultValue,
        statusCode: def.statusCode,
        dependsOn,
      };
    });

  const queryKeys = new Set(activeQueries.map((q) => q.key));
  for (const query of activeQueries) {
    for (const dep of query.dependsOn) {
      if (!queryKeys.has(dep)) {
        throw new Error(
          `Query "${query.key}" depends on "${dep}" which is not in the schema`,
        );
      }
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(key: string): boolean {
    if (recStack.has(key)) {
      return true;
    }
    if (visited.has(key)) {
      return false;
    }

    visited.add(key);
    recStack.add(key);

    const query = activeQueries.find((q) => q.key === key);
    if (query) {
      for (const dep of query.dependsOn) {
        if (hasCycle(dep)) {
          return true;
        }
      }
    }

    recStack.delete(key);
    return false;
  }

  for (const query of activeQueries) {
    if (hasCycle(query.key)) {
      throw new Error(
        `Circular dependency detected involving query "${query.key}"`,
      );
    }
  }

  const levels: (typeof activeQueries)[] = [];
  const scheduled = new Set<string>();
  const remaining = new Set(activeQueries.map((q) => q.key));

  while (remaining.size > 0) {
    const currentLevel: typeof activeQueries = [];

    for (const query of activeQueries) {
      if (!remaining.has(query.key)) continue;

      const allDepsSatisfied = query.dependsOn.every((dep) =>
        scheduled.has(dep),
      );

      if (allDepsSatisfied) {
        currentLevel.push(query);
        remaining.delete(query.key);
      }
    }

    if (currentLevel.length === 0) {
      const remainingQueries = Array.from(remaining);
      const debugInfo = remainingQueries
        .map((key) => {
          const query = activeQueries.find((q) => q.key === key);
          return `"${key}" depends on [${query?.dependsOn.join(', ')}]`;
        })
        .join(', ');

      throw new Error(
        `Cannot resolve dependencies - possible circular dependency. Remaining: ${debugInfo}. Scheduled: ${Array.from(scheduled).join(', ')}`,
      );
    }

    for (const query of currentLevel) {
      scheduled.add(query.key);
    }

    levels.push(currentLevel);
  }

  const output = {} as QueryResults<T>;

  for (const level of levels) {
    const results = await Promise.all(
      level.map(async ({ key, query, required, defaultValue, statusCode }) => {
        const result = await query(output as Record<string, unknown>);
        const actionResult = toActionResult(result, statusCode);

        return { key, result: actionResult, required, defaultValue };
      }),
    );

    for (const { key, result, required, defaultValue } of results) {
      if (required && !result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to execute required query:', key, result);
        }
        throw new Error(result.error);
      }

      output[key as keyof T] = (
        result.success ? result.data : (defaultValue ?? null)
      ) as ExtractResultType<T[typeof key]>;
    }
  }

  return output;
}
