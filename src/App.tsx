import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { AllTasks } from './views/AllTasks';
import { TodayTasks } from './views/TodayTasks';
import { ClientView } from './views/ClientView';
import { TaskEntry } from './views/TaskEntry';
import { AdminPanel } from './views/AdminPanel';
import { ActionView } from './views/ActionView';
import { KeywordReporting } from './views/KeywordReporting';
import { Timesheet } from './views/Timesheet';
import { BarChart3 } from 'lucide-react';

function AppContent() {
  const { tasks, currentUser, isAdmin, isLoading, apiError } = useAppContext();
  const [activeTab, setActiveTab] = useState('action');

  // ── Loading splash ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center animate-pulse">
          <BarChart3 size={24} className="text-white" />
        </div>
        <p className="text-zinc-500 text-sm">Connecting to database…</p>
      </div>
    );
  }

  // ── API error banner ────────────────────────────────────────
  if (apiError) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <BarChart3 size={24} className="text-red-500" />
        </div>
        <div className="max-w-md text-center">
          <h2 className="text-lg font-bold text-zinc-800 mb-2">Database Unavailable</h2>
          <p className="text-sm text-zinc-500">{apiError}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login />;

  // Filter tasks based on role — admin sees all
  const userTasks = isAdmin ? tasks : tasks.filter(t => {
    if (currentUser.role === 'seo') return t.seoOwner === currentUser.ownerName;
    if (currentUser.role === 'content') return t.contentOwner === currentUser.ownerName;
    if (currentUser.role === 'web') return t.webOwner === currentUser.ownerName;
    return true;
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard tasks={userTasks} />;
      case 'all': return <AllTasks tasks={userTasks} />;
      case 'today': return <TodayTasks tasks={userTasks} />;
      case 'client': return <ClientView tasks={userTasks} />;
      case 'task-entry': return <TaskEntry />;
      case 'action': return <ActionView />;
      case 'keyword-reporting': return <KeywordReporting />;
      case 'timesheet': return <Timesheet />;
      case 'admin': return isAdmin ? <AdminPanel /> : <div className="p-8 text-zinc-500">Access denied.</div>;
      default: return <ActionView />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
