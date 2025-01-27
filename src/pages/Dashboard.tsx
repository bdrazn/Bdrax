import { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { PropertyDistribution } from '@/components/dashboard/property-distribution';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>
      
      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PropertyDistribution data={stats.properties.byType} />
        <ActivityChart data={stats.messages.activity} />
      </div>
    </div>
  );
}