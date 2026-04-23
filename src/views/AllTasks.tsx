import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { cn, formatDate } from '../utils';

interface AllTasksProps {
  tasks: Task[];
}

export function AllTasks({ tasks }: AllTasksProps) {
  const [ownerFilter, setOwnerFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('All');
  const [currOwnerFilter, setCurrOwnerFilter] = useState('All');

  const clients = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.client))).sort()], [tasks]);
  const seoOwners = ['All', 'Hemang', 'Imran', 'Kamna', 'Manish'];
  const currentOwners = ['All', 'SEO', 'Content', 'Web'];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (ownerFilter !== 'All' && t.seoOwner !== ownerFilter) return false;
      if (clientFilter !== 'All' && t.client !== clientFilter) return false;
      if (currOwnerFilter !== 'All' && t.currentOwner !== currOwnerFilter) return false;
      if (dateFilter && t.intakeDate !== dateFilter) return false;
      return true;
    });
  }, [tasks, ownerFilter, dateFilter, clientFilter, currOwnerFilter]);

  const getOwnerColor = (owner: string) => {
    switch (owner) {
      case 'SEO': return 'bg-blue-100 text-blue-800';
      case 'Content': return 'bg-orange-100 text-orange-800';
      case 'Web': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-zinc-100 text-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-zinc-800">📋 All Tasks</h2>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">👤 SEO Owner</label>
          <select 
            value={ownerFilter} 
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="w-full border-zinc-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
          >
            {seoOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">📅 Intake Date</label>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className={cn(
              "w-full border-zinc-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border",
              dateFilter ? "bg-amber-50 border-amber-300" : "bg-white"
            )}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">🏢 Client</label>
          <select 
            value={clientFilter} 
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full border-zinc-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
          >
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">🏷 Curr. Owner</label>
          <select 
            value={currOwnerFilter} 
            onChange={(e) => setCurrOwnerFilter(e.target.value)}
            className="w-full border-zinc-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border"
          >
            {currentOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 font-medium">Task ID</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Title</th>
                <th className="px-6 py-3 font-medium">SEO Owner</th>
                <th className="px-6 py-3 font-medium">Stage</th>
                <th className="px-6 py-3 font-medium">Curr. Owner</th>
                <th className="px-6 py-3 font-medium">Intake Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-500 italic">
                    — No tasks match the current filters —
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50">
                    <td className="px-6 py-3 font-mono text-xs text-zinc-500">{task.id}</td>
                    <td className="px-6 py-3 font-medium text-zinc-900">{task.client}</td>
                    <td className="px-6 py-3 text-zinc-700">{task.title}</td>
                    <td className="px-6 py-3 text-zinc-700">{task.seoOwner}</td>
                    <td className="px-6 py-3 text-zinc-700">{task.seoStage}</td>
                    <td className="px-6 py-3">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getOwnerColor(task.currentOwner))}>
                        {task.currentOwner || 'None'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-700">{formatDate(task.intakeDate)}</td>
                    <td className="px-6 py-3">
                      {task.isCompleted ? (
                        <span className="text-emerald-600 font-medium">✅ Completed</span>
                      ) : (
                        <span className="text-amber-600 font-medium">⏳ Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
