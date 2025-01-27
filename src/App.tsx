import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Messages from './pages/Messages';
import Deepseek from './pages/Deepseek';
import Analytics from './pages/Analytics';
import Campaigns from './pages/Campaigns';
import Lists from './pages/Lists';
import Tags from './pages/Tags';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="deals" element={<Deals />} />
        <Route path="messages" element={<Messages />} />
        <Route path="deepseek" element={<Deepseek />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="lists" element={<Lists />} />
        <Route path="tags" element={<Tags />} />
        <Route path="upload" element={<Upload />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}