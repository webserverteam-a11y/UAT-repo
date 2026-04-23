import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getDeptDelayedInfo } from '../utils';
import { cn } from '../utils';

const roleColor: Record<string, string> = {
  admin: '#A32D2D', seo: '#185FA5', content: '#BA7517', web: '#1D9E75',
};
const roleBg: Record<string, string> = {
  admin: '#FCEBEB', seo: '#E6F1FB', content: '#FAEEDA', web: '#E1F5EE',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold leading-none mb-1.5" style={{ color: color || 'var(--color-text-primary)' }}>{value}</p>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ color, background: bg }}>{label}</span>;
}

export function Dashboard() {
  const { tasks, adminOptions, currentUser, isAdmin } = useAppContext();

  // Filter tasks by current user if not admin
  const myTasks = useMemo(() => {
    if (!currentUser || isAdmin) return tasks;
    if (currentUser.role === 'seo') return tasks.filter(t => t.seoOwner === currentUser.ownerName);
    if (currentUser.role === 'content') return tasks.filter(t => t.contentOwner === currentUser.ownerName);
    if (currentUser.role === 'web') return tasks.filter(t => t.webOwner === currentUser.ownerName);
    return tasks;
  }, [tasks, currentUser, isAdmin]);

  const todayStr = new Date().toISOString().split('T')[0];

  // KPIs
  const total = myTasks.length;
  const completed = myTasks.filter(t => t.isCompleted || t.executionState === 'Ended').length;
  const inProgress = myTasks.filter(t => t.executionState === 'In Progress').length;
  const rework = myTasks.filter(t => t.executionState === 'Rework').length;
  const paused = myTasks.filter(t => t.executionState === 'Paused').length;
  const qcPending = myTasks.filter(t => t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC' || t.webStatus === 'Pending QC').length;

  const delayedTasks = useMemo(() => myTasks.filter(t => {
    if (t.isCompleted || t.executionState === 'Ended') return false;
    const assignedDate = t.currentOwner === 'SEO' ? t.intakeDate : t.currentOwner === 'Content' ? t.contentAssignedDate : t.webAssignedDate;
    const est = t.currentOwner === 'SEO' ? (t.estHoursSEO || t.estHours || 0) : t.currentOwner === 'Content' ? (t.estHoursContent || 0) : (t.estHoursWeb || 0);
    const { isDelayed } = getDeptDelayedInfo(assignedDate || '', est, 0);
    return isDelayed;
  }), [myTasks]);

  // Stage distribution
  const byStage = useMemo(() => {
    const counts: Record<string, number> = {};
    myTasks.filter(t => !t.isCompleted).forEach(t => {
      counts[t.seoStage] = (counts[t.seoStage] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [myTasks]);
  const maxStage = byStage[0]?.[1] || 1;

  // Dept split
  const withSEO = myTasks.filter(t => !t.isCompleted && t.currentOwner === 'SEO').length;
  const withContent = myTasks.filter(t => !t.isCompleted && t.currentOwner === 'Content').length;
  const withWeb = myTasks.filter(t => !t.isCompleted && t.currentOwner === 'Web').length;
  const deptTotal = withSEO + withContent + withWeb || 1;

  // Owner workload (today's assigned est hours)
  const TARGET = 8;
  const seoOwners = adminOptions.seoOwners;
  const contentOwners = adminOptions.contentOwners;
  const webOwners = adminOptions.webOwners;

  const ownerWorkload = useMemo(() => {
    const allOwners = [
      ...seoOwners.map(n => ({ name: n, role: 'seo' as const })),
      ...contentOwners.map(n => ({ name: n, role: 'content' as const })),
      ...webOwners.map(n => ({ name: n, role: 'web' as const })),
    ];
    return allOwners.map(({ name, role }) => {
      let assigned = 0;
      tasks.forEach(t => {
        if (role === 'seo' && t.seoOwner === name && t.intakeDate === todayStr)
          assigned += (t.estHoursSEO || t.estHours || 0);
        if (role === 'content' && t.contentOwner === name && t.contentAssignedDate === todayStr)
          assigned += (t.estHoursContent || 0);
        if (role === 'web' && t.webOwner === name && t.webAssignedDate === todayStr)
          assigned += (t.estHoursWeb || 0);
      });
      const gap = Math.max(0, TARGET - assigned);
      return { name, role, assigned, gap, pct: Math.min(100, (assigned / TARGET) * 100) };
    }).filter(o => isAdmin || o.name === currentUser?.ownerName);
  }, [tasks, seoOwners, contentOwners, webOwners, todayStr, isAdmin, currentUser]);

  // Client summary
  const clientSummary = useMemo(() => {
    const map: Record<string, { seo: number; content: number; web: number; done: number }> = {};
    myTasks.forEach(t => {
      if (!map[t.client]) map[t.client] = { seo: 0, content: 0, web: 0, done: 0 };
      if (t.isCompleted) { map[t.client].done++; return; }
      if (t.currentOwner === 'SEO') map[t.client].seo++;
      else if (t.currentOwner === 'Content') map[t.client].content++;
      else if (t.currentOwner === 'Web') map[t.client].web++;
    });
    return Object.entries(map)
      .map(([client, v]) => ({ client, ...v, open: v.seo + v.content + v.web }))
      .sort((a, b) => b.open - a.open)
      .slice(0, 6);
  }, [myTasks]);

  // Weekly completions (last 7 days)
  const weeklyCompletions = useMemo(() => {
    const days: { label: string; date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
      const count = myTasks.filter(t => (t.isCompleted || t.executionState === 'Ended') && t.intakeDate === dateStr).length;
      days.push({ label, date: dateStr, count });
    }
    return days;
  }, [myTasks]);
  const maxWeekly = Math.max(...weeklyCompletions.map(d => d.count), 1);

  const ownerBarColor: Record<string, string> = { seo: '#185FA5', content: '#BA7517', web: '#1D9E75' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800">Dashboard</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isAdmin ? 'All owners · all clients' : `Showing data for ${currentUser?.name}`}
          </p>
        </div>
        <div className="text-xs text-zinc-400">{todayStr}</div>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total tasks" value={total} sub={`${completed} completed`} />
        <StatCard label="In progress" value={inProgress} color="#185FA5"
          sub={<div className="flex gap-1 flex-wrap mt-0.5">
            {paused > 0 && <Badge label={`${paused} paused`} color="#633806" bg="#FAEEDA" />}
            {rework > 0 && <Badge label={`${rework} rework`} color="#3C3489" bg="#EEEDFE" />}
          </div>} />
        <StatCard label="Completed" value={completed} color="#1D9E75"
          sub={total > 0 ? `${Math.round(completed / total * 100)}% of total` : '—'} />
        <StatCard label="Delayed" value={delayedTasks.length} color={delayedTasks.length > 0 ? '#A32D2D' : '#444441'}
          sub={delayedTasks.length > 0 ? <Badge label="Needs attention" color="#791F1F" bg="#FCEBEB" /> : 'None — great!'} />
        <StatCard label="QC pending" value={qcPending} color={qcPending > 0 ? '#085041' : '#444441'}
          sub={qcPending > 0 ? <Badge label="Awaiting review" color="#085041" bg="#E1F5EE" /> : 'All clear'} />
        <StatCard label="Open tasks" value={withSEO + withContent + withWeb}
          sub={<div className="flex gap-1 flex-wrap mt-0.5">
            <Badge label={`${withSEO} SEO`} color="#0C447C" bg="#E6F1FB" />
            <Badge label={`${withContent} Con`} color="#633806" bg="#FAEEDA" />
            <Badge label={`${withWeb} Web`} color="#085041" bg="#E1F5EE" />
          </div>} />
      </div>

      {/* ── Row 2: Workload + Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Owner workload */}
        <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Owner workload — today vs 8h target</p>
          {ownerWorkload.length === 0 && (
            <p className="text-sm text-zinc-400 italic">No tasks assigned today.</p>
          )}
          {ownerWorkload.map(o => (
            <div key={o.name} className="flex items-center gap-3 mb-3 last:mb-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: roleBg[o.role], color: roleColor[o.role] }}>
                {o.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-zinc-800">{o.name}</span>
                  <span className="text-[10px]" style={{ color: o.gap === 0 ? '#1D9E75' : o.assigned < 4 ? '#A32D2D' : '#BA7517' }}>
                    {o.assigned}h assigned
                    {o.gap > 0 && ` · ${o.gap.toFixed(1)}h free`}
                    {o.gap === 0 && ' · Full'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MiniBar value={o.assigned} max={TARGET} color={o.gap === 0 ? '#1D9E75' : o.assigned < 4 ? '#E24B4A' : '#BA7517'} />
                  <span className="text-[10px] text-zinc-400 w-7 text-right">{Math.round(o.pct)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stage distribution */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Tasks by stage</p>
          {byStage.length === 0 && <p className="text-sm text-zinc-400 italic">No open tasks.</p>}
          {byStage.map(([stage, count]) => (
            <div key={stage} className="flex items-center gap-2 mb-2 last:mb-0">
              <span className="text-[11px] text-zinc-500 w-16 shrink-0 truncate text-right">{stage}</span>
              <MiniBar value={count} max={maxStage} color="#185FA5" />
              <span className="text-[11px] text-zinc-500 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Client table + Delayed list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Client summary */}
        <div className="lg:col-span-3 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm overflow-hidden">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Top clients by open tasks</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-zinc-400 border-b border-zinc-100">
                  <th className="text-left pb-2 font-medium">Client</th>
                  <th className="text-center pb-2 font-medium w-12">SEO</th>
                  <th className="text-center pb-2 font-medium w-12">Content</th>
                  <th className="text-center pb-2 font-medium w-12">Web</th>
                  <th className="text-center pb-2 font-medium w-12">Done</th>
                </tr>
              </thead>
              <tbody>
                {clientSummary.map(({ client, seo, content, web, done }) => (
                  <tr key={client} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="py-2 font-medium text-zinc-800">{client}</td>
                    <td className="py-2 text-center">{seo > 0 ? <Badge label={String(seo)} color="#0C447C" bg="#E6F1FB" /> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-2 text-center">{content > 0 ? <Badge label={String(content)} color="#633806" bg="#FAEEDA" /> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-2 text-center">{web > 0 ? <Badge label={String(web)} color="#085041" bg="#E1F5EE" /> : <span className="text-zinc-300">—</span>}</td>
                    <td className="py-2 text-center">{done > 0 ? <Badge label={String(done)} color="#27500A" bg="#EAF3DE" /> : <span className="text-zinc-300">—</span>}</td>
                  </tr>
                ))}
                {clientSummary.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-zinc-400 italic">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delayed tasks */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Delayed right now {delayedTasks.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">{delayedTasks.length}</span>}
          </p>
          {delayedTasks.length === 0 && (
            <div className="text-center py-4">
              <p className="text-2xl mb-1">✓</p>
              <p className="text-sm text-zinc-400">No delayed tasks</p>
            </div>
          )}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {delayedTasks.slice(0, 8).map(task => {
              const dept = task.currentOwner === 'SEO' ? 'SEO' : task.currentOwner === 'Content' ? 'Content' : 'Web';
              const assignedDate = dept === 'SEO' ? task.intakeDate : dept === 'Content' ? task.contentAssignedDate : task.webAssignedDate;
              const est = dept === 'SEO' ? (task.estHoursSEO || task.estHours || 0) : dept === 'Content' ? task.estHoursContent : task.estHoursWeb;
              const { reason } = getDeptDelayedInfo(assignedDate || '', est || 0, 0);
              return (
                <div key={task.id} className="flex items-start justify-between gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-800 truncate">{task.title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{task.client} · {task.seoOwner}</p>
                  </div>
                  <Badge
                    label={reason === 'calendar' ? 'Date' : reason === 'overrun' ? 'Hours' : 'Both'}
                    color="#791F1F" bg="#FCEBEB"
                  />
                </div>
              );
            })}
            {delayedTasks.length > 8 && (
              <p className="text-[10px] text-zinc-400 text-center">+{delayedTasks.length - 8} more — check Action Board</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Dept split + QC list + Weekly bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Dept split */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Open tasks by dept</p>
          <div className="flex justify-around mb-3">
            {[{ label: 'SEO', count: withSEO, color: '#185FA5', bg: '#E6F1FB' },
              { label: 'Content', count: withContent, color: '#BA7517', bg: '#FAEEDA' },
              { label: 'Web', count: withWeb, color: '#1D9E75', bg: '#E1F5EE' }].map(({ label, count, color, bg }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold" style={{ color }}>{count}</div>
                <Badge label={label} color={color} bg={bg} />
              </div>
            ))}
          </div>
          {/* Proportional bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="rounded-l-full transition-all" style={{ flex: withSEO, background: '#185FA5' }} />
            <div className="transition-all" style={{ flex: withContent, background: '#BA7517' }} />
            <div className="rounded-r-full transition-all" style={{ flex: withWeb, background: '#1D9E75' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-zinc-400">
            <span>{deptTotal > 0 ? Math.round(withSEO / deptTotal * 100) : 0}%</span>
            <span>{deptTotal > 0 ? Math.round(withContent / deptTotal * 100) : 0}%</span>
            <span>{deptTotal > 0 ? Math.round(withWeb / deptTotal * 100) : 0}%</span>
          </div>
        </div>

        {/* QC needing action */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">QC needing action</p>
          {qcPending === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-400">All clear</p>
            </div>
          )}
          <div className="space-y-2">
            {myTasks.filter(t => t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC' || t.webStatus === 'Pending QC').slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center justify-between gap-2 p-2 bg-teal-50 border border-teal-100 rounded-lg">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-zinc-800 truncate">{task.title}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{task.client}</p>
                </div>
                <Badge
                  label={task.seoQcStatus === 'Pending QC' || task.seoQcStatus === 'QC' ? 'SEO QC' : 'Web QC'}
                  color="#085041" bg="#E1F5EE"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Weekly completions bar */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Completions — last 7 days</p>
          <div className="flex items-end gap-1.5 h-16">
            {weeklyCompletions.map((day, i) => {
              const isToday = day.date === todayStr;
              const barH = maxWeekly > 0 ? Math.max(4, (day.count / maxWeekly) * 56) : 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {day.count > 0 && <span className="text-[9px] text-zinc-400">{day.count}</span>}
                  <div className="w-full rounded-t transition-all" style={{ height: `${barH}px`, background: isToday ? '#185FA5' : '#D3D1C7' }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {weeklyCompletions.map((day, i) => (
              <div key={i} className="flex-1 text-center text-[9px]" style={{ color: day.date === todayStr ? '#185FA5' : 'var(--color-text-tertiary)' }}>
                {day.label}
              </div>
            ))}
          </div>
          {(() => {
            const best = [...weeklyCompletions].sort((a, b) => b.count - a.count)[0];
            return best?.count > 0 ? (
              <p className="text-[10px] text-zinc-400 mt-2">
                Best: <span className="font-medium text-zinc-600">{new Date(best.date).toLocaleDateString('en-US', { weekday: 'short' })} — {best.count} tasks</span>
              </p>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}
