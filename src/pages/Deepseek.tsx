import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Search, MessageSquare, Building2, User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  ai_analysis: {
    status: 'interested' | 'not_interested' | 'dnc' | null;
    confidence: number;
    reasoning: string;
  } | null;
}

interface Thread {
  id: string;
  property: {
    id: string;
    address: string;
  };
  contact: {
    id: string;
    first_name: string;
    last_name: string;
  };
  campaign_id: string | null;
  status: string | null;
  last_message: string;
  last_message_at: string;
  messages: Message[];
}

export default function Deepseek() {
  const { session } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (session) {
      loadThreads();
    }
  }, [session]);

  const loadThreads = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) return;

      const { data: threadsData, error } = await supabase
        .from('message_threads')
        .select(`
          id,
          status,
          property:properties (
            id,
            address
          ),
          contact:profiles (
            id,
            first_name,
            last_name
          ),
          campaign_id,
          messages (
            id,
            content,
            sender_id,
            created_at,
            ai_analysis
          )
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedThreads = threadsData.map(thread => ({
        ...thread,
        last_message: thread.messages[0]?.content || '',
        last_message_at: thread.messages[0]?.created_at || thread.created_at,
        messages: thread.messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }));

      setThreads(formattedThreads);
    } catch (error) {
      console.error('Error loading threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredThreads = threads.filter(thread => {
    const searchString = searchTerm.toLowerCase();
    return (
      thread.property.address.toLowerCase().includes(searchString) ||
      `${thread.contact.first_name} ${thread.contact.last_name}`.toLowerCase().includes(searchString) ||
      thread.last_message.toLowerCase().includes(searchString)
    );
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] -mt-6 -mx-4">
      {/* Thread List */}
      <div className="w-96 border-r bg-white">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-full">
          {filteredThreads.map(thread => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread)}
              className={cn(
                "w-full p-4 text-left hover:bg-gray-50 border-b transition-colors",
                selectedThread?.id === thread.id && "bg-brand-50"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {thread.property.address}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <User className="h-4 w-4 mr-1" />
                    {thread.contact.first_name} {thread.contact.last_name}
                  </div>
                  {thread.status && (
                    <span className={cn(
                      "mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      thread.status === 'interested' && "bg-green-100 text-green-800",
                      thread.status === 'not_interested' && "bg-gray-100 text-gray-800",
                      thread.status === 'dnc' && "bg-red-100 text-red-800"
                    )}>
                      {thread.status.replace('_', ' ').charAt(0).toUpperCase() + 
                       thread.status.replace('_', ' ').slice(1)}
                    </span>
                  )}
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {thread.last_message}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread Details */}
      <div className="flex-1 bg-white overflow-y-auto">
        {selectedThread ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    {selectedThread.property.address}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedThread.contact.first_name} {selectedThread.contact.last_name}
                  </p>
                </div>
                {selectedThread.campaign_id && (
                  <span className="text-sm text-gray-500">
                    Campaign Message
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {selectedThread.messages.map((message, index) => (
                <div key={message.id} className="space-y-2">
                  <div className={cn(
                    "flex",
                    message.sender_id === session?.user.id ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2 text-sm",
                      message.sender_id === session?.user.id
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}>
                      {message.content}
                    </div>
                  </div>

                  {message.ai_analysis && (
                    <div className="ml-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          message.ai_analysis.status === 'interested' && "bg-green-100 text-green-800",
                          message.ai_analysis.status === 'not_interested' && "bg-gray-100 text-gray-800",
                          message.ai_analysis.status === 'dnc' && "bg-red-100 text-red-800"
                        )}>
                          {message.ai_analysis.status
                            ? message.ai_analysis.status.replace('_', ' ').charAt(0).toUpperCase() + 
                              message.ai_analysis.status.replace('_', ' ').slice(1)
                            : 'No Status'}
                        </span>
                        <span className="text-gray-500">
                          {(message.ai_analysis.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </div>
                      <p className="mt-2 text-gray-600">
                        {message.ai_analysis.reasoning}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 text-right">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a conversation to view details
          </div>
        )}
      </div>
    </div>
  );
}