import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '../ui/modal';
import { PropertyDetails } from '../properties/property-details';
import { Building2, Phone, Mail, MapPin, Calendar, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

interface ContactDetailsProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Property {
  id: string;
  address: string;
  status: string;
  relationship_type: string;
}

interface ContactDetails {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  email: string;
  phone_numbers: { number: string; type: string }[];
  properties: Property[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function ContactDetails({ contactId, isOpen, onClose }: ContactDetailsProps) {
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && contactId) {
      loadContactDetails();
    }
  }, [contactId, isOpen]);

  const loadContactDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          phone_numbers (number, type),
          contact_properties (
            relationship_type,
            property:properties (
              id,
              address,
              status
            )
          )
        `)
        .eq('id', contactId)
        .single();

      if (error) throw error;

      // Transform the data
      setContact({
        ...data,
        properties: data.contact_properties?.map((cp: any) => ({
          id: cp.property.id,
          address: cp.property.address,
          status: cp.property.status,
          relationship_type: cp.relationship_type
        })) || []
      });
    } catch (error) {
      console.error('Error loading contact details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Contact Details"
        className="max-w-3xl"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-indigo-600">
                    {contact.first_name[0]}{contact.last_name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  {contact.business_name && (
                    <p className="text-gray-600">{contact.business_name}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="grid grid-cols-2 gap-6"
            >
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Details</h4>
                <div className="space-y-3">
                  <p className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {contact.email}
                  </p>
                  {contact.phone_numbers.map((phone, index) => (
                    <p key={index} className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {phone.number}
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {phone.type}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Account Info</h4>
                <div className="space-y-3">
                  <p className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Created {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                  </p>
                  <p className="flex items-center text-gray-600">
                    <Tag className="w-4 h-4 mr-2" />
                    {contact.properties.length} associated properties
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Properties with clickable rows */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h4 className="text-sm font-medium text-gray-500 mb-4">Associated Properties</h4>
              <div className="space-y-4">
                {contact.properties.map((property) => (
                  <div
                    key={property.id}
                    className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setSelectedProperty(property.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium">{property.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          property.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : property.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                          {property.relationship_type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Notes */}
            {contact.notes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
              </motion.div>
            )}
          </div>
        )}
      </Modal>

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyDetails
          propertyId={selectedProperty}
          isOpen={true}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </>
  );
}