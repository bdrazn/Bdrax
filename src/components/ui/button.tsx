import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform-gpu';
  
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-glow hover:scale-105 active:scale-95 focus-visible:ring-brand-600',
    secondary: 'bg-brand-100 text-brand-900 hover:bg-brand-200 hover:shadow-soft hover:scale-105 active:scale-95 focus-visible:ring-brand-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 hover:shadow-soft hover:scale-105 active:scale-95',
    ghost: 'hover:bg-gray-100 hover:text-gray-900 hover:scale-105 active:scale-95',
    link: 'text-brand-600 underline-offset-4 hover:underline',
    destructive: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-glow hover:scale-105 active:scale-95 focus-visible:ring-red-600',
    success: 'bg-success-600 text-white hover:bg-success-700 hover:shadow-glow hover:scale-105 active:scale-95 focus-visible:ring-success-600',
  };

  const sizes = {
    xs: 'h-7 px-2 text-xs',
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-base',
    icon: 'h-9 w-9',
  };

  return (
    <motion.button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
});