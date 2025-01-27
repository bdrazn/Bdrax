import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookId = req.url.split('/').pop();
    if (!webhookId) {
      throw new Error('Missing webhook ID');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user settings for this webhook
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('user_id')
      .eq('smrtphone_webhook_url', `https://mfotghcalpfnjqouiswj.supabase.co/functions/v1/sms-webhook/${webhookId}`)
      .single();

    if (settingsError || !settings) {
      throw new Error('Invalid webhook');
    }

    // Parse the incoming SMS data
    const { messageId, from, to, content, status } = await req.json();

    // Store the incoming message
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        external_id: messageId,
        from_number: from,
        to_number: to,
        content,
        status,
        received_at: new Date().toISOString()
      });

    if (messageError) {
      throw messageError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});