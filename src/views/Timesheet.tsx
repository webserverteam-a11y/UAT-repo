import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateTimePerDay } from '../utils/timeTracking';
import { getDeptDelayedInfo } from '../utils';
import { Download, AlertTriangle, CheckCircle2, Clock, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils';

const DAILY_TARGET_MS = 8 * 3600000;

export function Timesheet() {
  const { tasks, adminOptions, currentUser, isAdmin } = useAppContext();

  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(today.setDate(diff));
  const endOfWeek = new Date(today.setDate(diff + 6));

  const [startDate, setStartDate] = useState(startOfWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfWeek.toISOString().split('T')[0]);
  const [ownerFilter, setOwnerFilter] = useState(() => currentUser && !isAdmin ? (currentUser.ownerName || 'All') : 'All');
  const [activeTab, setActiveTab] = useState<'timesheet' | 'productivity'>('productivity');
  const [collapsedDelayed, setCollapsedDelayed] = useState<Set<string>>(new Set());

  const timeData = useMemo(() => calculateTimePerDay(tasks), [tasks]);

  const dateRange = useMemo(() => {
    const dates: string[] = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const formatTime = (ms: number) => {
    if (!ms) return '-';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getDayTotal = (owner: string, date: string, type: 'activeMs' | 'reworkMs' = 'activeMs') => {
    let total = 0;
    if (timeData[owner]) {
      Object.values(timeData[owner]).forEach(taskTime => {
        if (taskTime[date]) total += (taskTime[date] as any)[type] || 0;
      });
    }
    return total;
  };

  const getTaskTotal = (owner: string, taskId: string, type: 'activeMs' | 'reworkMs' = 'activeMs') => {
    let total = 0;
    if (timeData[owner]?.[taskId]) {
      dateRange.forEach(date => { total += (timeData[owner][taskId][date] as any)?.[type] || 0; });
    }
    return total;
  };

  const getOwnerTotal = (owner: string, type: 'activeMs' | 'reworkMs' = 'activeMs') => {
    let total = 0;
    dateRange.forEach(date => { total += getDayTotal(owner, date, type); });
    return total;
  };

  const productivitySummary = useMemo(() => {
    const allOwners = Array.from(new Set([
      ...adminOptions.seoOwners,
      ...adminOptions.contentOwners,
      ...adminOptions.webOwners,
    ])).sort();

    const workDates = dateRange.filter(d => { const dow = new Date(d).getDay(); return dow !== 0 && dow !== 6; });

    return allOwners.map(owner => {
      const totalActiveMs = getOwnerTotal(owner, 'activeMs');
      const totalReworkMs = getOwnerTotal(owner, 'reworkMs');

      // Assigned hours: sum estHours for all tasks assigned to this owner within date range
      let assignedHoursMs = 0;
      tasks.forEach(task => {
        if (task.seoOwner === owner && dateRange.includes(task.intakeDate)) {
          assignedHoursMs += (task.estHoursSEO || task.estHours || 0) * 3600000;
        }
        if (task.contentOwner === owner && task.contentAssignedDate && dateRange.includes(task.contentAssignedDate)) {
          assignedHoursMs += (task.estHoursContent || 0) * 3600000;
        }
        if (task.webOwner === owner && task.webAssignedDate && dateRange.includes(task.webAssignedDate)) {
          assignedHoursMs += (task.estHoursWeb || 0) * 3600000;
        }
      });

      let penaltyReworkMs = 0;
      tasks.forEach(task => {
        if (!task.reworkEntries) return;
        task.reworkEntries.forEach(rw => {
          if (rw.withinEstimate) return;
          const isOwner =
            (rw.assignedDept === 'Content' && task.contentOwner === owner) ||
            (rw.assignedDept === 'Web' && task.webOwner === owner) ||
            task.seoOwner === owner;
          if (!isOwner) return;
          const overMs = Math.max(0, rw.estHours * 3600000 - rw.hoursAlreadySpent * 3600000);
          penaltyReworkMs += overMs;
        });
      });

      const delayedTasks = tasks.filter(task => {
        const rangeStart = new Date(startDate + 'T00:00:00');
        const rangeEnd = new Date(endDate + 'T23:59:59');

        if (task.seoOwner === owner) {
          const est = task.estHoursSEO || task.estHours || 0;
          const activeMs = getTaskTotal(owner, task.id);
          const { isDelayed, deadlineDate } = getDeptDelayedInfo(task.intakeDate || '', est, activeMs);
          // Only include if deadline falls within the selected date range
          if (isDelayed && deadlineDate && deadlineDate >= rangeStart && deadlineDate <= rangeEnd) return true;
        }
        if (task.contentOwner === owner && task.contentAssignedDate) {
          const activeMs = getTaskTotal(owner, task.id);
          const { isDelayed, deadlineDate } = getDeptDelayedInfo(task.contentAssignedDate, task.estHoursContent || 0, activeMs);
          if (isDelayed && deadlineDate && deadlineDate >= rangeStart && deadlineDate <= rangeEnd) return true;
        }
        if (task.webOwner === owner && task.webAssignedDate) {
          const activeMs = getTaskTotal(owner, task.id);
          const { isDelayed, deadlineDate } = getDeptDelayedInfo(task.webAssignedDate, task.estHoursWeb || 0, activeMs);
          if (isDelayed && deadlineDate && deadlineDate >= rangeStart && deadlineDate <= rangeEnd) return true;
        }
        return false;
      });

      const workDays = workDates.length;
      const effectiveWorkDays = workDays > 0 ? workDays : 1;
      const targetMs = effectiveWorkDays * DAILY_TARGET_MS;
      const productiveMs = Math.max(0, totalActiveMs - penaltyReworkMs);
      // Unassigned capacity = how many hours the manager still needs to assign
      const unassignedMs = Math.max(0, targetMs - assignedHoursMs);
      // Is the day fully planned (enough tasks assigned)?
      const isFullyPlanned = assignedHoursMs >= targetMs;
      // Has enough been logged?
      const isLoggingMet = totalActiveMs > 0 && productiveMs >= targetMs;

      return {
        owner, totalActiveMs, totalReworkMs, penaltyReworkMs, productiveMs,
        assignedHoursMs, unassignedMs, isFullyPlanned, isLoggingMet,
        targetMs, workDays, delayedTasks,
        hasData: totalActiveMs > 0 || totalReworkMs > 0 || assignedHoursMs > 0,
        shortfallMs: Math.max(0, targetMs - productiveMs),
        overageMs: Math.max(0, productiveMs - targetMs),
      };
    }); // show ALL owners — manager needs to see everyone
  }, [tasks, timeData, dateRange, adminOptions]);

  const allOwners = Array.from(new Set([
    ...adminOptions.seoOwners,
    ...adminOptions.contentOwners,
    ...adminOptions.webOwners,
  ])).sort();

  const filteredOwners = ownerFilter === 'All' ? allOwners : [ownerFilter];

  const exportToCSV = () => {
    let csv = 'Owner,Task,' + dateRange.join(',') + ',Total Active,Total Rework\n';
    filteredOwners.forEach(owner => {
      if (!timeData[owner]) return;
      Object.keys(timeData[owner]).forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        const name = task ? `[${task.id}] ${task.title}` : taskId;
        let row = `"${owner}","${name}"`;
        dateRange.forEach(date => { row += `,${((timeData[owner][taskId][date]?.activeMs || 0) / 3600000).toFixed(2)}`; });
        row += `,${(getTaskTotal(owner, taskId) / 3600000).toFixed(2)},${(getTaskTotal(owner, taskId, 'reworkMs') / 3600000).toFixed(2)}\n`;
        csv += row;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `timesheet-${startDate}-to-${endDate}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-800">Timesheet</h1>
        <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-md hover:bg-zinc-50 transition-colors shadow-sm text-sm font-medium">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex flex-col sm:flex-row gap-4 items-end flex-wrap">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Owner</label>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} disabled={!isAdmin} className="px-3 py-2 border border-zinc-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none min-w-[180px]">
            <option value="All">All Owners</option>
            {allOwners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { const t = new Date().toISOString().split('T')[0]; setStartDate(t); setEndDate(t); }}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-md bg-white transition-colors"
          >
            Today
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-lg gap-1">
            <button onClick={() => setActiveTab('productivity')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'productivity' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-700")}>Productivity</button>
            <button onClick={() => setActiveTab('timesheet')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'timesheet' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500 hover:text-zinc-700")}>Time Logs</button>
          </div>
        </div>
      </div>

      {activeTab === 'productivity' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Productivity target: 8h/day.</strong> Rework hours exceeding the original task estimate are <strong>penalty hours</strong> — they reduce billable productivity. Each delayed task = one fewer task completed per day.
            </div>
          </div>

          {productivitySummary.length === 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-500">No owners found.</div>
          )}

          {productivitySummary
            .filter(s => ownerFilter === 'All' || s.owner === ownerFilter)
            .map(s => {
            const assignedPct = s.targetMs > 0 ? Math.min(100, (s.assignedHoursMs / s.targetMs) * 100) : 0;
            const loggedPct = s.targetMs > 0 ? Math.min(100, (s.productiveMs / s.targetMs) * 100) : 0;
            const penaltyPct = s.targetMs > 0 ? Math.min(30, (s.penaltyReworkMs / s.targetMs) * 100) : 0;
            const isOT = s.totalActiveMs / 3600000 / Math.max(s.workDays, 1) > 8;

            return (
              <div key={s.owner} className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {s.owner.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{s.owner}</p>
                      <p className="text-xs text-zinc-500">
                        {s.workDays === 0 ? 'Weekend · showing 8h target' : `${s.workDays} working day${s.workDays !== 1 ? 's' : ''} · Target ${formatTime(s.targetMs)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {s.delayedTasks.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg">
                        <TrendingDown className="w-3 h-3" /> {s.delayedTasks.length} delayed
                      </span>
                    )}
                    {isOT && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg">
                        OT {formatTime(Math.max(0, s.totalActiveMs - s.workDays * 8 * 3600000))}
                      </span>
                    )}
                    {/* Unassigned capacity — most important for manager */}
                    {s.unassignedMs > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-lg">
                        <Clock className="w-3 h-3" /> {formatTime(s.unassignedMs)} unassigned
                      </span>
                    )}
                    {/* Logging status — only show positive when actually earned */}
                    {s.totalActiveMs === 0 ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-zinc-100 text-zinc-500 rounded-lg">
                        <Clock className="w-3 h-3" /> Not started
                      </span>
                    ) : s.isLoggingMet ? (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Target logged
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
                        <Clock className="w-3 h-3" /> {formatTime(s.shortfallMs)} short
                      </span>
                    )}
                  </div>
                </div>

                {/* 5-column metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-zinc-500 font-medium mb-1">Assigned</p>
                    <p className="text-lg font-bold text-zinc-900">{s.assignedHoursMs > 0 ? formatTime(s.assignedHoursMs) : '—'}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Est. hours for period</p>
                  </div>
                  <div className={cn("rounded-lg p-3 border", s.unassignedMs > 0 ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100")}>
                    <p className={cn("text-xs font-medium mb-1", s.unassignedMs > 0 ? "text-orange-600" : "text-emerald-600")}>Unassigned</p>
                    <p className={cn("text-lg font-bold", s.unassignedMs > 0 ? "text-orange-700" : "text-emerald-700")}>
                      {s.unassignedMs > 0 ? formatTime(s.unassignedMs) : '✓ Full'}
                    </p>
                    <p className={cn("text-[11px] mt-0.5", s.unassignedMs > 0 ? "text-orange-400" : "text-emerald-400")}>
                      {s.unassignedMs > 0 ? 'Needs tasks assigned' : 'Capacity covered'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs text-zinc-500 font-medium mb-1">Total Active</p>
                    <p className="text-lg font-bold text-zinc-900">{s.totalActiveMs > 0 ? formatTime(s.totalActiveMs) : '—'}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Logged so far</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <p className="text-xs text-purple-600 font-medium mb-1">Rework</p>
                    <p className="text-lg font-bold text-purple-900">{s.totalReworkMs > 0 ? formatTime(s.totalReworkMs) : '—'}</p>
                    <p className="text-[11px] text-purple-400 mt-0.5">
                      {s.penaltyReworkMs > 0 ? `${formatTime(s.penaltyReworkMs)} penalty` : 'In rework state'}
                    </p>
                  </div>
                  <div className={cn("rounded-lg p-3 border", s.isLoggingMet ? "bg-emerald-50 border-emerald-100" : s.totalActiveMs > 0 ? "bg-amber-50 border-amber-100" : "bg-zinc-50 border-zinc-100")}>
                    <p className={cn("text-xs font-medium mb-1", s.isLoggingMet ? "text-emerald-600" : s.totalActiveMs > 0 ? "text-amber-600" : "text-zinc-400")}>Productive</p>
                    <p className={cn("text-lg font-bold", s.isLoggingMet ? "text-emerald-700" : s.totalActiveMs > 0 ? "text-amber-700" : "text-zinc-300")}>
                      {s.productiveMs > 0 ? formatTime(s.productiveMs) : '—'}
                    </p>
                    <p className={cn("text-[11px] mt-0.5", s.isLoggingMet ? "text-emerald-400" : "text-zinc-400")}>
                      {s.isLoggingMet ? `+${formatTime(s.overageMs)} over` : s.totalActiveMs > 0 ? `${formatTime(s.shortfallMs)} to go` : 'Not started'}
                    </p>
                  </div>
                </div>

                {/* Two thin bars: planned vs logged */}
                <div className="space-y-2">
                  {/* Bar 1: Assigned/planned hours */}
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Assigned capacity</span>
                      <span className={cn(s.unassignedMs > 0 ? "text-orange-500 font-medium" : "text-emerald-500 font-medium")}>
                        {Math.round(assignedPct)}% · {s.unassignedMs > 0 ? `${formatTime(s.unassignedMs)} still free` : 'fully planned'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-300 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", s.isFullyPlanned ? "bg-emerald-400" : "bg-orange-400")}
                        style={{ width: `${Math.min(assignedPct, 100)}%` }} />
                    </div>
                  </div>
                  {/* Bar 2: Logged productive hours */}
                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Logged vs 8h target</span>
                      <span>{Math.round(loggedPct)}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-300 rounded-full overflow-hidden flex">
                      <div className="h-full bg-indigo-400 transition-all" style={{ width: `${Math.max(0, loggedPct - penaltyPct)}%` }} />
                      {penaltyPct > 0 && <div className="h-full bg-red-400 transition-all" style={{ width: `${penaltyPct}%` }} />}
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 pt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Assigned</span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Logged</span>
                    {penaltyPct > 0 && <span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Penalty</span>}
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400"><span className="w-2 h-2 rounded-full bg-zinc-300 inline-block" />Remaining</span>
                  </div>
                </div>

                {s.delayedTasks.length > 0 && (() => {
                  const isCollapsed = collapsedDelayed.has(s.owner);
                  return (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                      <button
                        onClick={() => setCollapsedDelayed(prev => {
                          const next = new Set(prev);
                          next.has(s.owner) ? next.delete(s.owner) : next.add(s.owner);
                          return next;
                        })}
                        className="w-full flex items-center justify-between text-xs font-semibold text-red-600 uppercase mb-2 hover:text-red-700 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" />
                          Delayed tasks ({s.delayedTasks.length}) · within selected period
                        </span>
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      {!isCollapsed && (
                        <div className="space-y-1.5">
                          {s.delayedTasks.map(task => {
                            const dept = task.seoOwner === s.owner ? 'SEO' : task.contentOwner === s.owner ? 'Content' : 'Web';
                            const est = dept === 'SEO' ? (task.estHoursSEO || task.estHours || 0) : dept === 'Content' ? task.estHoursContent : task.estHoursWeb;
                            const assignedDate = dept === 'SEO' ? task.intakeDate : dept === 'Content' ? task.contentAssignedDate : task.webAssignedDate;
                            const actualMs = getTaskTotal(s.owner, task.id);
                            const { reason, deadlineDate } = getDeptDelayedInfo(assignedDate || '', est, actualMs);
                            const overMs = est > 0 ? Math.max(0, actualMs - est * 3600000) : 0;
                            return (
                              <div key={task.id} className="flex items-center justify-between text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <div>
                                  <span className="font-medium text-zinc-800">{task.title}</span>
                                  <span className="text-zinc-400 text-xs ml-2">{task.client}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                                    dept === 'SEO' ? "bg-blue-100 text-blue-700" :
                                    dept === 'Content' ? "bg-orange-100 text-orange-700" :
                                    "bg-emerald-100 text-emerald-700")}>{dept}</span>
                                  {deadlineDate && (
                                    <span className="text-xs text-zinc-500">
                                      Deadline: {deadlineDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                  {est > 0 && <span className="text-xs text-zinc-400">Est {est}h · Actual {formatTime(actualMs)}</span>}
                                  {overMs > 0 && <span className="text-xs font-bold text-red-600">+{formatTime(overMs)} over</span>}
                                  <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                    {reason === 'calendar' ? 'Date overdue' : reason === 'overrun' ? 'Hrs overrun' : 'Date + Hrs'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'timesheet' && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider sticky left-0 bg-zinc-50 z-10 w-64">Owner / Task</th>
                  {dateRange.map(date => {
                    const d = new Date(date);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={date} className={cn("px-4 py-3 text-xs font-bold uppercase tracking-wider text-center min-w-[88px]", isWeekend ? "bg-zinc-100 text-zinc-400" : "text-zinc-500")}>
                        <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div>{d.getDate()} {d.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase text-center min-w-[72px]">Active</th>
                  <th className="px-4 py-3 text-xs font-bold text-purple-500 uppercase text-center min-w-[72px]">Rework</th>
                  <th className="px-4 py-3 text-xs font-bold text-blue-500 uppercase text-center min-w-[60px]">Est.</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase text-center min-w-[60px]">% Done</th>
                  <th className="px-4 py-3 text-xs font-bold text-zinc-500 uppercase text-center min-w-[90px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredOwners.map(owner => {
                  const ownerData = timeData[owner];
                  if (!ownerData) return null;
                  const taskIds = Object.keys(ownerData).filter(tid => getTaskTotal(owner, tid) > 0 || getTaskTotal(owner, tid, 'reworkMs') > 0);
                  if (taskIds.length === 0) return null;

                  // Owner-level est hours
                  let ownerEstMs = 0;
                  taskIds.forEach(tid => {
                    const t = tasks.find(x => x.id === tid);
                    if (!t) return;
                    const dept = t.seoOwner === owner ? 'SEO' : t.contentOwner === owner ? 'Content' : 'Web';
                    const est = dept === 'SEO' ? (t.estHoursSEO || t.estHours || 0) : dept === 'Content' ? (t.estHoursContent || 0) : (t.estHoursWeb || 0);
                    ownerEstMs += est * 3600000;
                  });
                  const ownerActiveTotal = getOwnerTotal(owner);
                  const ownerPct = ownerEstMs > 0 ? Math.min(100, Math.round(ownerActiveTotal / ownerEstMs * 100)) : null;

                  return (
                    <React.Fragment key={owner}>
                      {/* Owner header row */}
                      <tr className="bg-indigo-50/60 border-b-2 border-indigo-100">
                        <td className="px-4 py-3 font-bold text-indigo-900 sticky left-0 bg-indigo-50/60 z-10">
                          <div>{owner}</div>
                          {ownerEstMs > 0 && <div className="text-[11px] font-normal text-indigo-500 mt-0.5">Est. {formatTime(ownerEstMs)} assigned</div>}
                        </td>
                        {dateRange.map(date => {
                          const totalMs = getDayTotal(owner, date);
                          const hours = totalMs / 3600000;
                          const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                          // 5-tier colour scale
                          let cellBg = '', textColor = 'text-zinc-400', label = '';
                          if (!isWeekend && totalMs > 0) {
                            if (hours > 8)        { cellBg = 'bg-red-100';    textColor = 'text-red-700';     label = `+${(hours-8).toFixed(1)}h OT`; }
                            else if (hours >= 8)  { cellBg = 'bg-emerald-100'; textColor = 'text-emerald-700'; label = '✓ On target'; }
                            else if (hours >= 4)  { cellBg = 'bg-amber-50';   textColor = 'text-amber-700';   label = `${(8-hours).toFixed(1)}h short`; }
                            else                  { cellBg = 'bg-red-50';     textColor = 'text-red-500';     label = `${(8-hours).toFixed(1)}h short`; }
                          }
                          // mini progress bar
                          const barPct = Math.min(100, (hours / 8) * 100);
                          return (
                            <td key={date} className={cn("px-3 py-2 text-sm font-semibold text-center", isWeekend ? "bg-zinc-50 text-zinc-300" : cellBg, textColor)}>
                              {totalMs > 0 ? formatTime(totalMs) : <span className="text-zinc-300">—</span>}
                              {!isWeekend && totalMs > 0 && (
                                <>
                                  <div className="text-[10px] font-normal mt-0.5 opacity-80">{label}</div>
                                  <div className="mt-1 h-1 bg-black/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-current rounded-full opacity-40 transition-all" style={{ width: `${barPct}%` }} />
                                  </div>
                                </>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-sm font-bold text-center text-indigo-700 bg-indigo-50">
                          {formatTime(ownerActiveTotal)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-center text-purple-600 bg-purple-50/50">
                          {formatTime(getOwnerTotal(owner, 'reworkMs')) || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-center text-blue-600">
                          {ownerEstMs > 0 ? formatTime(ownerEstMs) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-center">
                          {ownerPct !== null ? (
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded",
                              ownerPct >= 100 ? "bg-emerald-100 text-emerald-700" :
                              ownerPct >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            )}>{ownerPct}%</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>

                      {/* Task rows */}
                      {taskIds.map(taskId => {
                        const task = tasks.find(t => t.id === taskId);
                        const activeTotal = getTaskTotal(owner, taskId);
                        const reworkTotal = getTaskTotal(owner, taskId, 'reworkMs');
                        const dept = task?.seoOwner === owner ? 'SEO' : task?.contentOwner === owner ? 'Content' : 'Web';
                        const est = dept === 'SEO' ? (task?.estHoursSEO || task?.estHours || 0) : dept === 'Content' ? (task?.estHoursContent || 0) : (task?.estHoursWeb || 0);
                        const assignedDate = dept === 'SEO' ? task?.intakeDate : dept === 'Content' ? task?.contentAssignedDate : task?.webAssignedDate;
                        const { isDelayed } = getDeptDelayedInfo(assignedDate || '', est, activeTotal);
                        const pctDone = est > 0 ? Math.min(200, Math.round(activeTotal / (est * 3600000) * 100)) : null;
                        const isCompleted = task?.isCompleted || task?.executionState === 'Ended';
                        const isOverrun = est > 0 && activeTotal > est * 3600000;

                        let statusBadge = null;
                        if (isCompleted)      statusBadge = <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Done</span>;
                        else if (isDelayed)   statusBadge = <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Delayed</span>;
                        else if (isOverrun)   statusBadge = <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Over hrs</span>;
                        else if (activeTotal > 0) statusBadge = <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">In progress</span>;
                        else                  statusBadge = <span className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded">Not started</span>;

                        return (
                          <tr key={`${owner}-${taskId}`} className={cn("hover:bg-zinc-50/80 transition-colors", isDelayed ? "bg-red-50/30" : isCompleted ? "bg-emerald-50/20" : "")}>
                            <td className="px-4 py-2 text-sm text-zinc-600 sticky left-0 bg-white z-10 pl-8 border-r border-zinc-100">
                              <div className="flex items-center gap-1.5 max-w-[240px]">
                                <span className={cn("shrink-0 text-xs font-mono", dept === 'SEO' ? "text-blue-400" : dept === 'Content' ? "text-orange-400" : "text-emerald-400")}>{dept}</span>
                                <span className="truncate text-zinc-700" title={task?.title}>{task?.title || 'Unknown'}</span>
                              </div>
                              <div className="text-[10px] text-zinc-400 mt-0.5 pl-0">{task?.client} · {task?.id}</div>
                            </td>
                            {dateRange.map(date => {
                              const ms = (ownerData[taskId]?.[date] as any)?.activeMs || 0;
                              const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                              return (
                                <td key={date} className={cn("px-4 py-2 text-xs text-center", isWeekend ? "bg-zinc-50/50 text-zinc-300" : ms > 0 ? "text-zinc-700 font-medium" : "text-zinc-300")}>
                                  {ms > 0 ? formatTime(ms) : '—'}
                                </td>
                              );
                            })}
                            <td className={cn("px-4 py-2 text-sm font-medium text-center", isDelayed || isOverrun ? "text-red-600 font-bold" : "text-zinc-700")}>
                              {formatTime(activeTotal)}
                            </td>
                            <td className="px-4 py-2 text-sm text-center text-purple-600">
                              {formatTime(reworkTotal) || '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-center text-blue-600 font-medium">
                              {est > 0 ? `${est}h` : '—'}
                            </td>
                            <td className="px-4 py-2 text-xs text-center">
                              {pctDone !== null ? (
                                <span className={cn("font-bold px-1.5 py-0.5 rounded",
                                  pctDone > 100 ? "bg-red-100 text-red-700" :
                                  pctDone >= 80 ? "bg-amber-100 text-amber-700" :
                                  pctDone >= 50 ? "bg-blue-100 text-blue-700" :
                                  "bg-zinc-100 text-zinc-500"
                                )}>{pctDone}%</span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">{statusBadge}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
