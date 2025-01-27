import { useState } from 'react';
import { Search, User, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  unread_count?: number;
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface ContactListProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
  className?: string;
}

export function ContactList({
  contacts,
  selectedId,
  onSelect,
  className
}: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase().trim();
    
    // If no search term, show all contacts
    if (!searchLower) return true;

    // Create searchable strings
    const firstName = (contact.first_name || '').toLowerCase();
    const lastName = (contact.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    const reverseName = `${lastName} ${firstName}`;
    const businessName = (contact.business_name || '').toLowerCase();

    // Search for exact matches first
    if (fullName === searchLower || reverseName === searchLower) {
      return true;
    }

    // Then check for partial matches
    return (
      fullName.includes(searchLower) ||
      reverseName.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      businessName.includes(searchLower)
    );
  });

  // Sort filtered contacts to prioritize exact matches
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    const searchLower = searchTerm.toLowerCase().trim();
    const aFullName = `${a.first_name} ${a.last_name}`.toLowerCase();
    const bFullName = `${b.first_name} ${b.last_name}`.toLowerCase();

    // Exact matches come first
    if (aFullName === searchLower && bFullName !== searchLower) return -1;
    if (bFullName === searchLower && aFullName !== searchLower) return 1;

    // Then sort alphabetically
    return aFullName.localeCompare(bFullName);
  });

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {sortedContacts.length > 0 ? (
            sortedContacts.map(contact => (
              <motion.button
                key={contact.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect(contact)}
                className={cn(
                  "w-full p-4 text-left hover:bg-gray-50 border-b transition-colors",
                  selectedId === contact.id && "bg-indigo-50"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.business_name && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <Building className="h-4 w-4 mr-1" />
                            {contact.business_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {contact.last_message && (
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {contact.last_message.content}
                      </p>
                    )}
                  </div>
                  {contact.unread_count ? (
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-600 text-xs font-medium text-white">
                      {contact.unread_count}
                    </span>
                  ) : null}
                </div>
              </motion.button>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 text-center text-gray-500"
            >
              No contacts found matching "{searchTerm}"
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}