import { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Calendar, DollarSign, Tag, Edit, Trash2, Home, Bed, Bath, Square } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Pagination } from '../ui/pagination';
import { Button } from '../ui/button';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  lot_size: number | null;
  year_built: number | null;
  last_sale_date: string | null;
  last_sale_price: number | null;
  estimated_value: number | null;
  status: string;
  tags: string[];
}

interface PropertyListProps {
  properties: Property[];
  selectedProperties: Set<string>;
  onPropertySelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onViewDetails: (id: string) => void;
  onEdit: (property: Property) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 15;

export function PropertyList({
  properties,
  selectedProperties,
  onPropertySelect,
  onSelectAll,
  onViewDetails,
  onEdit,
  onDelete
}: PropertyListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProperties = properties.slice(startIndex, endIndex);

  const allSelected = currentProperties.length > 0 && 
    currentProperties.every(p => selectedProperties.has(p.id));

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300"
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          <span className="ml-2 text-sm text-gray-700">Select All</span>
        </label>
        <span className="ml-4 text-sm text-gray-500">
          {selectedProperties.size} selected
        </span>
      </div>

      <div className="divide-y">
        {currentProperties.map(property => (
          <div
            key={property.id}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
              selectedProperties.has(property.id) ? 'bg-brand-50' : ''
            }`}
            onClick={() => onPropertySelect(property.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedProperties.has(property.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onPropertySelect(property.id);
                    }}
                    className="form-checkbox h-4 w-4 text-brand-600 rounded border-gray-300"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(property.id);
                    }}
                    className="font-medium text-brand-600 hover:text-brand-800"
                  >
                    {property.address}
                  </button>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    property.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : property.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mt-1">
                  {property.city}, {property.state} {property.zip}
                </p>

                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Building2 className="w-4 h-4 mr-1" />
                    {property.property_type || 'Unknown Type'}
                  </span>
                  {property.bedrooms !== null && (
                    <span className="flex items-center">
                      <Home className="w-4 h-4 mr-1" />
                      {property.bedrooms} beds
                    </span>
                  )}
                  {property.bathrooms !== null && (
                    <span className="flex items-center">
                      <Home className="w-4 h-4 mr-1" />
                      {property.bathrooms} baths
                    </span>
                  )}
                  {property.square_feet !== null && (
                    <span className="flex items-center">
                      <Square className="w-4 h-4 mr-1" />
                      {formatNumber(property.square_feet)} sqft
                    </span>
                  )}
                  {property.year_built !== null && (
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Built {property.year_built}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex gap-4">
                  {property.estimated_value !== null && (
                    <span className="flex items-center text-sm">
                      <DollarSign className="w-4 h-4 mr-1 text-brand-600" />
                      Est. Value: {formatCurrency(property.estimated_value)}
                    </span>
                  )}
                  {property.last_sale_price !== null && (
                    <span className="flex items-center text-sm">
                      <Tag className="w-4 h-4 mr-1 text-brand-600" />
                      Last Sale: {formatCurrency(property.last_sale_price)}
                    </span>
                  )}
                </div>

                {property.tags && property.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {property.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-brand-50 text-brand-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(property);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(property.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}