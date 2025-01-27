import { StatCard } from '../ui/stat-card';
import { Building2, Users, DollarSign, MessageSquare } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface StatsGridProps {
  stats: {
    properties: {
      total: number;
      active: number;
      pending: number;
      sold: number;
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
    };
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Properties"
        value={formatNumber(stats.properties.total)}
        icon={Building2}
        color="blue"
        trend={{
          value: 12,
          label: "vs last month"
        }}
      />
      <StatCard
        title="Contacts"
        value={formatNumber(stats.contacts.total)}
        icon={Users}
        color="purple"
        trend={{
          value: 8,
          label: "vs last month"
        }}
      />
      <StatCard
        title="Active Deals"
        value={formatCurrency(stats.deals.value)}
        icon={DollarSign}
        color="green"
        trend={{
          value: 24,
          label: "vs last month"
        }}
      />
      <StatCard
        title="Message Response Rate"
        value={`${stats.messages.responseRate}%`}
        icon={MessageSquare}
        color="amber"
        trend={{
          value: 5,
          label: "vs last month"
        }}
      />
    </div>
  );
}