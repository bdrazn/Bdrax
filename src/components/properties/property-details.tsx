import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Phone, Mail, Calendar, DollarSign, Tag } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Modal } from '../ui/modal';

interface PropertyDetailsProps {
  propertyId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PropertyOwner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  business_name?: string;
  phone_numbers: { number: string; type: string }[];
}

interface PropertyStatus {
  status: 'interested' | 'not_interested' | 'dnc';
  created_at: string;
  source: 'user' | 'ai';
  confidence?: number;
  reasoning?: string;
}

interface PropertyDetails {
  id: string;
  address: string;
  mailing_address?: string;
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
  owner?: PropertyOwner;
  status_history?: PropertyStatus[];
  created_at: string;
  updated_at: string;
}

export function PropertyDetails({ propertyId, isOpen, onClose }: PropertyDetailsProps) {
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && propertyId) {
      loadPropertyDetails();
    }
  }, [propertyId, isOpen]);

  const loadPropertyDetails = async () => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select(`
          *,
          contact_properties (
            contact:profiles (
              id,
              first_name,
              last_name,
              email,
              business_name,
              phone_numbers (
                number,
                type
              )
            )
          ),
          status_history:property_status_history (
            status,
            created_at,
            source,
            confidence,
            reasoning
          )
        `)
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Transform the data
      const owner = propertyData.contact_properties?.[0]?.contact;
      setProperty({
        ...propertyData,
        owner: owner ? {
          id: owner.id,
          first_name: owner.first_name,
          last_name: owner.last_name,
          email: owner.email,
          business_name: owner.business_name,
          phone_numbers: owner.phone_numbers || []
        } : undefined,
        status_history: propertyData.status_history?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      });
    } catch (error) {
      console.error('Error loading property details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!property) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Property Details"
      className="max-w-3xl"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Basic Property Information */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium">{property.address}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.city}, {property.state} {property.zip}
                </p>
                {property.mailing_address && (
                  <p className="text-sm text-gray-500 mt-1">
                    Mailing Address: {property.mailing_address}
                  </p>
                )}
                {property.property_type && (
                  <p className="text-sm text-gray-500 mt-1">
                    Type: {property.property_type}
                  </p>
                )}
              </div>
              <div>
                {property.estimated_value && (
                  <p className="text-sm text-gray-500 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Est. Value: {formatCurrency(property.estimated_value)}
                  </p>
                )}
                {property.last_sale_price && (
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <Tag className="h-4 w-4 mr-1" />
                    Last Sale: {formatCurrency(property.last_sale_price)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status History</h4>
            {property.status_history && property.status_history.length > 0 ? (
              <div className="space-y-3">
                {property.status_history.map((status, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status.status === 'interested'
                          ? 'bg-green-100 text-green-800'
                          : status.status === 'not_interested'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {status.status.replace('_', ' ').charAt(0).toUpperCase() + 
                         status.status.replace('_', ' ').slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(status.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        Source: {status.source === 'ai' ? 'AI Analysis' : 'Manual Update'}
                        {status.confidence && ` (${(status.confidence * 100).toFixed(1)}% confidence)`}
                      </p>
                      {status.reasoning && (
                        <p className="text-gray-500 mt-1">{status.reasoning}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No status recorded</p>
            )}
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-2 gap-6 border-t py-4">
            {property.bedrooms !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">Bedrooms</p>
                <p className="mt-1">{property.bedrooms}</p>
              </div>
            )}
            {property.bathrooms !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">Bathrooms</p>
                <p className="mt-1">{property.bathrooms}</p>
              </div>
            )}
            {property.square_feet !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">Square Feet</p>
                <p className="mt-1">{formatNumber(property.square_feet)}</p>
              </div>
            )}
            {property.lot_size !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">Lot Size</p>
                <p className="mt-1">{property.lot_size} acres</p>
              </div>
            )}
            {property.year_built !== null && (
              <div>
                <p className="text-sm font-medium text-gray-500">Year Built</p>
                <p className="mt-1">{property.year_built}</p>
              </div>
            )}
            {property.last_sale_date && (
              <div>
                <p className="text-sm font-medium text-gray-500">Last Sale Date</p>
                <p className="mt-1">{new Date(property.last_sale_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {property.tags && property.tags.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {property.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Owner Information */}
          {property.owner && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Owner Information</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  {property.owner.first_name} {property.owner.last_name}
                </p>
                {property.owner.business_name && (
                  <p className="text-sm text-gray-500">
                    {property.owner.business_name}
                  </p>
                )}
                <p className="text-sm flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  {property.owner.email}
                </p>
                {property.owner.phone_numbers.map((phone, index) => (
                  <p key={index} className="text-sm flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {phone.number}
                    <span className="ml-2 text-xs text-gray-500">({phone.type})</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Record Information */}
          <div className="border-t pt-4 text-sm text-gray-500">
            <p>Created: {new Date(property.created_at).toLocaleString()}</p>
            <p>Last Updated: {new Date(property.updated_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}