import { supabase } from './supabase';

const DEEPSEEK_API_URL = 'YOUR_DEEPSEEK_API_ENDPOINT';
const DEEPSEEK_API_KEY = 'YOUR_DEEPSEEK_API_KEY';

interface MessageAnalysis {
  status: 'interested' | 'not_interested' | 'dnc' | null;
  confidence: number;
  reasoning: string;
}

export async function analyzeMessage(content: string, previousMessages: string[] = []): Promise<MessageAnalysis> {
  try {
    const messages = [
      {
        role: 'system',
        content: `Analyze the conversation between a property owner and a potential buyer to determine the owner's interest level. Consider the entire conversation context, not just the latest message. Look for:

        Interested indicators:
        - Asking about offer amounts
        - Requesting more information
        - Discussing property details
        - Expressing willingness to sell
        
        Not interested indicators:
        - Clear rejection
        - Stating they want to keep the property
        - Expressing no desire to sell
        
        DNC (Do Not Contact) indicators:
        - Explicit requests to stop contacting
        - Hostile or threatening language
        - Legal threats
        
        Provide a confidence score (0-1) and detailed reasoning for the classification.`
      },
      ...previousMessages.map(msg => ({
        role: 'user',
        content: msg
      })),
      {
        role: 'user',
        content
      }
    ];

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({ messages })
    });

    const analysis = await response.json();
    return {
      status: analysis.status,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    };
  } catch (error) {
    console.error('Error analyzing message:', error);
    return {
      status: null,
      confidence: 0,
      reasoning: 'Analysis failed'
    };
  }
}

export async function updatePropertyStatus(
  propertyId: string,
  status: 'interested' | 'not_interested' | 'dnc',
  userId: string,
  source: 'user' | 'ai' = 'user',
  confidence?: number,
  reasoning?: string
) {
  const { error } = await supabase.from('property_status_history').insert({
    property_id: propertyId,
    status,
    changed_by: userId,
    source,
    confidence,
    reasoning
  });

  if (error) {
    throw new Error(`Failed to update property status: ${error.message}`);
  }
}

export async function updateThreadStatus(
  threadId: string,
  status: 'interested' | 'not_interested' | 'dnc'
) {
  const { error } = await supabase
    .from('message_threads')
    .update({ status })
    .eq('id', threadId);

  if (error) {
    throw new Error(`Failed to update thread status: ${error.message}`);
  }
}