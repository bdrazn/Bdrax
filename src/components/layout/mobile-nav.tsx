import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from '@headlessui/react';
import { Menu as MenuIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './logo';
import { navigation } from '@/lib/navigation';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2">
        <Menu>
          {({ open }) => (
            <>
              <Menu.Button className="p-2 hover:bg-gray-100 rounded-lg">
                {open ? (
                  <X className="h-6 w-6 text-gray-600" />
                ) : (
                  <MenuIcon className="h-6 w-6 text-gray-600" />
                )}
              </Menu.Button>

              <AnimatePresence>
                {open && (
                  <Menu.Items
                    as={motion.div}
                    static
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute left-0 right-0 top-16 bg-white shadow-lg p-4 border-t"
                  >
                    <div className="space-y-1">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Menu.Item key={item.name}>
                            {({ active }) => (
                              <Link
                                to={item.href}
                                className={`
                                  flex items-center px-3 py-2 text-sm font-medium rounded-md
                                  ${location.pathname === item.href
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'text-gray-600 hover:bg-gray-50'}
                                `}
                              >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.name}
                              </Link>
                            )}
                          </Menu.Item>
                        );
                      })}
                    </div>
                  </Menu.Items>
                )}
              </AnimatePresence>
            </>
          )}
        </Menu>
        <Logo />
      </div>
    </div>
  );
}