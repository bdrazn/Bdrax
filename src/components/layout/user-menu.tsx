import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Menu } from '@headlessui/react';
import { User, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function UserMenu() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) return null;

  return (
    <Menu as="div" className="relative">
      <Menu.Button 
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center">
          <User className="h-4 w-4 text-brand-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {session.user.email?.split('@')[0]}
        </span>
      </Menu.Button>

      <AnimatePresence>
        {isOpen && (
          <Menu.Items
            as={motion.div}
            static
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <div className="p-1">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to="/settings"
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } flex items-center gap-2 px-4 py-2 text-sm text-gray-700 rounded-md`}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      active ? 'bg-gray-100' : ''
                    } flex items-center gap-2 px-4 py-2 text-sm text-gray-700 rounded-md w-full`}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        )}
      </AnimatePresence>
    </Menu>
  );
}