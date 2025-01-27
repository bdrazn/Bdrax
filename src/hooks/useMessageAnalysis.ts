import { useState } from 'react';
import { analyzeMessage, updatePropertyStatus, updateOwnerPropertyStatus } from '../lib/deepseek';
import { supabase } from '../lib/supabase';

export function useMessageAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);

  const processNewMessage = async (
    threadId: string,
    content: string,
    propertyId: string,
    ownerId: string,
    userId: string
  ) => {
    setAnalyzing(true);
    try {
      // Store the message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender_id: ownerId,
          content
        });

      if (messageError) throw messageError;

      // Analyze the message
      const analysis = await analyzeMessage(content);

      // Update the message with analysis
      const { error: updateError } = await supabase
        .from('messages')
        .update({ ai_analysis: analysis })
        .eq('thread_id', threadId)
        .eq('content', content);

      if (updateError) throw updateError;

      // If we have a clear status, update the property
      if (analysis.status && analysis.confidence > 0.7) {
        await updatePropertyStatus(propertyId, analysis.status, userId);
        
        // Update thread status
        await supabase
          .from('message_threads')
          .update({ status: analysis.status })
          .eq('id', threadId);
      }

      return analysis;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    } finally {
      setAnalyzing(false);
    }
  };

  return {
    processNewMessage,
    analyzing
  };
}