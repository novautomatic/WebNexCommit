import { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import SEO from '../components/SEO';
import { FileText, Calculator, LogOut } from 'lucide-react';
import { BlogAdmin } from './blog/BlogAdmin';
import Cotizador from './Cotizador';

const TABS = [
  { id: 'blog', label: 'Blog', icon: FileText },
  { id: 'cotizador', label: 'Cotizador', icon: Calculator },
];

export default function Admin() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('blog');

  return (
    <>
      <SEO title="Panel — NexCommit" noIndex />
      <div className="min-h-screen bg-[#0a1628] flex flex-col">
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-[#0d1e30] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#248bde] to-[#67c8f3] flex items-center justify-center text-white font-bold text-sm">NC</div>
            <span className="text-white font-semibold text-lg">Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9aafc3] hidden sm:inline">{user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-56 shrink-0 bg-[#0c1a2c] border-r border-white/5 p-4 hidden md:flex flex-col gap-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-[#1a3050] text-white shadow-sm'
                      : 'text-[#9aafc3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#67c8f3]' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="md:hidden flex border-b border-white/10 bg-[#0c1a2c] shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-[#67c8f3] border-b-2 border-[#67c8f3]'
                      : 'text-[#9aafc3]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            {activeTab === 'blog' && <BlogAdmin />}
            {activeTab === 'cotizador' && <Cotizador />}
          </main>
        </div>
      </div>
    </>
  );
}
