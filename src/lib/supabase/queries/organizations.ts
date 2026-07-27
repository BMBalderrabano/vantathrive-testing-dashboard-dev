import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import {
  organizationSchema,
  type Organization,
} from '../schemas/organizations';

export class OrganizationsQuery extends SupabaseQuery {
  /**
   * Get all organizations
   * @returns Success with organizations array or error
   */
  public async getList(): Promise<
    SupabaseSuccess<Organization[]> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('organizations')
      .select(
        '*, organization_members(id, user_id, is_active, role, profiles!inner(id, avatar_url, first_name, last_name, email)), teams(id)',
      )
      .or('is_super_admin.is.null,is_super_admin.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get organizations',
      );
    }

    if (!data) {
      return {
        success: true,
        data: [],
      };
    }

    // Transform data: organization_members now includes profile data
    type RawOrganizationMember = {
      id: string;
      user_id: string;
      is_active: boolean | null;
      role: 'admin' | 'member' | 'patient';
      profiles: {
        id: string;
        avatar_url: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
    };

    type RawOrganization = Omit<
      Organization,
      'members_count' | 'member_ids' | 'members' | 'teams_count'
    > & {
      organization_members: RawOrganizationMember[] | null;
      teams: { id: string }[] | null;
    };

    const transformedData = (data as RawOrganization[]).map((org) => {
      const { organization_members, teams, ...orgData } = org;
      // Filter to only active members and transform to include profile data
      const members =
        Array.isArray(organization_members) && organization_members.length > 0
          ? organization_members
              .filter((m) => m.is_active === true)
              .map((m) => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                profile: m.profiles
                  ? {
                      id: m.profiles.id,
                      avatar_url: m.profiles.avatar_url,
                      first_name: m.profiles.first_name,
                      last_name: m.profiles.last_name,
                      email: m.profiles.email,
                    }
                  : null,
              }))
          : [];
      const memberIds = members.map((m) => m.id);
      const teamsCount = Array.isArray(teams) ? teams.length : 0;
      return {
        ...orgData,
        members_count: members.length,
        member_ids: memberIds.length > 0 ? memberIds : undefined,
        members: members.length > 0 ? members : undefined,
        teams_count: teamsCount,
      };
    });

    const result = organizationSchema.array().safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Get a single organization by ID (with members + teams_count)
   * @param id - The organization id
   * @returns Success with organization or error
   */
  public async getById(
    id: string,
  ): Promise<SupabaseSuccess<Organization> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('organizations')
      .select(
        '*, organization_members(id, user_id, is_active, role, profiles!inner(id, avatar_url, first_name, last_name, email)), teams(id)',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get organization',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Organization not found',
      };
    }

    type RawOrganizationMember = {
      id: string;
      user_id: string;
      is_active: boolean | null;
      role: 'admin' | 'member' | 'patient';
      profiles: {
        id: string;
        avatar_url: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      } | null;
    };

    type RawOrganization = Omit<
      Organization,
      'members_count' | 'member_ids' | 'members' | 'teams_count'
    > & {
      organization_members: RawOrganizationMember[] | null;
      teams: { id: string }[] | null;
    };

    const org = data as RawOrganization;
    const { organization_members, teams, ...orgData } = org;

    const members =
      Array.isArray(organization_members) && organization_members.length > 0
        ? organization_members
            .filter((m) => m.is_active === true)
            .map((m) => ({
              id: m.id,
              user_id: m.user_id,
              role: m.role,
              profile: m.profiles
                ? {
                    id: m.profiles.id,
                    avatar_url: m.profiles.avatar_url,
                    first_name: m.profiles.first_name,
                    last_name: m.profiles.last_name,
                    email: m.profiles.email,
                  }
                : null,
            }))
        : [];

    const memberIds = members.map((m) => m.id);
    const teamsCount = Array.isArray(teams) ? teams.length : 0;

    const transformed = {
      ...orgData,
      members_count: members.length,
      member_ids: memberIds.length > 0 ? memberIds : undefined,
      members: members.length > 0 ? members : undefined,
      teams_count: teamsCount,
    };

    const result = organizationSchema.safeParse(transformed);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Create a new organization
   * @param name - The organization name
   * @param description - Optional organization description
   * @returns Success with created organization or error
   */
  public async create(
    name: string,
    description?: string | null,
  ): Promise<SupabaseSuccess<Organization> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to create organization',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create organization',
      };
    }

    const result = organizationSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Update an organization
   * @param id - The organization id
   * @param data - The data to update
   * @returns Success with updated organization or error
   */
  public async update(
    id: string,
    data: Partial<Organization>,
  ): Promise<SupabaseSuccess<Organization> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const {
      teams: _teams,
      members_count: _mc,
      member_ids: _mi,
      members: _members,
      teams_count: _tc,
      ...updatePayload
    } = data as Partial<Organization> & Record<string, unknown>;

    const { data: updatedData, error } = await supabase
      .from('organizations')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to update organization',
      );
    }

    if (!updatedData) {
      return {
        success: false,
        error: 'Failed to update organization',
      };
    }

    const result = organizationSchema.safeParse(updatedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Delete an organization
   * @param id - The organization id
   * @returns Success or error
   */
  public async delete(
    id: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to delete organization',
      );
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Get super admin organization ID
   * @returns Success with organization ID or error
   */
  public async getSuperAdminOrganizationId(): Promise<
    SupabaseSuccess<string> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('is_super_admin', true)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Super admin organization not found',
      };
    }

    return {
      success: true,
      data: data.id,
    };
  }

  /**
   * Get all organizations with their names for case-sensitive lookup (for import validation)
   * @returns Success with Map of organization name to ID or error
   */
  public async getAllForImport(): Promise<
    SupabaseSuccess<Map<string, string>> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name');

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get organizations for import',
      );
    }

    const orgMap = new Map<string, string>();
    if (data) {
      for (const org of data) {
        orgMap.set(org.name, org.id);
      }
    }

    return {
      success: true,
      data: orgMap,
    };
  }
}
