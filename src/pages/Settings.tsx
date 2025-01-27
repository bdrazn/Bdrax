import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Save, Clock, Bell, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface UserSettings {
  smrtphone_api_key: string;
  smrtphone_webhook_url: string;
  daily_message_limit: number;
  message_window_start: string;
  message_window_end: string;
  phone_number_1: string;
  phone_number_2: string;
  phone_number_3: string;
  phone_number_4: string;
  phone_number_selection: 'random' | 'sequential';
}

export default function Settings() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    smrtphone_api_key: '',
    smrtphone_webhook_url: '',
    daily_message_limit: 100,
    message_window_start: '08:00',
    message_window_end: '21:00',
    phone_number_1: '',
    phone_number_2: '',
    phone_number_3: '',
    phone_number_4: '',
    phone_number_selection: 'sequential'
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, [session]);

  useEffect(() => {
    if (originalSettings) {
      const changed = Object.keys(settings).some(
        key => settings[key as keyof UserSettings] !== originalSettings[key as keyof UserSettings]
      );
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    if (!session?.user.id) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          smrtphone_api_key,
          smrtphone_webhook_url,
          daily_message_limit,
          message_window_start,
          message_window_end,
          phone_number_1,
          phone_number_2,
          phone_number_3,
          phone_number_4,
          phone_number_selection
        `)
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        const loadedSettings = {
          smrtphone_api_key: data.smrtphone_api_key || '',
          smrtphone_webhook_url: data.smrtphone_webhook_url || '',
          daily_message_limit: data.daily_message_limit || 100,
          message_window_start: data.message_window_start?.slice(0, 5) || '08:00',
          message_window_end: data.message_window_end?.slice(0, 5) || '21:00',
          phone_number_1: data.phone_number_1 || '',
          phone_number_2: data.phone_number_2 || '',
          phone_number_3: data.phone_number_3 || '',
          phone_number_4: data.phone_number_4 || '',
          phone_number_selection: data.phone_number_selection || 'sequential'
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!session?.user.id || !hasChanges) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          smrtphone_api_key: settings.smrtphone_api_key || null,
          smrtphone_webhook_url: settings.smrtphone_webhook_url || null,
          daily_message_limit: settings.daily_message_limit,
          message_window_start: settings.message_window_start,
          message_window_end: settings.message_window_end,
          phone_number_1: settings.phone_number_1 || null,
          phone_number_2: settings.phone_number_2 || null,
          phone_number_3: settings.phone_number_3 || null,
          phone_number_4: settings.phone_number_4 || null,
          phone_number_selection: settings.phone_number_selection
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      
      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center sticky top-0 bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b z-10">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <Button 
          onClick={handleSave} 
          disabled={loading || !hasChanges}
          loading={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          {hasChanges ? 'Save Changes' : 'Saved'}
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-6">Messaging Configuration</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Smrtphone.io API Key
            </label>
            <input
              type="password"
              value={settings.smrtphone_api_key}
              onChange={(e) => handleChange('smrtphone_api_key', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Enter your API key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Incoming Message Webhook URL
            </label>
            <input
              type="text"
              value={settings.smrtphone_webhook_url}
              onChange={(e) => handleChange('smrtphone_webhook_url', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="https://your-webhook-url.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              Configure this URL in your Smrtphone.io dashboard to receive incoming messages
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Sender Phone Numbers
            </h3>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num}>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number {num}
                  </label>
                  <input
                    type="tel"
                    value={settings[`phone_number_${num}` as keyof UserSettings]}
                    onChange={(e) => handleChange(`phone_number_${num}`, e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                    placeholder="+1234567890"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number Selection Mode
              </label>
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="sequential"
                    checked={settings.phone_number_selection === 'sequential'}
                    onChange={(e) => handleChange('phone_number_selection', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Sequential</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="random"
                    checked={settings.phone_number_selection === 'random'}
                    onChange={(e) => handleChange('phone_number_selection', e.target.value)}
                    className="form-radio text-brand-600"
                  />
                  <span className="ml-2">Random</span>
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Sequential mode will use phone numbers in order, while random mode will select them randomly
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Daily Message Limit
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={settings.daily_message_limit}
              onChange={(e) => handleChange('daily_message_limit', parseInt(e.target.value) || 100)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum number of messages that can be sent per day
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 inline-block mr-1" />
                Message Window Start Time
              </label>
              <input
                type="time"
                value={settings.message_window_start}
                onChange={(e) => handleChange('message_window_start', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Messages will start sending at this time
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <Bell className="w-4 h-4 inline-block mr-1" />
                Message Window End Time
              </label>
              <input
                type="time"
                value={settings.message_window_end}
                onChange={(e) => handleChange('message_window_end', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Messages will stop sending at this time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}