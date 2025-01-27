import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  properties: {
    total: number;
    active: number;
    pending: number;
    sold: number;
    byType: { type: string; count: number }[];
  };
  contacts: {
    total: number;
    newThisMonth: number;
    interested: number;
    notInterested: number;
  };
  deals: {
    active: number;
    value: number;
    closedThisMonth: number;
    pipeline: number;
  };
  messages: {
    sent: number;
    delivered: number;
    responses: number;
    responseRate: number;
    activity: {
      date: string;
      sent: number;
      responses: number;
    }[];
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const last30Days = Array.from({ length: 30 }, (_, i) => 
        format(subDays(today, i), 'yyyy-MM-dd')
      ).reverse();

      // Get property stats
      const { data: propertyData } = await supabase
        .from('properties')
        .select('status, property_type');

      const propertyStats = {
        total: propertyData?.length || 0,
        active: propertyData?.filter(p => p.status === 'active').length || 0,
        pending: propertyData?.filter(p => p.status === 'pending').length || 0,
        sold: propertyData?.filter(p => p.status === 'sold').length || 0,
        byType: Object.entries(
          propertyData?.reduce((acc: Record<string, number>, curr) => {
            acc[curr.property_type] = (acc[curr.property_type] || 0) + 1;
            return acc;
          }, {}) || {}
        ).map(([type, count]) => ({ type, count }))
      };

      // Get contact stats
      const { data: contactData } = await supabase
        .from('profiles')
        .select('created_at, id');

      const { data: contactStatusData } = await supabase
        .from('message_threads')
        .select('status');

      const contactStats = {
        total: contactData?.length || 0,
        newThisMonth: contactData?.filter(c => 
          new Date(c.created_at) >= firstDayOfMonth
        ).length || 0,
        interested: contactStatusData?.filter(c => c.status === 'interested').length || 0,
        notInterested: contactStatusData?.filter(c => c.status === 'not_interested').length || 0
      };

      // Get message stats
      const { data: messageStats } = await supabase
        .from('message_analytics')
        .select('*')
        .in('date', last30Days);

      const messageActivity = last30Days.map(date => {
        const dayStats = messageStats?.find(s => s.date === date) || {
          messages_sent: 0,
          responses_received: 0
        };
        return {
          date,
          sent: dayStats.messages_sent,
          responses: dayStats.responses_received
        };
      });

      const latestStats = messageStats?.[messageStats.length - 1] || {
        messages_sent: 0,
        messages_delivered: 0,
        responses_received: 0
      };

      return {
        properties: propertyStats,
        contacts: contactStats,
        deals: {
          active: 12, // TODO: Implement deals functionality
          value: 2500000,
          closedThisMonth: 3,
          pipeline: 8
        },
        messages: {
          sent: latestStats.messages_sent,
          delivered: latestStats.messages_delivered,
          responses: latestStats.responses_received,
          responseRate: latestStats.messages_sent > 0 
            ? Number((latestStats.responses_received / latestStats.messages_sent * 100).toFixed(1))
            : 0,
          activity: messageActivity
        }
      };
    },
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}