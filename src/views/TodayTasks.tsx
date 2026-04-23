import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { cn, getDeptDelayedInfo } from '../utils';
import { X, Play, Pause, CheckCircle2 } from 'lucide-react';

const HOUR = 3600000;
const TARGET_H = 8;

type ExecutionState = 'Not Started' | 'In Progress' | 'Paused' | 'Rework' | 'Ended';

const STATUS_TABS = [
  { key: 'All', label: 'All', color: '#444441', bg: '#F1EFE8' },
  { key: 'Not Started', label: 'Not Started', color: '#444441', bg: '#F1EFE8' },
  { key: 'In Progress', label: 'In Progress', color: '#0C447C', bg: '#E6F1FB' },
  { key: 'Paused', label: 'Paused', color: '#633806', bg: '#FAEEDA' },
  { key: 'Rework', label: 'Rework', color: '#3C3489', bg: '#EEEDFE' },
  { key: 'Ended', label: 'Completed', color: '#27500A', bg: '#EAF3DE' },
];

interface TaskModalProps {
  ownerName: string;
  tasks: Task[];
  onClose: () => void;
  onAction: (taskId: string, type: string, newState: ExecutionState) => void;
}

function TaskModal({ ownerName, tasks, onClose, onAction }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState('All');

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: tasks.length };
    tasks.forEach(t => {
      const state = t.isCompleted ? 'Ended' : (t.executionState || 'Not Started');
      counts[state] = (counts[state] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (activeTab === 'All') return tasks;
    return tasks.filter(t => {
      const state = t.isCompleted ? 'Ended' : (t.executionState || 'Not Started');
      return state === activeTab;
    });
  }, [tasks, activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{ownerName}'s Tasks</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">{tasks.length} total · click an action to update directly</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><X size={16} /></button>
        </div>

        {/* Status tabs */}
        <div className="flex border-b border-zinc-100 px-4 pt-2 gap-0.5 overflow-x-auto">
          {STATUS_TABS.filter(t => t.key === 'All' || (tabCounts[t.key] || 0) > 0).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.key ? "border-current" : "border-transparent text-zinc-400 hover:text-zinc-600"
              )}
              style={activeTab === tab.key ? { color: tab.color, borderColor: tab.color } : {}}
            >
              {tab.label}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: tab.bg, color: tab.color }}>
                {tab.key === 'All' ? tasks.length : tabCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {visibleTasks.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">No tasks in this status</div>
          ) : visibleTasks.map(task => {
            const state = task.isCompleted ? 'Ended' : (task.executionState || 'Not Started');
            const isRework = state === 'Rework' || task.seoQcStatus === 'Rework' ||
              (task.reworkEntries && task.reworkEntries.length > 0 && !task.reworkEntries[task.reworkEntries.length - 1].endTimestamp);
            const deptColor = task.currentOwner === 'Content' ? '#633806' : task.currentOwner === 'Web' ? '#085041' : '#0C447C';
            const deptBg = task.currentOwner === 'Content' ? '#FAEEDA' : task.currentOwner === 'Web' ? '#E1F5EE' : '#E6F1FB';

            return (
              <div key={task.id} className={cn("border rounded-xl p-3", isRework ? "border-purple-200 bg-purple-50/40" : "border-zinc-100 hover:bg-zinc-50")}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 break-words">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-zinc-400">{task.client}</span>
                      <span className="text-[10px] text-zinc-300">·</span>
                      <span className="text-[10px] text-zinc-400">{task.seoStage}</span>
                      <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 99, color: deptColor, background: deptBg }}>{task.currentOwner}</span>
                      {isRework && <span style={{ fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 99, color: '#3C3489', background: '#EEEDFE' }}>Rework</span>}
                      {task.focusedKw && <span className="text-[10px] text-zinc-400">KW: {task.focusedKw}</span>}
                    </div>
                  </div>
                  {/* Est hours */}
                  {(task.estHoursSEO || task.estHours || task.estHoursWeb || task.estHoursContent) > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-zinc-400">Est.</p>
                      <p className="text-xs font-medium text-zinc-600">
                        {task.currentOwner === 'Web' ? task.estHoursWeb :
                          task.currentOwner === 'Content' ? task.estHoursContent :
                          (task.estHoursSEO || task.estHours || 0)}h
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!task.isCompleted && state !== 'Ended' && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                    {(state === 'Not Started') && (
                      <button onClick={() => onAction(task.id, 'start', 'In Progress')}
                        className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <Play size={11} /> Start
                      </button>
                    )}
                    {state === 'In Progress' && (
                      <>
                        <button onClick={() => onAction(task.id, 'pause', 'Paused')}
                          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors">
                          <Pause size={11} /> Pause
                        </button>
                        <button onClick={() => { onAction(task.id, 'end', 'Ended'); onClose(); }}
                          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors">
                          <CheckCircle2 size={11} /> End Task
                        </button>
                      </>
                    )}
                    {state === 'Paused' && (
                      <>
                        <button onClick={() => onAction(task.id, 'resume', 'In Progress')}
                          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors">
                          <Play size={11} /> Resume
                        </button>
                        <button onClick={() => { onAction(task.id, 'end', 'Ended'); onClose(); }}
                          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors">
                          <CheckCircle2 size={11} /> End Task
                        </button>
                      </>
                    )}
                    {(state === 'Rework' || isRework) && (state === 'Not Started' || state === 'Rework') && (
                      <button onClick={() => onAction(task.id, 'start', 'Rework')}
                        className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors">
                        <Play size={11} /> Start Rework
                      </button>
                    )}
                    <span className="text-[10px] text-zinc-400 ml-auto">{state}</span>
                  </div>
                )}
                {(task.isCompleted || state === 'Ended') && (
                  <div className="mt-2 pt-2 border-t border-zinc-100">
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99, color: '#27500A', background: '#EAF3DE' }}>Completed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function CapBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 4, background: 'var(--color-background-secondary)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, color, background: bg }}>{label}</span>;
}

function InsightDot({ color }: { color: string }) {
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />;
}

export function TodayTasks({ tasks: propTasks }: { tasks: Task[] }) {
  const { tasks, setTasks, adminOptions, currentUser, isAdmin } = useAppContext();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

  // Filters — admin gets full control, others locked to their own
  // Non-admin: show all their tasks by default (no date restriction)
  // Admin: default to today so they see today's assignments
  const [dateFrom, setDateFrom] = useState(isAdmin ? todayStr : '');
  const [dateTo, setDateTo] = useState(isAdmin ? todayStr : '');
  const [clientFilter, setClientFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState(() =>
    !isAdmin && currentUser?.ownerName ? currentUser.ownerName : 'All'
  );
  const [stageFilter, setStageFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(isAdmin);

  // Modal state
  const [modalOwner, setModalOwner] = useState<string | null>(null);

  const logEvent = (taskId: string, type: string, newState: ExecutionState) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const now = new Date().toISOString();
      const newEvent = { type: type as any, timestamp: now, department: t.currentOwner };
      let updatedReworkEntries = t.reworkEntries ? [...t.reworkEntries] : undefined;
      if ((type === 'start' || type === 'resume') && updatedReworkEntries && updatedReworkEntries.length > 0) {
        const latest = updatedReworkEntries[updatedReworkEntries.length - 1];
        if (!latest.startTimestamp || latest.startTimestamp === '') {
          updatedReworkEntries = [...updatedReworkEntries.slice(0, -1), { ...latest, startTimestamp: now }];
          return { ...t, executionState: 'Rework' as ExecutionState, timeEvents: [...(t.timeEvents || []), { type: 'rework_start' as any, timestamp: now, department: t.currentOwner }], reworkEntries: updatedReworkEntries };
        }
      }
      const finalState = type === 'end' ? 'Ended' : newState;
      const isCompleted = type === 'end';
      return { ...t, executionState: finalState as ExecutionState, isCompleted, timeEvents: [...(t.timeEvents || []), newEvent], reworkEntries: updatedReworkEntries };
    }));
  };

  const isToday = isAdmin ? (dateFrom === todayStr && dateTo === todayStr) : (!dateFrom && !dateTo);

  // Base filtered tasks
  const filtered = useMemo(() => propTasks.filter(t => {
    // If no date range set, skip date filtering entirely
    const hasDateFilter = dateFrom || dateTo;
    if (hasDateFilter) {
      const inRange = (d?: string) => d && (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      if (!inRange(t.intakeDate) && !inRange(t.contentAssignedDate) && !inRange(t.webAssignedDate)) return false;
    }
    if (clientFilter !== 'All' && t.client !== clientFilter) return false;
    if (stageFilter !== 'All' && t.seoStage !== stageFilter) return false;
    if (deptFilter !== 'All' && t.currentOwner !== deptFilter) return false;
    if (ownerFilter !== 'All') {
      const matchSEO = t.seoOwner === ownerFilter;
      const matchContent = t.contentOwner === ownerFilter;
      const matchWeb = t.webOwner === ownerFilter;
      if (!matchSEO && !matchContent && !matchWeb) return false;
    }
    return true;
  }), [propTasks, dateFrom, dateTo, clientFilter, ownerFilter, stageFilter, deptFilter]);

  const modalTasks = useMemo(() =>
    modalOwner ? filtered.filter(t => t.seoOwner === modalOwner || t.contentOwner === modalOwner || t.webOwner === modalOwner) : [],
    [modalOwner, filtered]
  );

  // All SEO owners to show capacity
  const allOwners = useMemo(() => {
    const owners = isAdmin ? adminOptions.seoOwners : currentUser?.ownerName ? [currentUser.ownerName] : [];
    return owners;
  }, [adminOptions, isAdmin, currentUser]);

  // Compute owner assigned hours for date range
  const ownerStats = useMemo(() => allOwners.map(name => {
    const ownerTasks = tasks.filter(t => {
      const inRange = (d?: string) => {
        if (!dateFrom && !dateTo) return true;
        return d && (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      };
      return (t.seoOwner === name && inRange(t.intakeDate)) ||
        (t.contentOwner === name && inRange(t.contentAssignedDate)) ||
        (t.webOwner === name && inRange(t.webAssignedDate));
    });
    const assigned = ownerTasks.reduce((s, t) => {
      if (t.seoOwner === name) s += (t.estHoursSEO || t.estHours || 0);
      if (t.contentOwner === name) s += (t.estHoursContent || 0);
      if (t.webOwner === name) s += (t.estHoursWeb || 0);
      return s;
    }, 0);
    const gap = Math.max(0, TARGET_H - assigned);
    const pct = Math.min(100, Math.round(assigned / TARGET_H * 100));
    const barColor = pct >= 90 ? '#1D9E75' : pct >= 50 ? '#185FA5' : '#E24B4A';
    return { name, assigned, gap, pct, barColor, tasks: ownerTasks };
  }), [allOwners, tasks, dateFrom, dateTo]);

  // Urgent / attention items
  const urgentTasks = useMemo(() => filtered.filter(t => {
    if (t.isCompleted) return false;
    const ad = t.currentOwner === 'SEO' ? t.intakeDate : t.currentOwner === 'Content' ? t.contentAssignedDate : t.webAssignedDate;
    const est = t.currentOwner === 'SEO' ? (t.estHoursSEO || t.estHours || 0) : t.currentOwner === 'Content' ? (t.estHoursContent || 0) : (t.estHoursWeb || 0);
    const { isDelayed } = getDeptDelayedInfo(ad || '', est, 0);
    const isQC = t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC';
    return isDelayed || isQC;
  }), [filtered]);

  // Tasks by owner lanes
  const tasksByOwner = useMemo(() => allOwners.map(name => ({
    name,
    tasks: filtered.filter(t => t.seoOwner === name || t.contentOwner === name || t.webOwner === name)
  })), [allOwners, filtered]);

  // Insights (computed, not static)
  const insights = useMemo(() => {
    const list: { color: string; title: string; sub: string }[] = [];

    // Under capacity
    ownerStats.forEach(o => {
      if (o.gap >= 3) list.push({ color: '#E24B4A', title: `${o.name} has ${o.gap.toFixed(1)}h free today`, sub: `Only ${o.assigned}h assigned of ${TARGET_H}h target — assign more tasks` });
    });
    // Over capacity
    ownerStats.forEach(o => {
      if (o.assigned > TARGET_H + 1) list.push({ color: '#BA7517', title: `${o.name} may be overloaded — ${o.assigned.toFixed(1)}h assigned`, sub: `${(o.assigned - TARGET_H).toFixed(1)}h over target today` });
    });
    // Urgent tasks
    if (urgentTasks.length > 0) list.push({ color: '#E24B4A', title: `${urgentTasks.length} task${urgentTasks.length > 1 ? 's' : ''} need${urgentTasks.length === 1 ? 's' : ''} immediate attention`, sub: urgentTasks.map(t => t.title).slice(0, 2).join(', ') + (urgentTasks.length > 2 ? ` +${urgentTasks.length - 2} more` : '') });
    // Missing keywords
    const noKw = filtered.filter(t => !t.focusedKw && !t.isCompleted);
    if (noKw.length > 0) list.push({ color: '#BA7517', title: `${noKw.length} task${noKw.length > 1 ? 's' : ''} missing keyword data`, sub: `Affects ranking reports for ${[...new Set(noKw.map(t => t.client))].slice(0, 3).join(', ')}` });
    // QC waiting
    const qcWaiting = filtered.filter(t => t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC');
    if (qcWaiting.length > 0) list.push({ color: '#7F77DD', title: `${qcWaiting.length} task${qcWaiting.length > 1 ? 's' : ''} waiting for QC review`, sub: qcWaiting.map(t => t.title).slice(0, 2).join(', ') });
    // All good
    if (list.length === 0) list.push({ color: '#1D9E75', title: 'All clear — no blockers today', sub: `${filtered.length} tasks on track` });

    return list.slice(0, 5);
  }, [ownerStats, urgentTasks, filtered]);

  // Stats
  const totalToday = filtered.length;
  const completedToday = filtered.filter(t => t.isCompleted || t.executionState === 'Ended').length;
  const inProgressToday = filtered.filter(t => t.executionState === 'In Progress').length;
  const myAssigned = currentUser?.ownerName ? ownerStats.find(o => o.name === currentUser.ownerName) : ownerStats[0];

  // Export CSV
  const exportCSV = () => {
    const headers = ['Intake Date','Title','Client','SEO Stage','SEO Owner','Current Owner','Keyword','Volume','Mar Rank','Cur Rank','Status'];
    const rows = filtered.map(t => [
      t.intakeDate, `"${t.title.replace(/"/g,'""')}"`, t.client, t.seoStage, t.seoOwner,
      t.currentOwner, t.focusedKw||'', t.volume||'', t.marRank||'', t.currentRank||'',
      t.isCompleted ? 'Completed' : t.executionState || 'Not Started'
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `today-tasks-${dateFrom}.csv`;
    a.click();
  };

  const roleColors: Record<string, string> = { seo: '#185FA5', content: '#BA7517', web: '#1D9E75', admin: '#A32D2D' };
  const roleBgs: Record<string, string> = { seo: '#E6F1FB', content: '#FAEEDA', web: '#E1F5EE', admin: '#FCEBEB' };

  return (
    <div className="space-y-4">
      {modalOwner && (
        <TaskModal
          ownerName={modalOwner}
          tasks={modalTasks}
          onClose={() => setModalOwner(null)}
          onAction={(taskId, type, newState) => logEvent(taskId, type, newState)}
        />
      )}

      {/* ── Greeting bar ── */}
      <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {getGreeting()}{currentUser?.name ? `, ${currentUser.name}` : ''}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {todayDate} · {totalToday} tasks {isToday ? 'today' : 'in range'} · {completedToday} completed · {inProgressToday} in progress
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {urgentTasks.length > 0 && <Badge label={`${urgentTasks.length} urgent`} color="#791F1F" bg="#FCEBEB" />}
            {myAssigned && myAssigned.gap >= 2 && <Badge label={`${myAssigned.gap.toFixed(1)}h unassigned`} color="#633806" bg="#FAEEDA" />}
            <button onClick={exportCSV} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors">Export CSV</button>
            {isAdmin && <button onClick={() => setShowFilters(f => !f)} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition-colors">{showFilters ? 'Hide' : 'Show'} filters</button>}
          </div>
        </div>
      </div>

      {/* ── Admin filters ── */}
      {showFilters && (
        <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Filters</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Owner</label>
                  <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="All">All owners</option>
                    {[...adminOptions.seoOwners, ...adminOptions.contentOwners, ...adminOptions.webOwners].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1">Client</label>
                  <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="All">All clients</option>
                    {adminOptions.clients.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Stage</label>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="All">All stages</option>
                {adminOptions.seoStages.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Department</label>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="All">All depts</option>
                <option>SEO</option><option>Content</option><option>Web</option>
              </select>
            </div>
            {(dateFrom !== todayStr || dateTo !== todayStr || clientFilter !== 'All' || ownerFilter !== 'All' || stageFilter !== 'All' || deptFilter !== 'All') && (
              <button onClick={() => { setDateFrom(isAdmin ? todayStr : ''); setDateTo(isAdmin ? todayStr : ''); setClientFilter('All'); setOwnerFilter(!isAdmin && currentUser?.ownerName ? currentUser.ownerName : 'All'); setStageFilter('All'); setDeptFilter('All'); }} className="text-xs px-3 py-1.5 border border-zinc-200 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors self-end">Reset to today</button>
            )}
          </div>
        </div>
      )}

      {/* ── Capacity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My capacity ring (non-admin) or summary card (admin) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            {isAdmin ? 'Team capacity — today' : 'My day'}
          </p>
          <div className="space-y-3">
            {ownerStats.slice(0, isAdmin ? 8 : 1).map(o => (
              <div key={o.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: roleBgs[isAdmin ? 'seo' : (currentUser?.role || 'seo')], color: roleColors[isAdmin ? 'seo' : (currentUser?.role || 'seo')] }}>
                  {o.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-zinc-800">{o.name}</span>
                    <span className="text-[10px]" style={{ color: o.barColor }}>
                      {o.assigned.toFixed(1)}h / {TARGET_H}h
                      {o.gap > 0 ? ` · ${o.gap.toFixed(1)}h free` : ' · Full'}
                    </span>
                  </div>
                  <CapBar value={o.assigned} max={TARGET_H} color={o.barColor} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Tasks today', value: totalToday },
            { label: 'Completed', value: completedToday, color: '#1D9E75' },
            { label: 'In progress', value: inProgressToday, color: '#185FA5' },
            { label: 'Urgent', value: urgentTasks.length, color: urgentTasks.length > 0 ? '#A32D2D' : undefined },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Urgent / attention ── */}
      {urgentTasks.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Needs attention</p>
          <div className="space-y-2">
            {urgentTasks.slice(0, 5).map(task => {
              const ad = task.currentOwner === 'SEO' ? task.intakeDate : task.currentOwner === 'Content' ? task.contentAssignedDate : task.webAssignedDate;
              const est = task.currentOwner === 'SEO' ? (task.estHoursSEO || task.estHours || 0) : task.currentOwner === 'Content' ? (task.estHoursContent || 0) : (task.estHoursWeb || 0);
              const { isDelayed, reason } = getDeptDelayedInfo(ad || '', est, 0);
              const isQC = task.seoQcStatus === 'Pending QC' || task.seoQcStatus === 'QC';
              const [bg, border, labelColor, labelBg, label] = isDelayed
                ? ['#FCEBEB', '#F7C1C1', '#791F1F', '#F7C1C1', reason === 'calendar' ? 'Date overdue' : 'Over hours']
                : ['#E1F5EE', '#9FE1CB', '#085041', '#9FE1CB', 'QC pending'];
              return (
                <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: bg, border: `0.5px solid ${border}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: labelColor }}>{task.title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: labelColor, opacity: 0.8 }}>{task.client} · {task.seoOwner} · {task.currentOwner}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 99, color: labelColor, background: labelBg, flexShrink: 0 }}>{label}</span>
                </div>
              );
            })}
            {urgentTasks.length > 5 && <p className="text-[10px] text-zinc-400 text-center">+{urgentTasks.length - 5} more — go to Action Board</p>}
          </div>
        </div>
      )}

      {/* ── Owner lanes ── */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Tasks by owner {!isToday ? '— filtered period' : '— today'}
        </p>
        {allOwners.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">No owners to display.</p>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(allOwners.length, 4)}, minmax(0, 1fr))` }}>
            {tasksByOwner.map(({ name, tasks: ownerTasks }) => (
              <div key={name} className="rounded-xl p-3 cursor-pointer hover:brightness-95 transition-all" style={{ background: '#E6F1FB' }}
                onClick={() => setModalOwner(name)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-medium" style={{ color: '#0C447C' }}>{name}</span>
                    <span className="text-base font-bold" style={{ color: '#0C447C' }}>{ownerTasks.length}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: '#0C447C', background: 'rgba(255,255,255,0.5)' }}>View all ›</span>
                </div>
                {ownerTasks.slice(0, 3).map(t => {
                  const state = t.executionState || 'Not Started';
                  const dotColor = state === 'In Progress' ? '#185FA5' : state === 'Paused' ? '#BA7517' : state === 'Rework' ? '#7F77DD' : state === 'Ended' ? '#1D9E75' : '#B4B2A9';
                  return (
                    <div key={t.id} className="flex items-center gap-1.5 text-[10px] bg-white/70 rounded px-1.5 py-1 mb-1" style={{ color: '#185FA5' }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span className="truncate" title={t.title}>{t.title}</span>
                    </div>
                  );
                })}
                {ownerTasks.length > 3 && (
                  <div className="text-[9px] text-center py-1 rounded mt-1" style={{ color: '#0C447C', background: 'rgba(255,255,255,0.4)' }}>
                    +{ownerTasks.length - 3} more — click to view all
                  </div>
                )}
                {ownerTasks.length === 0 && (
                  <div className="text-[10px] italic" style={{ color: '#185FA5', opacity: 0.5 }}>No tasks assigned</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Insights ── */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Insights</p>
        <div className="space-y-0">
          {insights.map((ins, i) => (
            <div key={i} className={cn("flex items-start gap-3 py-2.5", i < insights.length - 1 && "border-b border-zinc-50")}>
              <InsightDot color={ins.color} />
              <div>
                <p className="text-xs font-medium text-zinc-800">{ins.title}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{ins.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Task table ── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            All tasks — {totalToday} total
          </p>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: 400 }}>
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Task</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Client</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Stage</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Owner</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Dept</th>
                <th className="px-4 py-2.5 text-left font-medium text-zinc-500">Keyword</th>
                <th className="px-4 py-2.5 text-center font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">No tasks match the current filters</td></tr>
              ) : filtered.map(task => {
                const isDelayed = (() => {
                  const ad = task.currentOwner === 'SEO' ? task.intakeDate : task.currentOwner === 'Content' ? task.contentAssignedDate : task.webAssignedDate;
                  const est = task.currentOwner === 'SEO' ? (task.estHoursSEO || task.estHours || 0) : task.currentOwner === 'Content' ? (task.estHoursContent || 0) : (task.estHoursWeb || 0);
                  return getDeptDelayedInfo(ad || '', est, 0).isDelayed;
                })();
                const deptColor = task.currentOwner === 'Content' ? '#BA7517' : task.currentOwner === 'Web' ? '#1D9E75' : '#185FA5';
                const deptBg = task.currentOwner === 'Content' ? '#FAEEDA' : task.currentOwner === 'Web' ? '#E1F5EE' : '#E6F1FB';
                const deptTextColor = task.currentOwner === 'Content' ? '#633806' : task.currentOwner === 'Web' ? '#085041' : '#0C447C';
                return (
                  <tr key={task.id} className={cn("hover:bg-zinc-50 transition-colors", isDelayed && "bg-red-50/40")}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-zinc-800 max-w-[200px] truncate" title={task.title}>{task.title}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{task.intakeDate}</div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{task.client}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{task.seoStage}</td>
                    <td className="px-4 py-2.5 text-zinc-600">{task.seoOwner}</td>
                    <td className="px-4 py-2.5">
                      <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, color: deptTextColor, background: deptBg }}>{task.currentOwner}</span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 max-w-[130px] truncate">{task.focusedKw || <span className="text-zinc-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-center">
                      {task.isCompleted
                        ? <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, color: '#27500A', background: '#EAF3DE' }}>Done</span>
                        : isDelayed
                        ? <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, color: '#791F1F', background: '#FCEBEB' }}>Delayed</span>
                        : task.executionState === 'In Progress'
                        ? <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 99, color: '#0C447C', background: '#E6F1FB' }}>In Progress</span>
                        : <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, color: '#444441', background: '#F1EFE8' }}>{task.executionState || 'Not Started'}</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
