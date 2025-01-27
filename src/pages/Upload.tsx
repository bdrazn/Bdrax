import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Upload as UploadIcon, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface CSVRow {
  ID: string;
  tags: string;
  msg: string;
  'First Name': string;
  'Last Name': string;
  'Property Address': string;
  'Property City': string;
  'Property State': string;
  'Property Zip': string;
  'Business Name': string;
  'Mailing Address'?: string;
  [key: string]: string; // For phone numbers (Phone 1, Phone 2, etc.)
}

interface UploadStats {
  properties: { new: number; updated: number };
  contacts: { new: number; updated: number };
  relationships: number;
  errors: number;
}

export default function Upload() {
  const { session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    properties: { new: 0, updated: 0 },
    contacts: { new: 0, updated: 0 },
    relationships: 0,
    errors: 0
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as CSVRow[]);
      }
    });
  };

  const findExistingContact = async (
    firstName: string,
    lastName: string,
    phoneNumbers: string[],
    workspaceId: string
  ) => {
    // Try to find by name and phone number
    for (const phone of phoneNumbers) {
      if (!phone) continue;
      
      const { data: contacts } = await supabase
        .from('profiles')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .eq('phone_number_hash', phone);

      if (contacts?.[0]) {
        return contacts[0];
      }
    }
    return null;
  };

  const findExistingProperty = async (
    address: string,
    city: string,
    state: string,
    zip: string,
    workspaceId: string
  ) => {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('address', address)
      .eq('city', city)
      .eq('state', state)
      .eq('zip', zip);

    return properties?.[0] || null;
  };

  const processUpload = async () => {
    if (!file || !session) return;

    setUploading(true);
    const stats: UploadStats = {
      properties: { new: 0, updated: 0 },
      contacts: { new: 0, updated: 0 },
      relationships: 0,
      errors: 0
    };

    try {
      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspace_users')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single();

      if (!workspace) throw new Error('No workspace found');

      // Parse CSV
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const rows = results.data as CSVRow[];

          for (const row of rows) {
            try {
              // Skip if required fields are missing
              if (!row['Property Address'] || !row['First Name'] || !row['Last Name']) {
                console.warn('Skipping row due to missing required fields:', row);
                stats.errors++;
                continue;
              }

              // Get phone numbers from row
              const phoneNumbers = Object.entries(row)
                .filter(([key, value]) => key.startsWith('Phone') && value)
                .map(([_, value]) => value.trim());

              // Check for existing contact
              let contact = await findExistingContact(
                row['First Name'].trim(),
                row['Last Name'].trim(),
                phoneNumbers,
                workspace.workspace_id
              );

              // Create or update contact
              const contactData = {
                workspace_id: workspace.workspace_id,
                first_name: row['First Name'].trim(),
                last_name: row['Last Name'].trim(),
                business_name: row['Business Name']?.trim() || null,
                mailing_address: row['Mailing Address']?.trim() || null,
                email: `${row['First Name'].toLowerCase().trim()}.${row['Last Name'].toLowerCase().trim()}@example.com` // Temporary email
              };

              if (contact) {
                // Update existing contact
                const { error: contactError } = await supabase
                  .from('profiles')
                  .update(contactData)
                  .eq('id', contact.id);

                if (contactError) throw contactError;
                stats.contacts.updated++;
              } else {
                // Create new contact
                const { data: newContact, error: contactError } = await supabase
                  .from('profiles')
                  .insert(contactData)
                  .select()
                  .single();

                if (contactError) throw contactError;
                contact = newContact;
                stats.contacts.new++;
              }

              // Handle phone numbers
              if (contact) {
                // Delete existing phone numbers
                await supabase
                  .from('phone_numbers')
                  .delete()
                  .eq('owner_id', contact.id);

                // Add new phone numbers
                const phoneData = phoneNumbers
                  .map(number => ({
                    owner_id: contact.id,
                    workspace_id: workspace.workspace_id,
                    number: number.trim(),
                    type: 'mobile'
                  }))
                  .filter(phone => phone.number);

                if (phoneData.length > 0) {
                  const { error: phoneError } = await supabase
                    .from('phone_numbers')
                    .insert(phoneData);

                  if (phoneError) throw phoneError;
                }
              }

              // Check for existing property
              let property = await findExistingProperty(
                row['Property Address'].trim(),
                row['Property City']?.trim() || 'Unknown',
                row['Property State']?.trim() || 'Unknown',
                row['Property Zip']?.trim() || 'Unknown',
                workspace.workspace_id
              );

              // Create or update property
              const propertyData = {
                workspace_id: workspace.workspace_id,
                address: row['Property Address'].trim(),
                city: row['Property City']?.trim() || 'Unknown',
                state: row['Property State']?.trim() || 'Unknown',
                zip: row['Property Zip']?.trim() || 'Unknown',
                mailing_address: row['Mailing Address']?.trim() || null,
                tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : []
              };

              if (property) {
                // Update existing property
                const { error: propertyError } = await supabase
                  .from('properties')
                  .update(propertyData)
                  .eq('id', property.id);

                if (propertyError) throw propertyError;
                stats.properties.updated++;
              } else {
                // Create new property
                const { data: newProperty, error: propertyError } = await supabase
                  .from('properties')
                  .insert(propertyData)
                  .select()
                  .single();

                if (propertyError) throw propertyError;
                property = newProperty;
                stats.properties.new++;
              }

              // Create or update contact-property relationship
              if (contact && property) {
                const { error: relationError } = await supabase
                  .from('contact_properties')
                  .upsert({
                    contact_id: contact.id,
                    property_id: property.id,
                    relationship_type: 'owner',
                    workspace_id: workspace.workspace_id
                  });

                if (relationError) throw relationError;
                stats.relationships++;
              }
            } catch (error) {
              console.error('Error processing row:', error);
              stats.errors++;
            }
          }

          setUploadStats(stats);
          if (stats.errors === 0) {
            toast.success('Upload completed successfully');
          } else {
            toast.success(`Upload completed with ${stats.errors} errors`);
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast.error('Failed to parse CSV file');
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Upload Data</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700">
            Upload CSV File
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview[0]).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td
                          key={j}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(uploadStats.properties.new > 0 || uploadStats.properties.updated > 0) && (
          <div className="mt-6 bg-green-50 p-4 rounded-lg">
            <div className="flex">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Upload Complete
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Properties: {uploadStats.properties.new} new, {uploadStats.properties.updated} updated
                    </li>
                    <li>
                      Contacts: {uploadStats.contacts.new} new, {uploadStats.contacts.updated} updated
                    </li>
                    <li>{uploadStats.relationships} relationships established</li>
                    {uploadStats.errors > 0 && (
                      <li className="text-red-600">
                        {uploadStats.errors} errors encountered
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <Button
            onClick={processUpload}
            disabled={!file || uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}