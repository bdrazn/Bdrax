import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

interface MessageStats {
  total: number;
  delivered: number;
  responses: number;
  responseRate: number;
  byStatus: {
    interested: number;
    notInterested: number;
    dnc: number;
  };
  activity: {
    date: string;
    sent: number;
    responses: number;
  }[];
}

export function useMessageStats(days = 30) {
  return useQuery({
    queryKey: ['message-stats', days],
    queryFn: async (): Promise<MessageStats> => {
      const today = new Date();
      const dateRange = Array.from({ length: days }, (_, i) => 
        format(subDays(today, i), 'yyyy-MM-dd')
      ).reverse();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user's workspace
      const { data: workspaceData } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!workspaceData?.workspace_id) {
        return {
          total: 0,
          delivered: 0,
          responses: 0,
          responseRate: 0,
          byStatus: {
            interested: 0,
            notInterested: 0,
            dnc: 0
          },
          activity: dateRange.map(date => ({
            date,
            sent: 0,
            responses: 0
          }))
        };
      }

      const { data: stats } = await supabase
        .from('message_analytics')
        .select('*')
        .eq('workspace_id', workspaceData.workspace_id)
        .in('date', dateRange);

      const activity = dateRange.map(date => {
        const dayStats = stats?.find(s => s.date === date) || {
          messages_sent: 0,
          responses_received: 0
        };
        return {
          date,
          sent: dayStats.messages_sent,
          responses: dayStats.responses_received
        };
      });

      const totals = stats?.reduce(
        (acc, curr) => ({
          total: acc.total + curr.messages_sent,
          delivered: acc.delivered + curr.messages_delivered,
          responses: acc.responses + curr.responses_received,
          interested: acc.interested + curr.interested_count,
          notInterested: acc.notInterested + curr.not_interested_count,
          dnc: acc.dnc + curr.dnc_count
        }),
        { total: 0, delivered: 0, responses: 0, interested: 0, notInterested: 0, dnc: 0 }
      ) || { total: 0, delivered: 0, responses: 0, interested: 0, notInterested: 0, dnc: 0 };

      return {
        total: totals.total,
        delivered: totals.delivered,
        responses: totals.responses,
        responseRate: totals.total > 0 
          ? Number((totals.responses / totals.total * 100).toFixed(1))
          : 0,
        byStatus: {
          interested: totals.interested,
          notInterested: totals.notInterested,
          dnc: totals.dnc
        },
        activity
      };
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}