import { Outlet } from 'react-router-dom';
import { Header } from './layout/header';
import { Sidebar } from './layout/sidebar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 p-4 lg:p-6 lg:ml-[68px] group-hover/sidebar:lg:ml-64 mt-16">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}