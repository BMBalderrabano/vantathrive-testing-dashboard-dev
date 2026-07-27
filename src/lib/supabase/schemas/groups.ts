export type UpsertGroupResult =
  | {
      success: true;
      id: string;
      group_hash: string;
      cloned: boolean;
      reference_count: number;
      original_id?: string;
    }
  | {
      success: false;
      error: string;
      message: string;
    };
