import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Phone, Mail, MapPin, Building2, Tag, Edit, Trash2, User, Building } from 'lucide-react';
import { ContactFilters } from '@/components/contacts/contact-filters';
import { ContactDetails } from '@/components/contacts/contact-details';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string;
  email: string;
  phone_numbers: {
    number: string;
    type: string;
  }[];
  properties: {
    id: string;
    address: string;
  }[];
  notes: string;
  created_at: string;
}

export default function Contacts() {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    propertyCount: '',
    status: '',
    propertyId: ''
  });
  const [currentContact, setCurrentContact] = useState<Contact>({
    id: '',
    first_name: '',
    last_name: '',
    business_name: '',
    email: '',
    phone_numbers: [{ number: '', type: 'mobile' }],
    properties: [],
    notes: '',
    created_at: new Date().toISOString()
  });

  useEffect(() => {
    if (session) {
      loadContacts();
    }
  }, [session]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          phone_numbers (number, type),
          contact_properties (
            id,
            property:properties (
              id,
              address
            )
          )
        `);

      if (error) throw error;

      // Transform the data to match our Contact interface
      const transformedData = data?.map(contact => ({
        ...contact,
        properties: contact.contact_properties?.map((rel: any) => ({
          id: rel.property.id,
          address: rel.property.address
        })) || []
      }));

      setContacts(transformedData || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const searchString = searchTerm.toLowerCase().trim();
    
    if (!searchString) return true;

    // Create full name variations for searching
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const reverseName = `${contact.last_name} ${contact.first_name}`.toLowerCase();

    const searchFields = [
      fullName,
      reverseName,
      contact.first_name?.toLowerCase() || '',
      contact.last_name?.toLowerCase() || '',
      contact.business_name?.toLowerCase() || '',
      contact.email?.toLowerCase() || '',
      ...(contact.phone_numbers?.map(phone => phone.number) || []),
      ...(contact.properties?.map(prop => prop.address?.toLowerCase() || '') || [])
    ];

    // Split search terms and check if all parts match
    const searchParts = searchString.split(/\s+/);
    return searchParts.every(part => 
      searchFields.some(field => field.includes(part))
    );
  });

  const handleSave = async () => {
    if (!currentContact.first_name || !currentContact.last_name || !currentContact.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Save or update the contact profile
      const { data: savedContact, error: contactError } = await supabase
        .from('profiles')
        .upsert({
          id: currentContact.id || undefined,
          first_name: currentContact.first_name,
          last_name: currentContact.last_name,
          business_name: currentContact.business_name,
          email: currentContact.email,
          notes: currentContact.notes
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Handle phone numbers
      if (currentContact.id) {
        // Delete existing phone numbers
        await supabase
          .from('phone_numbers')
          .delete()
          .eq('owner_id', currentContact.id);
      }

      // Add new phone numbers
      if (currentContact.phone_numbers.length > 0) {
        const { error: phoneError } = await supabase
          .from('phone_numbers')
          .insert(
            currentContact.phone_numbers.map(phone => ({
              owner_id: savedContact.id,
              number: phone.number,
              type: phone.type
            }))
          );

        if (phoneError) throw phoneError;
      }

      toast.success('Contact saved successfully');
      loadContacts();
      resetForm();
    } catch (error: any) {
      console.error('Save error:', error);
      if (error.message.includes('duplicate')) {
        toast.error('A contact with this name and phone number already exists');
      } else {
        toast.error('Failed to save contact');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Contact deleted successfully');
      loadContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const resetForm = () => {
    setCurrentContact({
      id: '',
      first_name: '',
      last_name: '',
      business_name: '',
      email: '',
      phone_numbers: [{ number: '', type: 'mobile' }],
      properties: [],
      notes: '',
      created_at: new Date().toISOString()
    });
    setIsEditing(false);
  };

  return (
    <div className="flex gap-6">
      <ContactFilters
        filters={filters}
        onFilterChange={setFilters}
        properties={contacts.flatMap(c => c.properties)}
      />

      <div className="flex-1 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Search contacts..."
            />
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Add Contact
            </Button>
          )}
        </div>

        {/* Contact List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Contact List</h2>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No contacts found
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedContact(contact.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <h3 className="font-medium">{contact.first_name} {contact.last_name}</h3>
                      </div>

                      {contact.business_name && (
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Building className="w-4 h-4 mr-2" />
                          {contact.business_name}
                        </div>
                      )}

                      <div className="mt-2 space-y-2">
                        <p className="flex items-center text-sm text-gray-500">
                          <Mail className="w-4 h-4 mr-2" />
                          {contact.email}
                        </p>

                        {contact.phone_numbers.map((phone, index) => (
                          <p key={index} className="flex items-center text-sm text-gray-500">
                            <Phone className="w-4 h-4 mr-2" />
                            {phone.number}
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100">
                              {phone.type}
                            </span>
                          </p>
                        ))}
                      </div>

                      {contact.properties.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Associated Properties</h4>
                          <div className="space-y-2">
                            {contact.properties.map(property => (
                              <div key={property.id} className="flex items-center text-sm text-gray-500">
                                <Building2 className="w-4 h-4 mr-2" />
                                {property.address}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {contact.notes && (
                        <p className="mt-4 text-sm text-gray-600">
                          {contact.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentContact(contact);
                          setIsEditing(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(contact.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <Modal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title={currentContact.id ? 'Edit Contact' : 'Add Contact'}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={currentContact.first_name}
                  onChange={(e) => setCurrentContact({ ...currentContact, first_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={currentContact.last_name}
                  onChange={(e) => setCurrentContact({ ...currentContact, last_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input
                type="text"
                value={currentContact.business_name}
                onChange={(e) => setCurrentContact({ ...currentContact, business_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={currentContact.email}
                onChange={(e) => setCurrentContact({ ...currentContact, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Numbers</label>
              {currentContact.phone_numbers.map((phone, index) => (
                <div key={index} className="mt-2 flex gap-2">
                  <input
                    type="tel"
                    value={phone.number}
                    onChange={(e) => {
                      const newPhones = [...currentContact.phone_numbers];
                      newPhones[index].number = e.target.value;
                      setCurrentContact({ ...currentContact, phone_numbers: newPhones });
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Phone number"
                  />
                  <select
                    value={phone.type}
                    onChange={(e) => {
                      const newPhones = [...currentContact.phone_numbers];
                      newPhones[index].type = e.target.value;
                      setCurrentContact({ ...currentContact, phone_numbers: newPhones });
                    }}
                    className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={() => setCurrentContact({
                  ...currentContact,
                  phone_numbers: [...currentContact.phone_numbers, { number: '', type: 'mobile' }]
                })}
              >
                Add Phone Number
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={currentContact.notes}
                onChange={(e) => setCurrentContact({ ...currentContact, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {currentContact.id ? 'Update Contact' : 'Create Contact'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact Details Modal */}
      {selectedContact && (
        <ContactDetails
          contactId={selectedContact}
          isOpen={true}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}