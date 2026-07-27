import 'server-only';

import { PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';
import { createServiceRoleClient } from './service-role';

export {
  createParallelQueries,
  type SupabaseError,
  type SupabaseSuccess,
  type IndependentQueryConfig,
  type DependentQueryConfig,
  type QueryConfig,
  type ConditionalQueryConfig,
} from './parallel-queries';

/** QA dashboard always uses service_role on the server. */
export type ClientRole = 'service_role';

type SupabaseClientType = ReturnType<typeof createServiceRoleClient>;

let adminClientInstance: SupabaseClientType | null = null;

export abstract class SupabaseQuery {
  private _supabase: SupabaseClientType | null = null;

  constructor() {}

  /**
   * Returns the singleton service_role client (server-only).
   */
  protected async getClient(
    _role: ClientRole = 'service_role',
  ): Promise<SupabaseClientType> {
    if (this._supabase) {
      return this._supabase;
    }

    if (!adminClientInstance) {
      adminClientInstance = createServiceRoleClient();
    }
    this._supabase = adminClientInstance;
    return this._supabase;
  }

  protected async withClient<T>(
    _role: ClientRole = 'service_role',
    queryFn: (client: SupabaseClientType) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient('service_role');
    return queryFn(client);
  }

  protected parsePostgresErrorCode(error: PostgrestError) {
    switch (error.code) {
      case 'P0400':
        return 400;
      case 'P0401':
        return 401;
      case 'P0403':
        return 403;
      case 'P0404':
        return 404;
      case 'P0500':
        return 500;
      default:
        return 500;
    }
  }

  protected parsePostgrestErrorMessage(
    code: number,
    error: PostgrestError,
    messageErrorDefault: string,
  ): string {
    return code === 500 ? error.message || messageErrorDefault : error.message;
  }

  protected parseResponsePostgresError(
    error: PostgrestError,
    messageErrorDefault: string,
  ): import('./parallel-queries').SupabaseError {
    const code = this.parsePostgresErrorCode(error);
    const message = this.parsePostgrestErrorMessage(
      code,
      error,
      messageErrorDefault,
    );
    console.log('Postgres Error:', {
      code,
      message,
      error: error.message,
      details: error.details,
      hint: error.hint,
    });

    return {
      success: false,
      error: message,
      status: code,
    };
  }

  protected parseResponseZodError(error: ZodError): import('./parallel-queries').SupabaseError {
    const formattedErrors = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    console.error('Zod Error:', formattedErrors);

    const message = formattedErrors
      .map((error) => `${error.path}: ${error.message}`)
      .join(', ');

    return {
      success: false,
      error: message,
      status: 400,
    };
  }
}
