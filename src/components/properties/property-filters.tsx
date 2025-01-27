import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface List {
  id: string;
  name: string;
  property_count: number;
}

interface PropertyFilters {
  propertyType: string;
  status: string;
  list: string;
  tag: string;
}

interface PropertyFiltersProps {
  filters: PropertyFilters;
  onFilterChange: (filters: PropertyFilters) => void;
  onAddToList: (listId: string) => void;
  onAddToTag: (tag: string) => void;
  selectedCount: number;
}

const PROPERTY_TYPES = [
  'Single Family',
  'Multi Family',
  'Condo',
  'Townhouse',
  'Land',
  'Commercial',
  'Other'
];

const PROPERTY_STATUS = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'dnc', label: 'DNC' }
];

export function PropertyFilters({ 
  filters, 
  onFilterChange,
  onAddToList,
  onAddToTag,
  selectedCount
}: PropertyFiltersProps) {
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [addType, setAddType] = useState<'list' | 'tag'>('list');
  const [lists, setLists] = useState<List[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    loadListsAndTags();
  }, []);

  const loadListsAndTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!workspace) return;

      // Load lists
      const { data: listsData } = await supabase
        .from('property_lists')
        .select(`
          id,
          name,
          properties:property_list_items(count)
        `)
        .eq('workspace_id', workspace.workspace_id);

      if (listsData) {
        setLists(listsData.map(list => ({
          id: list.id,
          name: list.name,
          property_count: list.properties?.[0]?.count || 0
        })));
      }

      // Load unique tags
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('tags')
        .eq('workspace_id', workspace.workspace_id);

      if (propertiesData) {
        const uniqueTags = new Set<string>();
        propertiesData.forEach(property => {
          if (property.tags) {
            property.tags.forEach((tag: string) => uniqueTags.add(tag));
          }
        });
        setTags(Array.from(uniqueTags).sort());
      }
    } catch (error) {
      console.error('Error loading lists and tags:', error);
    }
  };

  const handleAdd = () => {
    if (addType === 'list' && selectedList) {
      onAddToList(selectedList);
      setSelectedList('');
    } else if (addType === 'tag' && selectedTag) {
      onAddToTag(selectedTag);
      setSelectedTag('');
    }
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-sm p-4 space-y-6">
      <div className="flex items-center gap-2 text-gray-700">
        <Filter className="w-4 h-4" />
        <h3 className="font-medium text-sm">Filters</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property Type
        </label>
        <select
          value={filters.propertyType}
          onChange={(e) => onFilterChange({ ...filters, propertyType: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm"
        >
          <option value="">All Status</option>
          {PROPERTY_STATUS.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lists
        </label>
        <select
          value={filters.list}
          onChange={(e) => onFilterChange({ ...filters, list: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm h-32"
          size={5}
        >
          <option value="">All Lists</option>
          {lists.map(list => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.property_count})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <select
          value={filters.tag}
          onChange={(e) => onFilterChange({ ...filters, tag: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm h-32"
          size={5}
        >
          <option value="">All Tags</option>
          {tags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {selectedCount > 0 && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="list"
                checked={addType === 'list'}
                onChange={(e) => setAddType('list')}
                className="mr-2"
              />
              Add to List
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="tag"
                checked={addType === 'tag'}
                onChange={(e) => setAddType('tag')}
                className="mr-2"
              />
              Add Tag
            </label>
          </div>

          {addType === 'list' ? (
            <select
              value={selectedList}
              onChange={(e) => setSelectedList(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm h-32"
              size={5}
            >
              <option value="">Select a list...</option>
              {lists.map(list => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
          ) : (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm h-32"
              size={5}
            >
              <option value="">Select a tag...</option>
              {tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          <Button
            onClick={handleAdd}
            disabled={addType === 'list' ? !selectedList : !selectedTag}
            className="w-full"
          >
            Add {selectedCount} Properties to {addType === 'list' ? 'List' : 'Tag'}
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => onFilterChange({
          propertyType: '',
          status: '',
          list: '',
          tag: ''
        })}
      >
        Clear Filters
      </Button>
    </div>
  );
}