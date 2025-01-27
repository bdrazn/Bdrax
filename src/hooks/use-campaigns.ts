import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  workspace_id: string;
  template_id: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'failed';
  scheduled_for: string | null;
  target_list: {
    zip_codes?: string[];
    property_type?: string;
    min_units?: number;
    max_units?: number;
    min_value?: number;
    max_value?: number;
  };
  created_at: string;
  updated_at: string;
}

interface CampaignStats {
  total_messages: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  response_count: number;
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .select(`
          *,
          stats:bulk_message_stats(
            total_messages,
            sent_count,
            delivered_count,
            failed_count,
            response_count
          )
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .insert(campaign)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create campaign');
      console.error('Create campaign error:', error);
    }
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('bulk_message_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update campaign');
      console.error('Update campaign error:', error);
    }
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bulk_message_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete campaign');
      console.error('Delete campaign error:', error);
    }
  });

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
}