import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Edit2, 
  Save, 
  X,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export function KeywordReporting() {
  const { tasks, setTasks, adminOptions } = useAppContext();
  
  // Filters
  const [clientFilter, setClientFilter] = useState('All');
  const [seoOwnerFilter, setSeoOwnerFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [rankingFilter, setRankingFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, seoOwnerFilter, dateRange, rankingFilter, searchQuery]);

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  // New Keyword Entry State
  const [isNewKeywordModalOpen, setIsNewKeywordModalOpen] = useState(false);
  const [newKeywordForm, setNewKeywordForm] = useState({
    client: adminOptions.clients[0] || '',
    title: '',
    focusedKw: '',
    targetUrl: '',
    volume: '',
    marRank: '',
    currentRank: '',
    remarks: ''
  });

  // Filter tasks based on criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Only include tasks that have keyword data
      if (!task.focusedKw) return false;

      // Client filter
      if (clientFilter !== 'All' && task.client !== clientFilter) return false;
      
      // Owner filters
      if (seoOwnerFilter !== 'All' && task.seoOwner !== seoOwnerFilter) return false;
      
      // Search query
      if (searchQuery && !task.focusedKw.toLowerCase().includes(searchQuery.toLowerCase()) && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date range filter (using intakeDate for simplicity, could be modified to use a specific reporting date if added to Task type)
      if (dateRange.start && task.intakeDate < dateRange.start) return false;
      if (dateRange.end && task.intakeDate > dateRange.end) return false;

      // Ranking filter logic
      const current = task.currentRank || 0;
      const previous = task.marRank || 0; // Assuming marRank is the previous/baseline rank
      
      if (rankingFilter !== 'All') {
        if (rankingFilter === 'Top 10' && (current <= 0 || current > 10)) return false;
        if (rankingFilter === 'Top 20' && (current <= 0 || current > 20)) return false;
        if (rankingFilter === 'Drop' && (current > previous || current === 0)) return false; // Higher number means worse rank
        if (rankingFilter === 'Improved outside Top 20' && (current >= previous || current <= 20 || current === 0)) return false;
        if (rankingFilter === 'Improved outside Top 50' && (current >= previous || current <= 50 || current === 0)) return false;
      }

      return true;
    });
  }, [tasks, clientFilter, seoOwnerFilter, dateRange, rankingFilter, searchQuery]);

  const handleEditClick = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      focusedKw: task.focusedKw,
      volume: task.volume,
      currentRank: task.currentRank,
      marRank: task.marRank,
      targetUrl: task.targetUrl,
      remarks: task.remarks
    });
  };

  const handleSaveEdit = () => {
    if (!editingTaskId) return;
    
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === editingTaskId 
        ? { ...task, ...editForm } 
        : task
    ));
    
    setEditingTaskId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({});
  };

  const getRankingStatus = (current?: number, previous?: number) => {
    if (!current) return { label: 'No Data', icon: Minus, color: 'text-zinc-500', bg: 'bg-zinc-100' };
    
    // In top 10
    if (current <= 10) {
      if (previous && current < previous) {
        return { label: 'Top 10 with Improvement', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-300' };
      }
      return { label: 'Top 10', icon: Minus, color: 'text-emerald-700', bg: 'bg-emerald-300' };
    }
    
    // In top 20
    if (current <= 20) {
      if (previous && current < previous) {
        return { label: 'Top 20 with Improvement', icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-300' };
      }
      return { label: 'Top 20', icon: Minus, color: 'text-blue-700', bg: 'bg-blue-300' };
    }
    
    // Drop
    if (previous && current > previous) {
      return { label: 'Drop', icon: TrendingDown, color: 'text-white', bg: 'bg-rose-500' };
    }
    
    // Improved but outside top 20
    if (previous && current < previous && current > 20 && current <= 50) {
      return { label: 'Improved outside Top 20', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    }
    
    // Improved but outside top 50
    if (previous && current < previous && current > 50) {
      return { label: 'Improved outside Top 50', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    }

    return { label: 'No change', icon: Minus, color: 'text-rose-600', bg: 'bg-white' };
  };

  const getPercentageChange = (current?: number, previous?: number) => {
    if (!current || !previous) return null;
    const diff = previous - current; // Positive means rank improved (number went down)
    const percent = (diff / previous) * 100;
    return percent;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'SEO Owner', 'Client', 'Task', 'Target URL', 'Focused KW', 'Volume', 'Monthly Ranking', 'Current Ranking', '% Change', 'Keyword Status', 'Remarks'];
    const csvData = filteredTasks.map(t => {
      const status = getRankingStatus(t.currentRank, t.marRank).label;
      const percentChange = getPercentageChange(t.currentRank, t.marRank);
      const percentStr = percentChange !== null ? (percentChange === 0 ? 'No Change' : `${percentChange.toFixed(2)}%`) : '';
      return [
        t.intakeDate,
        t.seoOwner || '',
        t.client,
        t.title,
        t.targetUrl || '',
        t.focusedKw || '',
        t.volume || '',
        t.marRank || '',
        t.currentRank || '',
        percentStr,
        status,
        t.remarks || ''
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'keyword_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateKeywordEntry = () => {
    if (!newKeywordForm.title || !newKeywordForm.focusedKw) {
      alert('Please fill in at least the Task Title and Focused Keyword.');
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const newTask: Task = {
      id: `T-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      title: newKeywordForm.title,
      client: newKeywordForm.client,
      seoOwner: adminOptions.seoOwners[0] || 'Unassigned',
      seoStage: adminOptions.seoStages[0] || 'Pending',
      currentOwner: 'SEO',
      isCompleted: false,
      seoQcStatus: 'Pending',
      contentStatus: '',
      webStatus: '',
      intakeDate: todayStr,
      contentAssignedDate: '',
      webAssignedDate: '',
      daysInStage: 0,
      estHours: 0,
      estHoursSEO: 0,
      estHoursContent: 0,
      estHoursWeb: 0,
      actualHours: 0,
      executionState: 'Not Started',
      timeEvents: [],
      focusedKw: newKeywordForm.focusedKw,
      targetUrl: newKeywordForm.targetUrl,
      volume: parseInt(newKeywordForm.volume) || undefined,
      marRank: parseInt(newKeywordForm.marRank) || undefined,
      currentRank: parseInt(newKeywordForm.currentRank) || undefined,
      remarks: newKeywordForm.remarks
    };

    setTasks(prev => [newTask, ...prev]);
    setIsNewKeywordModalOpen(false);
    setNewKeywordForm({
      client: adminOptions.clients[0] || '',
      title: '',
      focusedKw: '',
      targetUrl: '',
      volume: '',
      marRank: '',
      currentRank: '',
      remarks: ''
    });
  };

  // Chart Data calculations
  const POS_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#9ca3af'];

  const positionDistributionData = useMemo(() => {
    const counts = {
      'Pos 1-3': 0,
      'Pos 4-10': 0,
      'Pos 11-20': 0,
      'Pos 21-50': 0,
      'Pos 51+': 0,
      'Unranked': 0
    };

    filteredTasks.forEach(task => {
      const rank = task.currentRank;
      if (!rank || rank === 0) counts['Unranked']++;
      else if (rank <= 3) counts['Pos 1-3']++;
      else if (rank <= 10) counts['Pos 4-10']++;
      else if (rank <= 20) counts['Pos 11-20']++;
      else if (rank <= 50) counts['Pos 21-50']++;
      else counts['Pos 51+']++;
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [filteredTasks]);

  const momGrowthData = useMemo(() => {
    const monthlyCounts: Record<string, number> = {};
    
    filteredTasks.forEach(task => {
      if (task.intakeDate) {
        const month = task.intakeDate.substring(0, 7); // YYYY-MM
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
    });

    return Object.entries(monthlyCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => {
        const date = new Date(month + '-01');
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        return { month: monthName, Keywords: count };
      });
  }, [filteredTasks]);

  const clientPerformance = useMemo(() => {
    const clientData: Record<string, { totalCurrent: number; totalPrevious: number; count: number }> = {};
    
    filteredTasks.forEach(task => {
      if (task.currentRank && task.marRank) {
        if (!clientData[task.client]) {
          clientData[task.client] = { totalCurrent: 0, totalPrevious: 0, count: 0 };
        }
        clientData[task.client].totalCurrent += task.currentRank;
        clientData[task.client].totalPrevious += task.marRank;
        clientData[task.client].count++;
      }
    });

    return Object.entries(clientData).map(([client, data]) => ({
      client: client.length > 10 ? client.substring(0, 10) + '...' : client,
      'Avg Current Rank': Math.round(data.totalCurrent / data.count),
      'Avg Previous Rank': Math.round(data.totalPrevious / data.count),
    })).slice(0, 10); // Show top 10 clients
  }, [filteredTasks]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-800">Keyword Reporting</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNewKeywordModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus size={16} />
            Add Keyword Entry
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-md hover:bg-zinc-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Dashboard Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800 mb-4">Position Distribution</h3>
          {positionDistributionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={positionDistributionData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Bar dataKey="count" name="Keywords" radius={[4, 4, 0, 0]}>
                    {positionDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={POS_COLORS[index % POS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400">No data available</div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800 mb-4">Month-on-Month Growth</h3>
          {momGrowthData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={momGrowthData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="Keywords" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-400">No data available</div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search keywords or tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-2 py-2 border border-zinc-300 rounded-md text-sm"
              title="Start Date"
            />
            <span className="text-zinc-400">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-2 py-2 border border-zinc-300 rounded-md text-sm"
              title="End Date"
            />
          </div>

          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="All">All Clients</option>
              {adminOptions.clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <select
              value={seoOwnerFilter}
              onChange={(e) => setSeoOwnerFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="All">All SEO Owners</option>
              {adminOptions.seoOwners.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={rankingFilter}
              onChange={(e) => setRankingFilter(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="All">All Rankings</option>
              <option value="Top 10">In Top 10</option>
              <option value="Top 20">In Top 20</option>
              <option value="Drop">Dropped</option>
              <option value="Improved outside Top 20">Improved (Outside Top 20)</option>
              <option value="Improved outside Top 50">Improved (Outside Top 50)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-400 border-b border-zinc-200">
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">SEO Owner</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Target URL</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Focused KW</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider text-right">Volume</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider text-right">Monthly Ranking</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider text-right">Current Ranking</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider text-right">% Δ</th>
                <th className="px-4 py-3 text-xs font-bold text-white bg-black uppercase tracking-wider text-center">Keyword Status</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider">Remarks</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-900 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-zinc-500">
                    No keyword data found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const isEditing = editingTaskId === task.id;
                  const status = getRankingStatus(task.currentRank, task.marRank);
                  const percentChange = getPercentageChange(task.currentRank, task.marRank);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={task.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">{task.intakeDate}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600 whitespace-nowrap">{task.seoOwner || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900 whitespace-nowrap">{task.client}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600 max-w-xs truncate" title={task.title}>{task.title}</td>
                      
                      {isEditing ? (
                        <>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={editForm.targetUrl || ''} 
                              onChange={e => setEditForm({...editForm, targetUrl: e.target.value})}
                              className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                              placeholder="URL"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={editForm.focusedKw || ''} 
                              onChange={e => setEditForm({...editForm, focusedKw: e.target.value})}
                              className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              value={editForm.volume || ''} 
                              onChange={e => setEditForm({...editForm, volume: parseInt(e.target.value) || undefined})}
                              className="w-20 px-2 py-1 border border-zinc-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              value={editForm.marRank || ''} 
                              onChange={e => setEditForm({...editForm, marRank: parseInt(e.target.value) || undefined})}
                              className="w-16 px-2 py-1 border border-zinc-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="number" 
                              value={editForm.currentRank || ''} 
                              onChange={e => setEditForm({...editForm, currentRank: parseInt(e.target.value) || undefined})}
                              className="w-16 px-2 py-1 border border-zinc-300 rounded text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-zinc-400 italic">Auto</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-zinc-400 italic">Auto</span>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              value={editForm.remarks || ''} 
                              onChange={e => setEditForm({...editForm, remarks: e.target.value})}
                              className="w-full px-2 py-1 border border-zinc-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded mr-1" title="Save">
                              <Save size={16} />
                            </button>
                            <button onClick={handleCancelEdit} className="p-1 text-rose-600 hover:bg-rose-50 rounded" title="Cancel">
                              <X size={16} />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-zinc-600 max-w-[150px] truncate" title={task.targetUrl}>
                            {task.targetUrl ? (
                              <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-zinc-800">{task.focusedKw}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600 text-right">{task.volume?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600 text-right">{task.marRank || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-zinc-900 text-right">{task.currentRank || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-right">
                            {percentChange !== null ? (
                              percentChange === 0 ? (
                                <span className="text-zinc-500">No Change</span>
                              ) : (
                                <span className={percentChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {percentChange > 0 ? '▲' : '▼'} {Math.abs(percentChange).toFixed(2)}%
                                </span>
                              )
                            ) : '-'}
                          </td>
                          <td className={cn("px-4 py-3 text-center font-medium", status.bg, status.color)}>
                            {status.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 max-w-xs truncate" title={task.remarks}>{task.remarks || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => handleEditClick(task)}
                              className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Edit Keyword Data"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between bg-zinc-50">
            <div className="text-sm text-zinc-500">
              Showing <span className="font-medium text-zinc-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * itemsPerPage, filteredTasks.length)}</span> of <span className="font-medium text-zinc-900">{filteredTasks.length}</span> keywords
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and pages immediately surrounding current
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-zinc-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "w-8 h-8 rounded-md text-sm font-medium transition-colors flex items-center justify-center",
                          currentPage === page 
                            ? "bg-emerald-600 text-white" 
                            : "text-zinc-600 hover:bg-zinc-200"
                        )}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md text-zinc-500 hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Next Page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Keyword Modal */}
      {isNewKeywordModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-800">Add Keyword Entry</h2>
              <button 
                onClick={() => setIsNewKeywordModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Client *</label>
                    <select
                      value={newKeywordForm.client}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, client: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      {adminOptions.clients.map(client => (
                        <option key={client} value={client}>{client}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Task Title *</label>
                    <input
                      type="text"
                      value={newKeywordForm.title}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, title: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="e.g., Q1 Keyword Optimization"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Focused Keyword *</label>
                    <input
                      type="text"
                      value={newKeywordForm.focusedKw}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, focusedKw: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="e.g., best running shoes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Target URL</label>
                    <input
                      type="text"
                      value={newKeywordForm.targetUrl}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, targetUrl: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Search Volume</label>
                    <input
                      type="number"
                      value={newKeywordForm.volume}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, volume: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Monthly Rank</label>
                      <input
                        type="number"
                        value={newKeywordForm.marRank}
                        onChange={(e) => setNewKeywordForm({...newKeywordForm, marRank: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="e.g., 15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Current Rank</label>
                      <input
                        type="number"
                        value={newKeywordForm.currentRank}
                        onChange={(e) => setNewKeywordForm({...newKeywordForm, currentRank: e.target.value})}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Remarks</label>
                    <textarea
                      value={newKeywordForm.remarks}
                      onChange={(e) => setNewKeywordForm({...newKeywordForm, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none min-h-[100px]"
                      placeholder="Any notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50 rounded-b-xl">
              <button 
                onClick={() => setIsNewKeywordModalOpen(false)}
                className="px-4 py-2 text-zinc-700 font-medium hover:bg-zinc-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateKeywordEntry}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-colors"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
