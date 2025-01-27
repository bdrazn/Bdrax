import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  color?: 'blue' | 'purple' | 'green' | 'amber';
}

const colors = {
  blue: {
    gradient: 'from-blue-50 to-blue-100',
    icon: 'bg-blue-500',
    text: 'text-blue-600',
    value: 'text-blue-900',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100',
    icon: 'bg-purple-500',
    text: 'text-purple-600',
    value: 'text-purple-900',
  },
  green: {
    gradient: 'from-green-50 to-green-100',
    icon: 'bg-green-500',
    text: 'text-green-600',
    value: 'text-green-900',
  },
  amber: {
    gradient: 'from-amber-50 to-amber-100',
    icon: 'bg-amber-500',
    text: 'text-amber-600',
    value: 'text-amber-900',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  color = 'blue',
}: StatCardProps) {
  const colorStyles = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        `bg-gradient-to-br ${colorStyles.gradient} rounded-lg p-6 shadow-sm`,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-sm font-medium", colorStyles.text)}>{title}</p>
          <p className={cn("text-2xl font-semibold mt-1", colorStyles.value)}>{value}</p>
        </div>
        <div className={cn("rounded-full p-3", colorStyles.icon)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn(
            "flex items-center",
            trend.value > 0 ? "text-green-600" : "text-red-600"
          )}>
            {trend.value > 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-gray-600">{trend.label}</span>
        </div>
      )}
    </motion.div>
  );
}