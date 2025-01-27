import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ThumbsUp, ThumbsDown, Ban } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'failed';
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  className?: string;
  onStatusChange?: (status: 'interested' | 'not_interested' | 'dnc') => void;
  currentStatus?: string | null;
}

export function MessageThread({ 
  messages, 
  currentUserId, 
  className,
  onStatusChange,
  currentStatus 
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {onStatusChange && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="text-sm text-gray-600">Lead Status:</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={currentStatus === 'interested' ? 'primary' : 'outline'}
              onClick={() => onStatusChange('interested')}
              className="flex items-center gap-2"
            >
              <ThumbsUp className="w-4 h-4" />
              Interested
            </Button>
            <Button
              size="sm"
              variant={currentStatus === 'not_interested' ? 'primary' : 'outline'}
              onClick={() => onStatusChange('not_interested')}
              className="flex items-center gap-2"
            >
              <ThumbsDown className="w-4 h-4" />
              Not Interested
            </Button>
            <Button
              size="sm"
              variant={currentStatus === 'dnc' ? 'destructive' : 'outline'}
              onClick={() => onStatusChange('dnc')}
              className="flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              DNC
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender_id === currentUserId;
          const showTimestamp = index === 0 || 
            new Date(message.created_at).getTime() - 
            new Date(messages[index - 1].created_at).getTime() > 300000; // 5 minutes

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[70%] space-y-1",
                isCurrentUser ? "items-end" : "items-start"
              )}>
                {showTimestamp && (
                  <div className="px-2 py-1">
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
                <div className={cn(
                  "rounded-lg px-4 py-2 text-sm",
                  isCurrentUser
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-900"
                )}>
                  {message.content}
                </div>
                {isCurrentUser && message.status && (
                  <div className="px-2">
                    <span className={cn(
                      "text-xs",
                      message.status === 'delivered' && "text-green-600",
                      message.status === 'sent' && "text-gray-500",
                      message.status === 'failed' && "text-red-600"
                    )}>
                      {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}