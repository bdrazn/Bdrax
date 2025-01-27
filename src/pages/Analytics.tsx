import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { Card } from '@/components/ui/card';
import { MessageSquare, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface MessageStats {
  total_sent: number;
  delivered: number;
  failed: number;
  spam: number;
  response_rate: number;
  avg_response_time: number;
  delivery_rate: number;
  activity: {
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    responses: number;
  }[];
}

interface PhoneStats {
  phone_number: string;
  messages_sent: number;
  delivery_rate: number;
  response_rate: number;
  spam_rate: number;
}

export default function Analytics() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [phoneStats, setPhoneStats] = useState<PhoneStats[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (session) {
      loadStats();
    }
  }, [session, dateRange]);

  const loadStats = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      // Get overall message stats
      const { data: messageStats, error: statsError } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('workspace_id', workspace.workspace_id)
        .gte('created_at', new Date(Date.now() - getDaysInMs(dateRange)).toISOString());

      if (statsError) throw statsError;

      // Calculate stats
      const totalSent = messageStats?.length || 0;
      const delivered = messageStats?.filter(m => m.status === 'delivered').length || 0;
      const failed = messageStats?.filter(m => m.status === 'failed').length || 0;
      const spam = messageStats?.filter(m => m.status === 'spam').length || 0;

      // Get phone number stats
      const { data: phones } = await supabase
        .from('user_settings')
        .select('phone_number_1, phone_number_2, phone_number_3, phone_number_4')
        .eq('user_id', session!.user.id)
        .single();

      const phoneNumbers = [
        phones?.phone_number_1,
        phones?.phone_number_2,
        phones?.phone_number_3,
        phones?.phone_number_4
      ].filter(Boolean);

      // Calculate stats per phone number
      const phoneStatsData = await Promise.all(
        phoneNumbers.map(async (phone) => {
          const { data: messages } = await supabase
            .from('sms_messages')
            .select('*')
            .eq('from_number', phone)
            .eq('workspace_id', workspace.workspace_id)
            .gte('created_at', new Date(Date.now() - getDaysInMs(dateRange)).toISOString());

          const total = messages?.length || 0;
          const delivered = messages?.filter(m => m.status === 'delivered').length || 0;
          const spam = messages?.filter(m => m.status === 'spam').length || 0;
          const responses = messages?.filter(m => m.direction === 'inbound').length || 0;

          return {
            phone_number: phone,
            messages_sent: total,
            delivery_rate: total > 0 ? (delivered / total) * 100 : 0,
            response_rate: total > 0 ? (responses / total) * 100 : 0,
            spam_rate: total > 0 ? (spam / total) * 100 : 0
          };
        })
      );

      // Calculate daily activity
      const activity = getDailyActivity(messageStats || [], dateRange);

      setStats({
        total_sent: totalSent,
        delivered,
        failed,
        spam,
        delivery_rate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        response_rate: delivered > 0 ? (messageStats?.filter(m => m.direction === 'inbound').length || 0) / delivered * 100 : 0,
        avg_response_time: calculateAvgResponseTime(messageStats || []),
        activity
      });

      setPhoneStats(phoneStatsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMs = (range: '7d' | '30d' | '90d') => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return days * 24 * 60 * 60 * 1000;
  };

  const getDailyActivity = (messages: any[], range: '7d' | '30d' | '90d') => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const activity = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMessages = messages.filter(m => 
        m.created_at.startsWith(dateStr)
      );

      activity.unshift({
        date: dateStr,
        sent: dayMessages.filter(m => m.direction === 'outbound').length,
        delivered: dayMessages.filter(m => m.status === 'delivered').length,
        failed: dayMessages.filter(m => m.status === 'failed').length,
        responses: dayMessages.filter(m => m.direction === 'inbound').length
      });
    }

    return activity;
  };

  const calculateAvgResponseTime = (messages: any[]) => {
    const responses = messages.filter(m => m.direction === 'inbound');
    if (responses.length === 0) return 0;

    const responseTimes = responses.map(response => {
      const lastOutbound = messages.find(m => 
        m.direction === 'outbound' && 
        new Date(m.created_at) < new Date(response.created_at)
      );
      if (!lastOutbound) return 0;
      return new Date(response.created_at).getTime() - new Date(lastOutbound.created_at).getTime();
    });

    return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responses.length / 1000 / 60); // in minutes
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Message Analytics</h1>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="rounded-lg border-gray-300 text-sm focus:border-brand-500 focus:ring-brand-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-semibold mt-1">{formatNumber(stats?.total_sent || 0)}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-brand-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delivery Rate</p>
              <p className="text-2xl font-semibold mt-1">{(stats?.delivery_rate || 0).toFixed(1)}%</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-semibold mt-1">{(stats?.response_rate || 0).toFixed(1)}%</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-semibold mt-1">{stats?.avg_response_time || 0} min</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Message Activity</h2>
        <div className="h-[300px]">
          <ActivityChart data={stats?.activity || []} />
        </div>
      </Card>

      {/* Phone Number Stats */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Phone Number Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spam Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {phoneStats.map((phone) => (
                <tr key={phone.phone_number}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {phone.phone_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatNumber(phone.messages_sent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {phone.delivery_rate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {phone.response_rate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {phone.spam_rate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}