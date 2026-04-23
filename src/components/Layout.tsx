import React, { useState } from 'react';
import { 
  BarChart3, Clock, ListTodo, CalendarDays, 
  SearchCheck, Users, Menu, X, Database, Settings, Play,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { cn } from '../utils';
import { useAppContext } from '../context/AppContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser, logout, isAdmin } = useAppContext();

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500', seo: 'bg-blue-500', content: 'bg-orange-500', web: 'bg-emerald-500',
  };
  const roleBadge: Record<string, string> = {
    admin: 'bg-red-100 text-red-700', seo: 'bg-blue-100 text-blue-700',
    content: 'bg-orange-100 text-orange-700', web: 'bg-emerald-100 text-emerald-700',
  };

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'all', label: 'All Tasks', icon: ListTodo },
    { id: 'today', label: "Today's Tasks", icon: CalendarDays },
    { id: 'client', label: 'Client View', icon: Users },
    { id: 'task-entry', label: 'Task Entry', icon: Database },
    { id: 'action', label: 'Action Board', icon: Play },
    { id: 'keyword-reporting', label: 'Keywords', icon: BarChart3 },
    { id: 'timesheet', label: 'Timesheet', icon: Clock },
    { id: 'admin', label: 'Admin Panel', icon: Settings, adminOnly: true },
  ];
  const tabs = allTabs.filter(t => !(t as any).adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-zinc-900 text-zinc-300 transition-all duration-300 ease-in-out flex flex-col",
        "lg:translate-x-0 lg:static lg:flex",
        isMobileMenuOpen ? "translate-x-0 w-56" : "-translate-x-full w-56",
        isCollapsed ? "lg:w-14" : "lg:w-56"
      )}>
        <div className="h-14 flex items-center px-3 border-b border-zinc-800 shrink-0">
          {!isCollapsed && <h1 className="text-sm font-bold text-white tracking-tight flex-1 truncate">SEO PM Dashboard</h1>}
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-zinc-400 hover:text-white ml-auto"><X size={18} /></button>
          <button onClick={() => setIsCollapsed(c => !c)} title={isCollapsed ? "Expand" : "Collapse"}
            className={cn("hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0", !isCollapsed && "ml-auto")}>
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 px-1.5 overflow-y-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                title={isCollapsed ? tab.label : undefined}
                className={cn("w-full flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
                  isCollapsed ? "justify-center px-0 py-2" : "px-2.5 py-2",
                  isActive ? "bg-emerald-500/15 text-emerald-400" : "hover:bg-zinc-800 hover:text-white text-zinc-400")}>
                <Icon size={17} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User + logout at bottom */}
        {currentUser && (
          <div className={cn("border-t border-zinc-800 p-3 shrink-0", isCollapsed && "flex justify-center")}>
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0", roleColors[currentUser.role] || 'bg-zinc-600')}>
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 capitalize">{currentUser.role}</p>
                </div>
                <button onClick={logout} title="Logout" className="text-zinc-500 hover:text-red-400 transition-colors shrink-0 p-1">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button onClick={logout} title={`Logout ${currentUser?.name}`} className="text-zinc-500 hover:text-red-400 transition-colors">
                <LogOut size={17} />
              </button>
            )}
          </div>
        )}
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-zinc-500 hover:text-zinc-900" onClick={() => setIsMobileMenuOpen(true)}><Menu size={22} /></button>
            <h2 className="text-lg font-semibold text-zinc-800">{tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold", roleColors[currentUser.role] || 'bg-zinc-600')}>
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-zinc-700 hidden sm:block">{currentUser.name}</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded capitalize hidden sm:block", roleBadge[currentUser.role] || 'bg-zinc-100 text-zinc-600')}>
                {currentUser.role}
              </span>
              <button onClick={logout} title="Logout" className="ml-1 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="max-w-full mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
