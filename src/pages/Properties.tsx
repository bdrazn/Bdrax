import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter } from 'lucide-react';
import { PropertyFilters } from '@/components/properties/property-filters';
import { PropertyDetails } from '@/components/properties/property-details';
import { PropertyList } from '@/components/properties/property-list';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function Properties() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [viewingProperty, setViewingProperty] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    propertyType: '',
    status: '',
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    list: '',
    tag: ''
  });

  useEffect(() => {
    if (session) {
      loadProperties();
    }
  }, [session]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (id: string) => {
    setSelectedProperties(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const visibleProperties = filteredProperties.map(p => p.id);
      setSelectedProperties(new Set(visibleProperties));
    } else {
      setSelectedProperties(new Set());
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Property deleted successfully');
      loadProperties();
      setSelectedProperties(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      toast.error('Failed to delete property');
    }
  };

  const handleAddToList = async (listId: string) => {
    if (selectedProperties.size === 0 || !listId) return;

    try {
      const propertyItems = Array.from(selectedProperties).map(propertyId => ({
        list_id: listId,
        property_id: propertyId
      }));

      const { error } = await supabase
        .from('property_list_items')
        .upsert(propertyItems);

      if (error) throw error;

      toast.success(`${selectedProperties.size} properties added to list`);
      setSelectedProperties(new Set());
    } catch (error) {
      console.error('Error adding properties to list:', error);
      toast.error('Failed to add properties to list');
    }
  };

  const handleAddToTag = async (tag: string) => {
    if (selectedProperties.size === 0 || !tag) return;

    try {
      for (const propertyId of selectedProperties) {
        const { data: property } = await supabase
          .from('properties')
          .select('tags')
          .eq('id', propertyId)
          .single();

        if (property) {
          const currentTags = property.tags || [];
          if (!currentTags.includes(tag)) {
            const { error } = await supabase
              .from('properties')
              .update({ tags: [...currentTags, tag] })
              .eq('id', propertyId);

            if (error) throw error;
          }
        }
      }

      toast.success(`${selectedProperties.size} properties tagged with "${tag}"`);
      setSelectedProperties(new Set());
      loadProperties();
    } catch (error) {
      console.error('Error adding tag to properties:', error);
      toast.error('Failed to add tag to properties');
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.zip.includes(searchTerm);

    const matchesType = !filters.propertyType || property.property_type === filters.propertyType;
    const matchesStatus = !filters.status || property.status === filters.status;
    const matchesMinPrice = !filters.minPrice || (property.estimated_value || 0) >= parseInt(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || (property.estimated_value || 0) <= parseInt(filters.maxPrice);
    const matchesMinBeds = !filters.minBeds || (property.bedrooms || 0) >= parseInt(filters.minBeds);
    const matchesMinBaths = !filters.minBaths || (property.bathrooms || 0) >= parseInt(filters.minBaths);
    const matchesTag = !filters.tag || (property.tags || []).includes(filters.tag);

    return matchesSearch && matchesType && matchesStatus && 
           matchesMinPrice && matchesMaxPrice && 
           matchesMinBeds && matchesMinBaths &&
           matchesTag;
  });

  return (
    <div className="flex gap-6">
      <PropertyFilters
        filters={filters}
        onFilterChange={setFilters}
        onAddToList={handleAddToList}
        onAddToTag={handleAddToTag}
        selectedCount={selectedProperties.size}
      />

      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full h-9 rounded-lg border-gray-300 shadow-sm text-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Search properties..."
            />
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          )}
        </div>

        <PropertyList
          properties={filteredProperties}
          selectedProperties={selectedProperties}
          onPropertySelect={handlePropertySelect}
          onSelectAll={handleSelectAll}
          onViewDetails={(id) => setViewingProperty(id)}
          onEdit={(property) => {
            // Handle edit
          }}
          onDelete={handleDelete}
        />
      </div>

      {viewingProperty && (
        <PropertyDetails
          propertyId={viewingProperty}
          isOpen={true}
          onClose={() => setViewingProperty(null)}
        />
      )}
    </div>
  );
}