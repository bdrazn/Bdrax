import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Plus, Tag, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface TagStats {
  tag: string;
  property_count: number;
}

export default function Tags() {
  const { session } = useAuth();
  const [tags, setTags] = useState<TagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (session) {
      loadTags();
    }
  }, [session]);

  const loadTags = async () => {
    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      const { data: properties } = await supabase
        .from('properties')
        .select('tags')
        .eq('workspace_id', workspace.workspace_id);

      if (!properties) return;

      // Count properties for each tag
      const tagCounts = new Map<string, number>();
      properties.forEach(property => {
        if (property.tags) {
          property.tags.forEach((tag: string) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        }
      });

      // Convert to array and sort by count
      const tagStats = Array.from(tagCounts.entries()).map(([tag, count]) => ({
        tag,
        property_count: count
      }));

      setTags(tagStats.sort((a, b) => b.property_count - a.property_count));
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      // Add tag to list and update state
      const tag = newTag.trim();
      setTags(prev => [...prev, { tag, property_count: 0 }].sort((a, b) => b.property_count - a.property_count));

      // Reset form
      setNewTag('');
      setIsAdding(false);
      toast.success('Tag created successfully');
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (!confirm('Are you sure you want to remove this tag from all properties?')) return;

    try {
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session!.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Get properties with this tag
      const { data: properties } = await supabase
        .from('properties')
        .select('id, tags')
        .eq('workspace_id', workspace.workspace_id)
        .contains('tags', [tag]);

      if (!properties) return;

      // Update each property to remove the tag
      for (const property of properties) {
        const newTags = property.tags.filter((t: string) => t !== tag);
        await supabase
          .from('properties')
          .update({ tags: newTags })
          .eq('id', property.id);
      }

      // Update local state
      setTags(prev => prev.filter(t => t.tag !== tag));
      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to remove tag');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Property Tags</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Create Tag
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Create New Tag</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tag Name
              </label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter tag name"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTag}>
                Create Tag
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">All Tags</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          </div>
        ) : tags.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No tags found
          </div>
        ) : (
          <div className="divide-y">
            {tags.map(({ tag, property_count }) => (
              <div key={tag} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Tag className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">{tag}</span>
                    <div className="ml-4 flex items-center text-sm text-gray-500">
                      <Building2 className="w-4 h-4 mr-1" />
                      {property_count} properties
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}