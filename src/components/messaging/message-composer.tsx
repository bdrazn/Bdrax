import { useState } from 'react';
import { Send, Paperclip, Clock, AlertCircle, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
}

interface MessageComposerProps {
  onSend: (message: string, propertyId?: string) => Promise<void>;
  properties?: Property[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showSchedule?: boolean;
  showWarning?: boolean;
  warningMessage?: string;
}

export function MessageComposer({
  onSend,
  properties = [],
  disabled = false,
  placeholder = 'Type your message...',
  className,
  showSchedule = false,
  showWarning = false,
  warningMessage,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || sending) return;

    try {
      setSending(true);
      setError(null);
      await onSend(message.trim(), selectedProperty);
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <AnimatePresence>
        {(showWarning && warningMessage || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "flex items-center gap-2 text-sm p-2 rounded-md",
              error ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"
            )}
          >
            <AlertCircle className="h-4 w-4" />
            {error || warningMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {properties.length > 0 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500 h-32"
            size={5}
          >
            <option value="">Select property to update status...</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.address}, {property.city}, {property.state}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
          <textarea
            rows={3}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="block w-full resize-none border-0 py-3 px-4 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500"
          />

          <div className="flex items-center justify-between bg-white py-2 px-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={disabled || sending}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              {showSchedule && (
                <button
                  type="button"
                  disabled={disabled || sending}
                  className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                >
                  <Clock className="h-5 w-5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={!message.trim() || disabled || sending}
              loading={sending}
              className="inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}