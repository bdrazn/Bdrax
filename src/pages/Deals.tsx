import { useState } from 'react';
import { useDeals } from '@/hooks/use-deals';
import { DataTable } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import { Building2, Phone, Mail, Calendar, Tag } from 'lucide-react';

export default function Deals() {
  const { data: deals, isLoading } = useDeals();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDeals = deals?.filter(deal => 
    statusFilter === 'all' || deal.status === statusFilter
  );

  const columns = [
    {
      key: 'property',
      title: 'Property',
      sortable: true,
      render: (value: any, deal: any) => (
        <div>
          <div className="flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
            <span className="font-medium">{deal.property.address}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {deal.property.city}, {deal.property.state} {deal.property.zip}
          </div>
        </div>
      )
    },
    {
      key: 'owner',
      title: 'Contact',
      sortable: true,
      render: (value: any, deal: any) => (
        <div>
          <div className="font-medium">
            {deal.owner.first_name} {deal.owner.last_name}
          </div>
          <div className="text-sm text-gray-500 space-y-1 mt-1">
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-1" />
              {deal.owner.email}
            </div>
            {deal.owner.phone_numbers?.[0] && (
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                {deal.owner.phone_numbers[0].number}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'interested'
            ? 'bg-green-100 text-green-800'
            : value === 'not_interested'
            ? 'bg-gray-100 text-gray-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}
        </span>
      )
    },
    {
      key: 'estimated_value',
      title: 'Est. Value',
      sortable: true,
      render: (value: any, deal: any) => (
        <div className="font-medium">
          {formatCurrency(deal.property.estimated_value)}
        </div>
      )
    },
    {
      key: 'created_at',
      title: 'Date',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {new Date(value).toLocaleDateString()}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Deals</h1>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="interested">Interested</option>
            <option value="not_interested">Not Interested</option>
            <option value="dnc">DNC</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Interested</h2>
            <span className="text-2xl font-semibold text-green-600">
              {deals?.filter(d => d.status === 'interested').length || 0}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Potential deals to follow up</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Not Interested</h2>
            <span className="text-2xl font-semibold text-gray-600">
              {deals?.filter(d => d.status === 'not_interested').length || 0}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Declined opportunities</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">DNC</h2>
            <span className="text-2xl font-semibold text-red-600">
              {deals?.filter(d => d.status === 'dnc').length || 0}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Do not contact list</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Deal List</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredDeals || []}
          />
        )}
      </div>
    </div>
  );
}