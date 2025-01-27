import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Deal {
  id: string;
  property_id: string;
  status: 'interested' | 'not_interested' | 'dnc';
  source: 'user' | 'ai';
  confidence?: number;
  notes?: string;
  created_at: string;
  property: {
    address: string;
    city: string;
    state: string;
    zip: string;
    estimated_value: number;
  };
  owner: {
    first_name: string;
    last_name: string;
    email: string;
    phone_numbers: {
      number: string;
      type: string;
    }[];
  };
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // First get the properties with their status history
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          address,
          city,
          state,
          zip,
          estimated_value,
          workspace_id,
          status_history:property_status_history(
            id,
            status,
            created_at
          ),
          owners:contact_properties(
            contact:profiles(
              id,
              first_name,
              last_name,
              email,
              phone_numbers(
                number,
                type
              )
            )
          )
        `)
        .eq('workspace_id', workspace.workspace_id)
        .not('status_history', 'is', null);

      if (error) throw error;

      // Transform the data to match our interface
      const deals = data?.flatMap(property => {
        // Get the latest status for each property
        const latestStatus = property.status_history?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        if (!latestStatus || !['interested', 'not_interested', 'dnc'].includes(latestStatus.status)) {
          return [];
        }

        // Get the primary owner of the property
        const primaryOwner = property.owners?.[0]?.contact;
        if (!primaryOwner) return [];

        return [{
          id: latestStatus.id,
          property_id: property.id,
          status: latestStatus.status as Deal['status'],
          created_at: latestStatus.created_at,
          property: {
            address: property.address,
            city: property.city,
            state: property.state,
            zip: property.zip,
            estimated_value: property.estimated_value
          },
          owner: {
            first_name: primaryOwner.first_name,
            last_name: primaryOwner.last_name,
            email: primaryOwner.email,
            phone_numbers: primaryOwner.phone_numbers || []
          }
        }];
      });

      return deals.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  });
}