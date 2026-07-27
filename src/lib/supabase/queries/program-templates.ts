import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import {
  programTemplateSchema,
  type ProgramTemplate,
} from '../schemas/program-templates';

export class ProgramTemplatesQuery extends SupabaseQuery {
  /**
   * Get all program templates
   * @returns Success with program templates array or error
   */
  public async getList(): Promise<
    SupabaseSuccess<ProgramTemplate[]> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_template')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program templates',
      );
    }

    if (!data) {
      return {
        success: true,
        data: [],
      };
    }

    const result = programTemplateSchema.array().safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Get a single program template by ID
   * @param id - The template ID
   * @returns Success with program template or error
   */
  public async getById(
    id: string,
  ): Promise<SupabaseSuccess<ProgramTemplate> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_template')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program template',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Program template not found',
      };
    }

    const result = programTemplateSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Create a new program template
   * @param name - The template name
   * @param weeks - Number of weeks
   * @param description - Optional description
   * @param goals - Optional goals
   * @param notes - Optional notes
   * @param organizationId - Optional organization ID
   * @returns Success with created template or error
   */
  public async create(
    name: string,
    weeks: number,
    description?: string | null,
    goals?: string | null,
    notes?: string | null,
    organizationId?: string | null,
    imageUrl?: string | null,
  ): Promise<SupabaseSuccess<ProgramTemplate> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_template')
      .insert({
        name: name.trim(),
        weeks,
        description: description?.trim() || null,
        goals: goals?.trim() || null,
        notes: notes?.trim() || null,
        organization_id: organizationId || null,
        active: true,
        image_url: imageUrl ? { image_url: imageUrl } : null,
      })
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to create program template',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create program template',
      };
    }

    const result = programTemplateSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Update a program template
   * @param id - The template id
   * @param data - The data to update
   * @returns Success with updated template or error
   */
  public async update(
    id: string,
    data: Partial<ProgramTemplate>,
  ): Promise<SupabaseSuccess<ProgramTemplate> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data: updatedData, error } = await supabase
      .from('program_template')
      .update({
        ...(data as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to update program template',
      );
    }

    if (!updatedData) {
      return {
        success: false,
        error: 'Failed to update program template',
      };
    }

    const result = programTemplateSchema.safeParse(updatedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Delete a program template
   * @param id - The template ID
   * @returns Success or error
   */
  public async delete(
    id: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { error } = await supabase
      .from('program_template')
      .delete()
      .eq('id', id);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to delete program template',
      );
    }

    return {
      success: true,
      data: undefined,
    };
  }
}
