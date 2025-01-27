import { Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

interface ContactFilters {
  minOwned: string;
  maxOwned: string;
}

interface ContactFiltersProps {
  filters: ContactFilters;
  onFilterChange: (filters: ContactFilters) => void;
}

export function ContactFilters({
  filters,
  onFilterChange
}: ContactFiltersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 bg-white rounded-lg shadow p-4 space-y-6"
    >
      <div className="flex items-center gap-2 text-gray-700">
        <Filter className="w-5 h-5" />
        <h3 className="font-medium">Filters</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Properties Owned
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minOwned || ''}
            onChange={(e) => onFilterChange({ ...filters, minOwned: e.target.value })}
            placeholder="Min"
            min="0"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="number"
            value={filters.maxOwned || ''}
            onChange={(e) => onFilterChange({ ...filters, maxOwned: e.target.value })}
            placeholder="Max"
            min="0"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onFilterChange({
          minOwned: '',
          maxOwned: ''
        })}
      >
        Clear Filters
      </Button>
    </motion.div>
  );
}