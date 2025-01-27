export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  email_signature: string;
  default_message_template: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_by: string;
  members: string[];
}

export interface App {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  icon: string;
  fields: AppField[];
}

export interface AppField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'user' | 'money' | 'location' | 'file';
  required: boolean;
  options?: string[]; // For select fields
}

export interface Item {
  id: string;
  app_id: string;
  created_by: string;
  values: Record<string, any>;
  created_at: string;
  updated_at: string;
}