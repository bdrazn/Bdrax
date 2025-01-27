import { Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  return (
    <motion.div 
      className="flex items-center gap-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Rocket className="h-8 w-8 text-brand-600" />
      <span className={`text-xl font-semibold bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent ${
        collapsed ? 'opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300' : ''
      }`}>
        Bdrax
      </span>
    </motion.div>
  );
}