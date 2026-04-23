import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { cn, getDeptDelayedInfo } from '../utils';
import { X, ExternalLink, ChevronRight } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthChips() {
  const now = new Date();
  const chips = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chips.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, from: d.toISOString().split('T')[0].slice(0,7) + '-01', to: new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split('T')[0] });
  }
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1);
  const qEnd = new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3+3, 0);
  chips.push({ label: `Q${Math.floor(now.getMonth()/3)+1} ${now.getFullYear()}`, from: qStart.toISOString().split('T')[0], to: qEnd.toISOString().split('T')[0] });
  chips.push({ label: 'All time', from: '', to: '' });
  return chips;
}

interface PipelineModalProps {
  activeTab: string;
  onTabChange: (t: string) => void;
  onClose: () => void;
  seoTasks: Task[]; contentTasks: Task[]; webTasks: Task[]; qcTasks: Task[]; doneTasks: Task[];
}

function PipelineModal({ activeTab, onTabChange, onClose, seoTasks, contentTasks, webTasks, qcTasks, doneTasks }: PipelineModalProps) {
  const tabs = [
    { key: 'SEO', label: 'SEO', count: seoTasks.length, tasks: seoTasks, color: '#0C447C', bg: '#E6F1FB' },
    { key: 'Content', label: 'Content', count: contentTasks.length, tasks: contentTasks, color: '#633806', bg: '#FAEEDA' },
    { key: 'Web', label: 'Web', count: webTasks.length, tasks: webTasks, color: '#085041', bg: '#E1F5EE' },
    { key: 'QC', label: 'QC', count: qcTasks.length, tasks: qcTasks, color: '#3C3489', bg: '#EEEDFE' },
    { key: 'Done', label: 'Done', count: doneTasks.length, tasks: doneTasks, color: '#27500A', bg: '#EAF3DE' },
  ];
  const current = tabs.find(t => t.key === activeTab) || tabs[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-base font-semibold text-zinc-900">Task Pipeline</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={18} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-4 pt-2 gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors",
                activeTab === t.key ? "border-current" : "border-transparent text-zinc-500 hover:text-zinc-700"
              )}
              style={activeTab === t.key ? { color: t.color, borderColor: t.color } : {}}
            >
              {t.label}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: t.bg, color: t.color }}>{t.count}</span>
            </button>
          ))}
        </div>
        {/* Task list */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {current.tasks.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-sm">No tasks in this stage</div>
          ) : (
            <div className="space-y-2">
              {current.tasks.map(task => {
                const rankDiff = (task.marRank || 0) - (task.currentRank || 0);
                return (
                  <div key={task.id} className="border border-zinc-100 rounded-xl p-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 break-words">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400 font-mono">{task.id}</span>
                          <span className="text-[10px] text-zinc-400">{task.seoStage}</span>
                          {task.seoOwner && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">{task.seoOwner}</span>}
                          {task.intakeDate && <span className="text-[10px] text-zinc-400">{task.intakeDate}</span>}
                        </div>
                      </div>
                      {task.docUrl && (
                        <a href={task.docUrl} target="_blank" rel="noreferrer" className="shrink-0 text-indigo-500 hover:text-indigo-700">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {(task.focusedKw || task.currentRank || task.marRank) && (
                      <div className="mt-2 pt-2 border-t border-zinc-50 flex items-center gap-4 text-[11px] text-zinc-500 flex-wrap">
                        {task.focusedKw && <span><span className="text-zinc-300">KW:</span> {task.focusedKw}</span>}
                        {task.volume ? <span><span className="text-zinc-300">Vol:</span> {task.volume.toLocaleString()}</span> : null}
                        {task.marRank ? <span><span className="text-zinc-300">Mar:</span> {task.marRank}</span> : null}
                        {task.currentRank ? <span><span className="text-zinc-300">Cur:</span> {task.currentRank}</span> : null}
                        {rankDiff !== 0 && <span className={cn("font-bold", rankDiff > 0 ? "text-emerald-600" : "text-red-500")}>{rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`}</span>}
                        {task.remarks && <span className="text-zinc-400 truncate max-w-[200px]" title={task.remarks}>{task.remarks}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ClientView({ tasks }: { tasks: Task[] }) {
  const { adminOptions, currentUser, isAdmin } = useAppContext();

  const clients = useMemo(() => Array.from(new Set(tasks.map(t => t.client))).sort(), [tasks]);
  const [selectedClient, setSelectedClient] = useState<string>(clients[0] || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeChip, setActiveChip] = useState('All time');
  const [statusFilter, setStatusFilter] = useState('All');
  const [seoStageFilter, setSeoStageFilter] = useState('All');
  const [seoOwnerFilter, setSeoOwnerFilter] = useState(() => !isAdmin && currentUser?.role === 'seo' ? currentUser.ownerName : 'All');

  // Pipeline modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('SEO');

  const monthChips = useMemo(() => getMonthChips(), []);

  const handleChip = (chip: { label: string; from: string; to: string }) => {
    setActiveChip(chip.label);
    setDateFrom(chip.from);
    setDateTo(chip.to);
  };

  const clientTasks = useMemo(() => tasks.filter(t => {
    if (t.client !== selectedClient) return false;
    if (dateFrom && t.intakeDate < dateFrom) return false;
    if (dateTo && t.intakeDate > dateTo) return false;
    if (seoOwnerFilter !== 'All' && t.seoOwner !== seoOwnerFilter) return false;
    if (seoStageFilter !== 'All' && t.seoStage !== seoStageFilter) return false;
    if (statusFilter === 'Completed' && !t.isCompleted && t.executionState !== 'Ended') return false;
    if (statusFilter === 'In progress' && t.executionState !== 'In Progress') return false;
    if (statusFilter === 'Delayed') {
      const ad = t.currentOwner === 'SEO' ? t.intakeDate : t.currentOwner === 'Content' ? t.contentAssignedDate : t.webAssignedDate;
      const est = t.currentOwner === 'SEO' ? (t.estHoursSEO || t.estHours || 0) : t.currentOwner === 'Content' ? (t.estHoursContent || 0) : (t.estHoursWeb || 0);
      const { isDelayed } = getDeptDelayedInfo(ad || '', est, 0);
      if (!isDelayed) return false;
    }
    return true;
  }), [tasks, selectedClient, dateFrom, dateTo, seoOwnerFilter, seoStageFilter, statusFilter]);

  const total = clientTasks.length;
  const completed = clientTasks.filter(t => t.isCompleted || t.executionState === 'Ended').length;
  const inProgress = clientTasks.filter(t => t.executionState === 'In Progress').length;
  const qcPending = clientTasks.filter(t => t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC').length;
  const estHrsLeft = clientTasks.filter(t => !t.isCompleted).reduce((s, t) => s + (t.estHoursSEO || t.estHours || 0) + (t.estHoursContent || 0) + (t.estHoursWeb || 0), 0);

  const delayed = useMemo(() => clientTasks.filter(t => {
    if (t.isCompleted) return false;
    const ad = t.currentOwner === 'SEO' ? t.intakeDate : t.currentOwner === 'Content' ? t.contentAssignedDate : t.webAssignedDate;
    const est = t.currentOwner === 'SEO' ? (t.estHoursSEO || t.estHours || 0) : t.currentOwner === 'Content' ? (t.estHoursContent || 0) : (t.estHoursWeb || 0);
    return getDeptDelayedInfo(ad || '', est, 0).isDelayed;
  }), [clientTasks]);

  const healthScore = total > 0 ? Math.round(((completed - delayed.length) / total) * 100) : 0;
  const healthColor = healthScore >= 70 ? '#1D9E75' : healthScore >= 40 ? '#BA7517' : '#E24B4A';

  // Pipeline buckets
  const seoTasks = clientTasks.filter(t => !t.isCompleted && t.currentOwner === 'SEO');
  const contentTasks = clientTasks.filter(t => !t.isCompleted && t.currentOwner === 'Content');
  const webTasks = clientTasks.filter(t => !t.isCompleted && t.currentOwner === 'Web');
  const qcTasks = clientTasks.filter(t => !t.isCompleted && (t.seoQcStatus === 'Pending QC' || t.seoQcStatus === 'QC' || t.webStatus === 'Pending QC'));
  const doneTasks = clientTasks.filter(t => t.isCompleted || t.executionState === 'Ended');

  // Keyword rows (tasks with keyword data)
  const kwTasks = useMemo(() => clientTasks.filter(t => t.focusedKw || t.currentRank || t.marRank).slice(0, 8), [clientTasks]);

  // Timeline — recent time events across client tasks
  const timeline = useMemo(() => {
    const events: { date: string; text: string; owner: string; color: string; bg: string }[] = [];
    clientTasks.forEach(task => {
      (task.timeEvents || []).forEach(e => {
        const color = e.type === 'end' ? '#1D9E75' : e.type === 'rework_start' ? '#E24B4A' : e.type === 'start' ? '#185FA5' : '#7F77DD';
        const bg = e.type === 'end' ? '#E1F5EE' : e.type === 'rework_start' ? '#FCEBEB' : e.type === 'start' ? '#E6F1FB' : '#EEEDFE';
        const text = e.type === 'end' ? `Completed — ${task.title}` : e.type === 'start' ? `Started — ${task.title}` : e.type === 'rework_start' ? `Rework raised — ${task.title}` : `Paused — ${task.title}`;
        events.push({ date: e.timestamp.split('T')[0], text, owner: task.seoOwner || '', color, bg });
      });
    });
    return events.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [clientTasks]);

  // Export client CSV (client-facing only)
  const exportClientSheet = () => {
    const headers = ['Date','Task','SEO Stage','Keyword','Volume','Mar Rank','Cur Rank','Rank Change','Status','Target URL','Remarks'];
    const rows = clientTasks.map(t => {
      const diff = (t.marRank || 0) - (t.currentRank || 0);
      return [
        t.intakeDate, `"${t.title.replace(/"/g,'""')}"`, t.seoStage,
        `"${(t.focusedKw||'').replace(/"/g,'""')}"`, t.volume||'',
        t.marRank||'', t.currentRank||'',
        diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : '0',
        t.isCompleted ? 'Completed' : t.executionState || 'Not Started',
        t.targetUrl||'', `"${(t.remarks||'').replace(/"/g,'""')}"`
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClient}-report-${dateFrom || 'all'}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const period = activeChip !== 'All time' ? activeChip : 'All time';
    const kwImproved = kwTasks.filter(t => (t.marRank || 0) > (t.currentRank || 0));
    const content = `
      <html><head><style>
        body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto}
        h1{font-size:22px;margin-bottom:4px}
        .sub{color:#666;font-size:13px;margin-bottom:24px}
        .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .kpi{border:1px solid #e5e5e5;border-radius:8px;padding:12px;text-align:center}
        .kpi-label{font-size:10px;color:#888;text-transform:uppercase;margin-bottom:4px}
        .kpi-val{font-size:22px;font-weight:600}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
        th{background:#f5f5f5;padding:8px;text-align:left;border-bottom:2px solid #ddd;font-size:11px}
        td{padding:7px 8px;border-bottom:1px solid #eee}
        tr:last-child td{border-bottom:none}
        .footer{margin-top:40px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
      </style></head><body>
        <h1>${selectedClient} — SEO Report</h1>
        <div class="sub">Period: ${period} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-GB')}</div>
        <div class="kpis">
          <div class="kpi"><div class="kpi-label">Total tasks</div><div class="kpi-val">${total}</div></div>
          <div class="kpi"><div class="kpi-label">Completed</div><div class="kpi-val" style="color:#1D9E75">${completed}</div></div>
          <div class="kpi"><div class="kpi-label">In progress</div><div class="kpi-val" style="color:#185FA5">${inProgress}</div></div>
          <div class="kpi"><div class="kpi-label">Keywords improved</div><div class="kpi-val" style="color:#639922">${kwImproved.length}</div></div>
        </div>
        <h3 style="font-size:14px;margin-bottom:8px">Task Details</h3>
        <table>
          <thead><tr><th>Task</th><th>Stage</th><th>Keyword</th><th>Mar Rank</th><th>Cur Rank</th><th>Status</th></tr></thead>
          <tbody>${clientTasks.map(t => `<tr>
            <td>${t.title}</td><td>${t.seoStage||'—'}</td><td>${t.focusedKw||'—'}</td>
            <td>${t.marRank||'—'}</td><td>${t.currentRank||'—'}</td>
            <td>${t.isCompleted ? 'Completed' : t.executionState||'Not Started'}</td>
          </tr>`).join('')}</tbody>
        </table>
        <div class="footer">Generated by SEO PM Dashboard &nbsp;|&nbsp; Confidential — for ${selectedClient} only</div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(content); w.document.close(); w.print(); }
  };

  const PipeCol = ({ col, tasks: colTasks, color, bg, tab }: { col: string; tasks: Task[]; color: string; bg: string; tab: string }) => (
    <div className="flex-1 min-w-[90px] rounded-xl p-2.5" style={{ background: bg }}>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-[10px] font-medium" style={{ color }}>{col}</span>
        <span className="text-base font-bold" style={{ color }}>{colTasks.length}</span>
      </div>
      {colTasks.slice(0, 2).map(t => (
        <div key={t.id} className="text-[10px] bg-white rounded px-1.5 py-1 mb-1 truncate" style={{ color }}>
          {t.title}
        </div>
      ))}
      {colTasks.length > 2 && (
        <button
          onClick={() => { setModalTab(tab); setModalOpen(true); }}
          className="text-[10px] w-full text-center py-1 rounded flex items-center justify-center gap-0.5 hover:opacity-80 transition-opacity"
          style={{ color, background: 'rgba(255,255,255,0.6)' }}
        >
          +{colTasks.length - 2} more <ChevronRight size={10} />
        </button>
      )}
      {colTasks.length > 0 && colTasks.length <= 2 && (
        <button
          onClick={() => { setModalTab(tab); setModalOpen(true); }}
          className="text-[10px] w-full text-center py-0.5 rounded hover:opacity-80 transition-opacity"
          style={{ color, background: 'rgba(255,255,255,0.4)' }}
        >
          View all
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {modalOpen && (
        <PipelineModal
          activeTab={modalTab}
          onTabChange={setModalTab}
          onClose={() => setModalOpen(false)}
          seoTasks={seoTasks} contentTasks={contentTasks}
          webTasks={webTasks} qcTasks={qcTasks} doneTasks={doneTasks}
        />
      )}

      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {selectedClient.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 mb-1">Select client</div>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="text-sm font-semibold text-zinc-900 border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[180px]"
              >
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-xs text-zinc-400 mt-1">SEO Owner: {clientTasks[0]?.seoOwner || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-[10px] text-zinc-400 mb-0.5">Health score</p>
              <p className="text-2xl font-bold" style={{ color: healthColor }}>{Math.max(0, healthScore)}<span className="text-xs text-zinc-400">/100</span></p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{completed} completed</span>
              {delayed.length > 0 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">{delayed.length} delayed</span>}
              {qcPending > 0 && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">{qcPending} QC pending</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          {monthChips.map(chip => (
            <button key={chip.label} onClick={() => handleChip(chip)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                activeChip === chip.label ? "bg-blue-50 text-blue-800 border-blue-200 font-medium" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
              )}>{chip.label}</button>
          ))}
          <span className="text-xs text-zinc-400 mx-1">Custom:</span>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActiveChip(''); }}
            className="text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-600" />
          <span className="text-xs text-zinc-400">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActiveChip(''); }}
            className="text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-600" />
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-zinc-400 mr-1">Status:</span>
          {['All','Completed','In progress','Delayed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                statusFilter === s ? "bg-blue-50 text-blue-800 border-blue-200 font-medium" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
              )}>{s}</button>
          ))}
          <span className="text-[10px] text-zinc-400 mx-2">Stage:</span>
          <select value={seoStageFilter} onChange={e => setSeoStageFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-600">
            <option value="All">All stages</option>
            {adminOptions.seoStages.map(s => <option key={s}>{s}</option>)}
          </select>
          {!(!isAdmin && currentUser?.role === 'seo') && (
            <select value={seoOwnerFilter} onChange={e => setSeoOwnerFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-600">
              <option value="All">All owners</option>
              {adminOptions.seoOwners.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: total, color: undefined },
          { label: 'Completed', value: completed, color: '#1D9E75', sub: total > 0 ? `${Math.round(completed/total*100)}%` : '0%' },
          { label: 'In progress', value: inProgress, color: '#185FA5' },
          { label: 'Delayed', value: delayed.length, color: delayed.length > 0 ? '#A32D2D' : undefined },
          { label: 'Est hrs left', value: `${Math.round(estHrsLeft)}h`, color: undefined },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-xl p-3 text-center shadow-sm">
            <p className="text-[10px] text-zinc-400 uppercase font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            {sub && <div className="mt-0.5 h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: sub }} /></div>}
            {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Task pipeline</p>
          <button onClick={() => setModalOpen(true)} className="text-xs text-blue-600 hover:underline">View all tasks</button>
        </div>
        <div className="flex gap-2 items-stretch">
          <PipeCol col="SEO" tasks={seoTasks} color="#0C447C" bg="#E6F1FB" tab="SEO" />
          <div className="flex items-center text-zinc-300 text-sm">›</div>
          <PipeCol col="Content" tasks={contentTasks} color="#633806" bg="#FAEEDA" tab="Content" />
          <div className="flex items-center text-zinc-300 text-sm">›</div>
          <PipeCol col="Web" tasks={webTasks} color="#085041" bg="#E1F5EE" tab="Web" />
          <div className="flex items-center text-zinc-300 text-sm">›</div>
          <PipeCol col="QC" tasks={qcTasks} color="#3C3489" bg="#EEEDFE" tab="QC" />
          <div className="flex items-center text-zinc-300 text-sm">›</div>
          <div className="flex-1 min-w-[90px] rounded-xl p-2.5 bg-emerald-50">
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[10px] font-medium text-emerald-800">Done</span>
              <span className="text-base font-bold text-emerald-800">{doneTasks.length}</span>
            </div>
            <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: total > 0 ? `${Math.round(doneTasks.length/total*100)}%` : '0%' }} />
            </div>
            <p className="text-[10px] text-emerald-600">{total > 0 ? Math.round(doneTasks.length/total*100) : 0}% complete</p>
            {doneTasks.length > 0 && (
              <button onClick={() => { setModalTab('Done'); setModalOpen(true); }}
                className="text-[10px] w-full text-center py-0.5 mt-1 rounded hover:opacity-80 text-emerald-700"
                style={{ background: 'rgba(255,255,255,0.5)' }}>View all</button>
            )}
          </div>
        </div>
      </div>

      {/* Keyword tracker */}
      {kwTasks.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Keyword rank tracker</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-zinc-400 border-b border-zinc-100">
                  <th className="text-left pb-2 font-medium">Keyword</th>
                  <th className="text-left pb-2 font-medium">Target URL</th>
                  <th className="text-center pb-2 font-medium w-16">Volume</th>
                  <th className="text-center pb-2 font-medium w-16">Mar rank</th>
                  <th className="text-center pb-2 font-medium w-16">Cur rank</th>
                  <th className="text-center pb-2 font-medium w-20">Movement</th>
                </tr>
              </thead>
              <tbody>
                {kwTasks.map(t => {
                  const diff = (t.marRank || 0) - (t.currentRank || 0);
                  return (
                    <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50">
                      <td className="py-2 font-medium text-zinc-800 max-w-[200px] truncate" title={t.focusedKw}>{t.focusedKw || '—'}</td>
                      <td className="py-2 text-zinc-400 max-w-[140px] truncate text-[10px]" title={t.targetUrl}>{t.targetUrl || '—'}</td>
                      <td className="py-2 text-center text-zinc-600">{t.volume?.toLocaleString() || '—'}</td>
                      <td className="py-2 text-center text-zinc-600">{t.marRank || '—'}</td>
                      <td className="py-2 text-center text-zinc-600">{t.currentRank || '—'}</td>
                      <td className="py-2 text-center">
                        {diff > 0 ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">▲ {diff}</span>
                          : diff < 0 ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-800">▼ {Math.abs(diff)}</span>
                          : t.currentRank ? <span className="text-[10px] text-zinc-400">— no change</span>
                          : <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800">New</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Activity timeline</p>
          {timeline.map((e, i) => (
            <div key={i} className={cn("flex gap-3 py-2", i < timeline.length - 1 && "border-b border-zinc-50")}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: e.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-800 truncate">{e.text}</p>
                  <p className="text-[10px] text-zinc-400 shrink-0">{e.date}</p>
                </div>
                {e.owner && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: e.bg, color: e.color }}>{e.owner}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-3">Export client report — {activeChip || 'custom period'}</p>
        <div className="bg-zinc-50 rounded-lg p-3 mb-4 text-xs text-zinc-600 leading-relaxed font-mono">
          Hi {selectedClient} team,{'\n\n'}
          SEO Update — {activeChip || 'Selected period'}:{'\n'}
          Completed: {completed} tasks | In Progress: {inProgress} | QC Pending: {qcPending}{'\n'}
          {kwTasks.filter(t => (t.marRank||0) > (t.currentRank||0)).length > 0 && `Keywords improving: ${kwTasks.filter(t=>(t.marRank||0)>(t.currentRank||0)).map(t=>t.focusedKw).join(', ')}`}
          {delayed.length > 0 && `\nDelayed tasks: ${delayed.length} (being prioritised)`}{'\n\n'}
          Regards, {clientTasks[0]?.seoOwner || 'SEO Team'}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-zinc-400 mr-1">Export as:</span>
          <button onClick={exportClientSheet}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            Google Sheet (CSV)
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border text-red-800 border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Download PDF
          </button>
          <span className="text-[10px] text-zinc-400">Client report hides: owners, hours, time logs, doc URLs</span>
        </div>
      </div>
    </div>
  );
}
