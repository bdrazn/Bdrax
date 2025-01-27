import { useState, useEffect } from 'react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { Plus, Calendar, Users, MessageSquare, ChevronRight, Trash2, Play, Pause, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface List {
  id: string;
  name: string;
  property_count: number;
}

interface Template {
  id: string;
  name: string;
}

interface NewCampaign {
  name: string;
  template_id: string;
  scheduled_for: string;
  list_id: string;
}

export default function Campaigns() {
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [newCampaign, setNewCampaign] = useState<NewCampaign>({
    name: '',
    template_id: '',
    scheduled_for: '',
    list_id: ''
  });

  const ITEMS_PER_PAGE = 5;
  
  // Filter active and recent campaigns (not completed)
  const activeCampaigns = campaigns?.filter(c => c.status !== 'completed') || [];
  const totalActivePages = Math.ceil(activeCampaigns.length / ITEMS_PER_PAGE);
  const activeStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const activeEndIndex = activeStartIndex + ITEMS_PER_PAGE;
  const currentActiveCampaigns = activeCampaigns.slice(activeStartIndex, activeEndIndex);

  // Filter previous (completed) campaigns
  const previousCampaigns = campaigns?.filter(c => c.status === 'completed') || [];
  const totalPreviousPages = Math.ceil(previousCampaigns.length / ITEMS_PER_PAGE);
  const previousStartIndex = (previousPage - 1) * ITEMS_PER_PAGE;
  const previousEndIndex = previousStartIndex + ITEMS_PER_PAGE;
  const currentPreviousCampaigns = previousCampaigns.slice(previousStartIndex, previousEndIndex);

  // Load lists and templates when modal opens
  useEffect(() => {
    if (showNewCampaign) {
      loadListsAndTemplates();
    }
  }, [showNewCampaign]);

  const loadListsAndTemplates = async () => {
    setLoadingData(true);
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

      // Load templates
      const { data: templatesData } = await supabase
        .from('message_templates')
        .select('id, name')
        .eq('workspace_id', workspace.workspace_id);

      if (templatesData) {
        setTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error loading lists and templates:', error);
      toast.error('Failed to load lists and templates');
    } finally {
      setLoadingData(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateCampaign.mutateAsync({ id, status });
    } catch (error) {
      console.error('Failed to update campaign status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      if (!newCampaign.name || !newCampaign.list_id) {
        toast.error('Please enter a campaign name and select a list');
        return;
      }

      await createCampaign.mutateAsync({
        name: newCampaign.name,
        template_id: newCampaign.template_id,
        scheduled_for: newCampaign.scheduled_for || null,
        target_list: {
          list_id: newCampaign.list_id
        },
        status: 'draft'
      });

      setShowNewCampaign(false);
      setNewCampaign({
        name: '',
        template_id: '',
        scheduled_for: '',
        list_id: ''
      });
      toast.success('Campaign created successfully');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const renderCampaignList = (campaigns: any[], showControls = true) => (
    <div className="divide-y">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {campaign.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    campaign.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : campaign.status === 'scheduled'
                      ? 'bg-amber-100 text-amber-800'
                      : campaign.status === 'completed'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </span>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-6">
                <div className="flex items-center">
                  <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  {campaign.stats?.[0]?.total_messages.toLocaleString() || 0} recipients
                </div>
                <div className="flex items-center">
                  <MessageSquare className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  {campaign.stats?.[0]?.sent_count.toLocaleString() || 0} messages sent
                </div>
                {campaign.scheduled_for && (
                  <div className="flex items-center">
                    <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    Next run: {new Date(campaign.scheduled_for).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            {showControls && (
              <div className="flex items-center space-x-4">
                {campaign.status === 'running' ? (
                  <button
                    onClick={() => handleStatusChange(campaign.id, 'paused')}
                    className="p-2 text-gray-400 hover:text-amber-600"
                  >
                    <Pause className="h-5 w-5" />
                  </button>
                ) : campaign.status === 'paused' || campaign.status === 'scheduled' ? (
                  <button
                    onClick={() => handleStatusChange(campaign.id, 'running')}
                    className="p-2 text-gray-400 hover:text-green-600"
                  >
                    <Play className="h-5 w-5" />
                  </button>
                ) : null}
                <button
                  onClick={() => setShowDeleteConfirm(campaign.id)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>

          {showDeleteConfirm === campaign.id && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                Are you sure you want to delete this campaign? This action cannot be undone.
              </p>
              <div className="mt-3 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
        <Button onClick={() => setShowNewCampaign(true)}>
          <Plus className="w-5 h-5 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Active</h2>
            <span className="text-2xl font-semibold text-brand-600">
              {activeCampaigns.filter(c => c.status === 'running').length}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Currently running campaigns</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Scheduled</h2>
            <span className="text-2xl font-semibold text-amber-600">
              {activeCampaigns.filter(c => c.status === 'scheduled').length}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Upcoming campaigns</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Completed</h2>
            <span className="text-2xl font-semibold text-green-600">
              {previousCampaigns.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Past campaigns</p>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">Recent Campaigns</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          </div>
        ) : (
          <>
            {renderCampaignList(currentActiveCampaigns)}
            {totalActivePages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalActivePages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalActivePages, p + 1))}
                  disabled={currentPage === totalActivePages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Previous Campaigns */}
      {previousCampaigns.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium">Previous Campaigns</h2>
          </div>
          {renderCampaignList(currentPreviousCampaigns, false)}
          {totalPreviousPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPreviousPage(p => Math.max(1, p - 1))}
                disabled={previousPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {previousPage} of {totalPreviousPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPreviousPage(p => Math.min(totalPreviousPages, p + 1))}
                disabled={previousPage === totalPreviousPages}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* New Campaign Modal */}
      <Modal
        isOpen={showNewCampaign}
        onClose={() => {
          setShowNewCampaign(false);
          setNewCampaign({
            name: '',
            template_id: '',
            scheduled_for: '',
            list_id: ''
          });
        }}
        title="Create New Campaign"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Campaign Name
            </label>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              placeholder="Enter campaign name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Target List
            </label>
            <select
              value={newCampaign.list_id}
              onChange={(e) => setNewCampaign({ ...newCampaign, list_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              disabled={loadingData}
            >
              <option value="">Select a list...</option>
              {lists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.property_count} properties)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Message Template
            </label>
            <select
              value={newCampaign.template_id}
              onChange={(e) => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              disabled={loadingData}
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Schedule (Optional)
            </label>
            <input
              type="datetime-local"
              value={newCampaign.scheduled_for}
              onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_for: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCampaign(false);
                setNewCampaign({
                  name: '',
                  template_id: '',
                  scheduled_for: '',
                  list_id: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={!newCampaign.name || !newCampaign.list_id || loadingData}
              loading={loadingData}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}