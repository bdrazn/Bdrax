import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  messages: { content: string }[];
  delivery_strategy: 'sequential' | 'random';
}

export default function Templates() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template>({
    id: '',
    name: '',
    messages: [{ content: '' }],
    delivery_strategy: 'sequential'
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [session]);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load templates');
      return;
    }

    setTemplates(data || []);
  };

  const handleAddMessage = () => {
    if (currentTemplate.messages.length >= 10) {
      toast.error('Maximum 10 messages per template');
      return;
    }

    setCurrentTemplate({
      ...currentTemplate,
      messages: [...currentTemplate.messages, { content: '' }]
    });
  };

  const handleRemoveMessage = (index: number) => {
    const newMessages = currentTemplate.messages.filter((_, i) => i !== index);
    setCurrentTemplate({
      ...currentTemplate,
      messages: newMessages
    });
  };

  const handleMessageChange = (index: number, content: string) => {
    const newMessages = [...currentTemplate.messages];
    newMessages[index] = { content };
    setCurrentTemplate({
      ...currentTemplate,
      messages: newMessages
    });
  };

  const handleSave = async () => {
    if (!currentTemplate.name || currentTemplate.messages.some(m => !m.content)) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_templates')
        .upsert({
          id: currentTemplate.id || undefined,
          name: currentTemplate.name,
          messages: currentTemplate.messages,
          delivery_strategy: currentTemplate.delivery_strategy,
          workspace_id: session?.user.id // You might want to get this from context
        });

      if (error) throw error;

      toast.success('Template saved successfully');
      loadTemplates();
      resetForm();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const resetForm = () => {
    setCurrentTemplate({
      id: '',
      name: '',
      messages: [{ content: '' }],
      delivery_strategy: 'sequential'
    });
    setIsEditing(false);
  };

  const handleEdit = (template: Template) => {
    setCurrentTemplate(template);
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Message Templates</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2 inline-block" />
            New Template
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Template Name</label>
              <input
                type="text"
                value={currentTemplate.name}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter template name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Strategy</label>
              <select
                value={currentTemplate.delivery_strategy}
                onChange={(e) => setCurrentTemplate({
                  ...currentTemplate,
                  delivery_strategy: e.target.value as 'sequential' | 'random'
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="sequential">Sequential</option>
                <option value="random">Random</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Messages</label>
                <button
                  onClick={handleAddMessage}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {currentTemplate.messages.map((message, index) => (
                <div key={index} className="flex gap-2">
                  <textarea
                    value={message.content}
                    onChange={(e) => handleMessageChange(index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    rows={3}
                    placeholder={`Message ${index + 1}`}
                  />
                  {currentTemplate.messages.length > 1 && (
                    <button
                      onClick={() => handleRemoveMessage(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                <Save className="w-5 h-5 mr-2 inline-block" />
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Saved Templates</h2>
        </div>
        <div className="divide-y">
          {templates.map(template => (
            <div
              key={template.id}
              className="px-6 py-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-500">
                    {template.messages.length} messages • {template.delivery_strategy} delivery
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(template)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}