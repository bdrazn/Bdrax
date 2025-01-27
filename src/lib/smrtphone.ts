import { supabase } from './supabase';

interface SendSMSParams {
  to: string;
  message: string;
  sfRecordId?: string;
  sfUserId?: string;
  smrtPhoneGroupId?: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Get the next phone number to use based on selection mode
async function getNextPhoneNumber(userId: string): Promise<string | null> {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('phone_number_1, phone_number_2, phone_number_3, phone_number_4, phone_number_selection')
      .eq('user_id', userId)
      .single();

    if (!settings) return null;

    // Get all available phone numbers
    const phoneNumbers = [
      settings.phone_number_1,
      settings.phone_number_2,
      settings.phone_number_3,
      settings.phone_number_4
    ].filter(Boolean);

    if (phoneNumbers.length === 0) return null;

    if (settings.phone_number_selection === 'random') {
      // Random selection
      const randomIndex = Math.floor(Math.random() * phoneNumbers.length);
      return phoneNumbers[randomIndex];
    } else {
      // Sequential selection - get the last used number and use the next one
      const { data: lastMessage } = await supabase
        .from('sms_messages')
        .select('from_number')
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastMessage) {
        return phoneNumbers[0];
      }

      const lastIndex = phoneNumbers.indexOf(lastMessage.from_number);
      const nextIndex = (lastIndex + 1) % phoneNumbers.length;
      return phoneNumbers[nextIndex];
    }
  } catch (error) {
    console.error('Error getting next phone number:', error);
    return null;
  }
}

export async function sendSMS(params: SendSMSParams): Promise<SMSResponse> {
  try {
    // Get API key and next phone number from user settings
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('smrtphone_api_key')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings?.smrtphone_api_key) {
      throw new Error('SMS API key not configured');
    }

    // Get the next phone number to use
    const fromNumber = await getNextPhoneNumber(user.id);
    if (!fromNumber) {
      throw new Error('No phone numbers configured');
    }

    // For demo purposes, simulate a successful response
    const messageId = crypto.randomUUID();

    // Store the message in our database
    await supabase.from('sms_messages').insert({
      external_id: messageId,
      from_number: fromNumber,
      to_number: params.to,
      content: params.message,
      status: 'delivered',
      direction: 'outbound'
    });

    // Add a simulated response after 2 seconds
    setTimeout(async () => {
      await supabase.from('sms_messages').insert({
        external_id: crypto.randomUUID(),
        from_number: params.to,
        to_number: fromNumber,
        content: "Thanks for reaching out! I might be interested in discussing this further. What's your best offer?",
        status: 'received',
        direction: 'inbound'
      });
    }, 2000);

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function isWithinMessageWindow(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('message_window_start, message_window_end')
      .eq('user_id', user.id)
      .single();

    if (error || !settings) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHours, startMinutes] = settings.message_window_start.split(':').map(Number);
    const [endHours, endMinutes] = settings.message_window_end.split(':').map(Number);

    const windowStart = startHours * 60 + startMinutes;
    const windowEnd = endHours * 60 + endMinutes;

    return currentTime >= windowStart && currentTime <= windowEnd;
  } catch (error) {
    console.error('Error checking message window:', error);
    return false;
  }
}

export async function checkDailyLimit(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get user's daily limit setting
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('daily_message_limit')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return false;
    }

    // Get workspace ID for the user
    const { data: workspaceData } = await supabase
      .from('workspace_users')
      .select('workspace_id')
      .eq('user_id', userId)
      .single();

    if (!workspaceData?.workspace_id) {
      return false;
    }

    // Get today's message count
    const { data: analytics, error: analyticsError } = await supabase
      .from('message_analytics')
      .select('messages_sent')
      .eq('workspace_id', workspaceData.workspace_id)
      .eq('date', today)
      .maybeSingle();

    if (analyticsError) {
      return false;
    }

    const messagesSent = analytics?.messages_sent || 0;
    return messagesSent < settings.daily_message_limit;
  } catch (error) {
    console.error('Error checking daily limit:', error);
    return false;
  }
}

export async function updateMessageAnalytics(
  workspaceId: string,
  updates: Partial<{
    messages_sent: number;
    messages_delivered: number;
    responses_received: number;
    interested_count: number;
    not_interested_count: number;
    dnc_count: number;
  }>
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    await supabase.rpc('upsert_message_analytics', {
      p_workspace_id: workspaceId,
      p_date: today,
      p_updates: updates
    });
  } catch (error) {
    console.error('Error updating message analytics:', error);
    throw error;
  }
}