import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MessageComposer } from '@/components/messaging/message-composer';
import { MessageThread } from '@/components/messaging/message-thread';
import { ContactList } from '@/components/messaging/contact-list';
import { useMessageStats } from '@/hooks/use-message-stats';
import { isWithinMessageWindow, checkDailyLimit, sendSMS } from '@/lib/smrtphone';
import { analyzeMessage, updatePropertyStatus, updateThreadStatus } from '@/lib/deepseek';
import { Building2, Phone, Mail, MapPin, Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  email: string;
  phone_numbers: { number: string; type: string }[];
  properties: { id: string; address: string; city: string; state: string }[];
  unread_count?: number;
  last_message?: {
    content: string;
    created_at: string;
  };
  status?: 'interested' | 'not_interested' | 'dnc' | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'failed';
}

export default function Messages() {
  const { session } = useAuth();
  const { data: messageStats } = useMessageStats();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (session) {
      loadContacts();
      checkMessageRestrictions();
    }
  }, [session]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = contacts.filter(contact => {
        const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return (
          fullName.includes(searchLower) ||
          contact.business_name?.toLowerCase().includes(searchLower) ||
          contact.properties.some(p => 
            p.address.toLowerCase().includes(searchLower) ||
            p.city.toLowerCase().includes(searchLower) ||
            p.state.toLowerCase().includes(searchLower)
          )
        );
      });
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, contacts]);

  const loadContacts = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Check if we have any contacts
      const { data: existingContacts } = await supabase
        .from('profiles')
        .select('id')
        .eq('workspace_id', workspace.workspace_id)
        .limit(1);

      // If no contacts exist, create a sample contact
      if (!existingContacts || existingContacts.length === 0) {
        // Create sample contact
        const { data: contact } = await supabase
          .from('profiles')
          .insert({
            workspace_id: workspace.workspace_id,
            first_name: 'Jimmy',
            last_name: 'Popoola',
            email: 'jimmy.popoola@example.com',
            business_name: 'Popoola Properties LLC'
          })
          .select()
          .single();

        if (contact) {
          // Add phone number
          await supabase
            .from('phone_numbers')
            .insert({
              workspace_id: workspace.workspace_id,
              owner_id: contact.id,
              number: '+1234567890',
              type: 'mobile'
            });

          // Add sample property
          const { data: property } = await supabase
            .from('properties')
            .insert({
              workspace_id: workspace.workspace_id,
              address: '123 Investment Ave',
              city: 'Austin',
              state: 'TX',
              zip: '78701',
              property_type: 'Single Family',
              bedrooms: 3,
              bathrooms: 2,
              square_feet: 2000,
              estimated_value: 450000
            })
            .select()
            .single();

          if (property) {
            // Create contact-property relationship
            await supabase
              .from('contact_properties')
              .insert({
                workspace_id: workspace.workspace_id,
                contact_id: contact.id,
                property_id: property.id,
                relationship_type: 'owner'
              });

            // Create message thread
            const { data: thread } = await supabase
              .from('message_threads')
              .insert({
                workspace_id: workspace.workspace_id,
                property_id: property.id,
                owner_id: contact.id
              })
              .select()
              .single();

            if (thread) {
              // Add sample messages
              await supabase
                .from('messages')
                .insert([
                  {
                    thread_id: thread.id,
                    sender_id: session.user.id,
                    content: "Hi Jimmy, I noticed you own the property at 123 Investment Ave. Would you be interested in discussing a potential offer?",
                    status: 'delivered'
                  },
                  {
                    thread_id: thread.id,
                    sender_id: contact.id,
                    content: "Thanks for reaching out! I might be interested in discussing this further. What's your best offer?",
                    status: 'delivered'
                  }
                ]);
            }
          }
        }
      }

      // Load all contacts with their data
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          business_name,
          email,
          phone_numbers (
            number,
            type
          ),
          contact_properties (
            property:properties (
              id,
              address,
              city,
              state
            )
          ),
          message_threads (
            status,
            messages (
              content,
              created_at
            )
          )
        `)
        .eq('workspace_id', workspace.workspace_id);

      if (error) throw error;

      const transformedContacts = data
        .filter(contact => contact.contact_properties?.length > 0)
        .map(contact => ({
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          business_name: contact.business_name,
          email: contact.email,
          phone_numbers: contact.phone_numbers || [],
          properties: contact.contact_properties.map((cp: any) => ({
            id: cp.property.id,
            address: cp.property.address,
            city: cp.property.city,
            state: cp.property.state
          })),
          status: contact.message_threads?.[0]?.status || null,
          last_message: contact.message_threads?.[0]?.messages?.[0] || null
        }));

      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', contactId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const checkMessageRestrictions = async () => {
    try {
      if (!session?.user?.id) {
        setCanSendMessages(false);
        setWarningMessage('Not authenticated');
        return;
      }

      const [withinWindow, underLimit] = await Promise.all([
        isWithinMessageWindow(),
        checkDailyLimit(session.user.id)
      ]);

      setCanSendMessages(withinWindow && underLimit);
      setWarningMessage(
        !withinWindow 
          ? "Outside of messaging hours (8 AM - 9 PM)" 
          : !underLimit 
            ? "Daily message limit reached" 
            : null
      );
    } catch (error) {
      console.error('Error checking message restrictions:', error);
      setCanSendMessages(false);
      setWarningMessage('Unable to verify messaging restrictions');
    }
  };

  const handleStatusChange = async (status: 'interested' | 'not_interested' | 'dnc') => {
    if (!selectedContact || !session?.user?.id) return;

    try {
      // Update property status
      await updatePropertyStatus(
        selectedContact.properties[0].id,
        status,
        session.user.id,
        'user'
      );

      // Update thread status
      await updateThreadStatus(selectedContact.id, status);

      // Update local state
      setSelectedContact(prev => prev ? {
        ...prev,
        status
      } : null);

      // Update contacts list
      setContacts(prev => 
        prev.map(contact => 
          contact.id === selectedContact.id
            ? { ...contact, status }
            : contact
        )
      );

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSendMessage = async (content: string, propertyId?: string) => {
    if (!session?.user?.id || !selectedContact || !canSendMessages) {
      throw new Error('Unable to send message at this time');
    }

    if (!selectedContact.phone_numbers?.[0]?.number) {
      throw new Error('No phone number available for this contact');
    }

    // Add optimistic message
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender_id: session.user.id,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      // Send the actual message
      const result = await sendSMS({
        to: selectedContact.phone_numbers[0].number,
        message: content
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      // Store the message in the database
      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          thread_id: selectedContact.id,
          sender_id: session.user.id,
          content,
          status: 'delivered'
        });

      if (dbError) throw dbError;

      // If a property was selected, analyze the message and update status
      if (propertyId) {
        const analysis = await analyzeMessage(content);
        if (analysis.status && analysis.confidence > 0.7) {
          await updatePropertyStatus(propertyId, analysis.status, session.user.id, 'ai', analysis.confidence, analysis.reasoning);
          await updateThreadStatus(selectedContact.id, analysis.status);
        }
      }

      // Update message status
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );

      // Check restrictions again after sending
      await checkMessageRestrictions();
    } catch (error) {
      // Revert optimistic update
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: 'failed' }
            : msg
        )
      );

      throw error;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4">
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-medium">Contacts</h2>
          <Button size="sm" onClick={() => setShowNewMessage(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
        <ContactList
          contacts={contacts}
          selectedId={selectedContact?.id}
          onSelect={setSelectedContact}
        />
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            <div className="border-b p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedContact.first_name} {selectedContact.last_name}
                  </h2>
                  {selectedContact.business_name && (
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Building2 className="h-4 w-4 mr-1" />
                      {selectedContact.business_name}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  {selectedContact.phone_numbers?.[0] && (
                    <p className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedContact.phone_numbers[0].number}
                    </p>
                  )}
                  <p className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {selectedContact.email}
                  </p>
                  {selectedContact.properties?.[0] && (
                    <p className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedContact.properties[0].address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <MessageThread
              messages={messages}
              currentUserId={session!.user.id}
              onStatusChange={handleStatusChange}
              currentStatus={selectedContact.status}
              className="flex-1"
            />

            <div className="border-t p-4">
              <MessageComposer
                onSend={handleSendMessage}
                disabled={!canSendMessages}
                properties={selectedContact.properties}
                showSchedule
                showWarning={!!warningMessage}
                warningMessage={warningMessage || undefined}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a contact to start messaging
          </div>
        )}
      </div>

      {/* New Message Modal */}
      <Modal
        isOpen={showNewMessage}
        onClose={() => {
          setShowNewMessage(false);
          setSearchTerm('');
          setSuggestions([]);
          setShowSuggestions(false);
        }}
        title="New Message"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50"
                >
                  {suggestions.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowNewMessage(false);
                        setSearchTerm('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.business_name && (
                            <p className="text-sm text-gray-500">{contact.business_name}</p>
                          )}
                          {contact.properties.map(property => (
                            <p key={property.id} className="text-sm text-gray-500 flex items-center mt-1">
                              <Building2 className="h-4 w-4 mr-1" />
                              {property.address}, {property.city}, {property.state}
                            </p>
                          ))}
                        </div>
                        {contact.phone_numbers?.[0] && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {contact.phone_numbers[0].number}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {suggestions.length === 0 && searchTerm && (
            <p className="text-sm text-gray-500 text-center py-4">
              No contacts found matching "{searchTerm}"
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}