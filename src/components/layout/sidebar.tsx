import { Link, useLocation } from 'react-router-dom';
import { navigation } from '@/lib/navigation';
import { motion } from 'framer-motion';
import { Logo } from './logo';

export function Sidebar() {
  const location = useLocation();

  return (
    <motion.div 
      className="group/sidebar fixed inset-y-0 left-0 pt-16 pb-4 z-50 flex flex-col w-[68px] hover:w-64 bg-white border-r transition-all duration-300"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="px-2 mb-8">
        <Logo collapsed />
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors overflow-hidden whitespace-nowrap
                ${isActive
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
              <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                {item.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 w-1 h-8 bg-brand-600 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
}