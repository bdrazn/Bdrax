import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Plus, Building2, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface List {
  id: string;
  name: string;
  description: string | null;
  property_count: number;
  created_at: string;
}

export default function Lists() {
  const { session } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentList, setCurrentList] = useState({
    id: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    if (session) {
      loadLists();
    }
  }, [session]);

  const loadLists = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { data, error } = await supabase
        .from('property_lists')
        .select(`
          *,
          properties:property_list_items(count)
        `)
        .eq('workspace_id', workspace.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLists(data.map(list => ({
        ...list,
        property_count: list.properties?.[0]?.count || 0
      })));
    } catch (error) {
      console.error('Error loading lists:', error);
      toast.error('Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentList.name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { error } = await supabase
        .from('property_lists')
        .upsert({
          id: currentList.id || undefined,
          workspace_id: workspace.workspace_id,
          name: currentList.name.trim(),
          description: currentList.description.trim() || null
        });

      if (error) throw error;

      toast.success(currentList.id ? 'List updated successfully' : 'List created successfully');
      loadLists();
      resetForm();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save list');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      const { error } = await supabase
        .from('property_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('List deleted successfully');
      loadLists();
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  const resetForm = () => {
    setCurrentList({
      id: '',
      name: '',
      description: ''
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Property Lists</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create List
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">
            {currentList.id ? 'Edit List' : 'Create New List'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                List Name
              </label>
              <input
                type="text"
                value={currentList.name}
                onChange={(e) => setCurrentList({ ...currentList, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter list name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={currentList.description}
                onChange={(e) => setCurrentList({ ...currentList, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {currentList.id ? 'Update List' : 'Create List'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">All Lists</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          </div>
        ) : lists.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No lists found
          </div>
        ) : (
          <div className="divide-y">
            {lists.map(list => (
              <div key={list.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{list.name}</h3>
                    {list.description && (
                      <p className="mt-1 text-sm text-gray-500">{list.description}</p>
                    )}
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Building2 className="w-4 h-4 mr-1" />
                      {list.property_count} properties
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentList({
                          id: list.id,
                          name: list.name,
                          description: list.description || ''
                        });
                        setIsEditing(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}