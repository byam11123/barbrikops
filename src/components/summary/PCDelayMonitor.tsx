import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  Clock, 
  AlertTriangle, 
  Bell, 
  MessageSquare, 
  CheckCircle2, 
  FileSpreadsheet, 
  Filter, 
  User, 
  Building2,
  Calendar
} from 'lucide-react';
import { FmsInstance, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface PCDelayMonitorProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onNudgeItem?: (module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING', targetId: string, stageIndex?: number) => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
  onSelectFlowDetail?: (flow: FmsInstance) => void;
  onLogDelayReason?: (flow: FmsInstance, stageIndex: number) => void;
  onOpenWeeklyDigest?: () => void;
}

export function parseStagePlannedDate(plannedDateTimeStr?: string): Date | null {
  if (!plannedDateTimeStr || typeof plannedDateTimeStr !== 'string') return null;
  const clean = plannedDateTimeStr.replace(',', ' ').trim();
  if (!clean || clean === '—' || clean === '-') return null;

  const dmyMatch = clean.match(/^(\d{1,2})[\s/:_.-]+(\d{1,2})[\s/:_.-]+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    if (/pm/i.test(clean) && hour < 12) hour += 12;
    if (/am/i.test(clean) && hour === 12) hour = 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(plannedDateTimeStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function calculateExactDelay(plannedDateTime?: string): { isOverdue: boolean; delayText: string; totalMinutes: number } {
  const plannedDate = parseStagePlannedDate(plannedDateTime);
  if (!plannedDate) return { isOverdue: false, delayText: '', totalMinutes: 0 };
  const now = new Date();
  const diffMs = now.getTime() - plannedDate.getTime();
  if (diffMs <= 0) return { isOverdue: false, delayText: '', totalMinutes: 0 };

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return {
    isOverdue: true,
    delayText: `+${hours}h ${mins}m`,
    totalMinutes
  };
}

export function getFlowDepartment(flow: FmsInstance): 'Store' | 'Purchase' | 'Accounts' | 'Operations' {
  const tKey = (flow.templateKey || flow.flowType || '').toUpperCase();
  const dept = ((flow as any).departmentHub || '').toUpperCase();
  if (tKey.includes('STORE') || tKey.includes('CHECK_STOCK') || dept.includes('SITE_LOGISTICS') || dept.includes('STORE')) {
    return 'Store';
  }
  if (tKey.includes('PURCHASE') || tKey.includes('INDENT_TO_PO') || tKey.includes('INDENT_PURCHASE') || dept.includes('PROCUREMENT') || dept.includes('PURCHASE')) {
    return 'Purchase';
  }
  if (tKey.includes('PAYMENT') || tKey.includes('BANK') || dept.includes('FINANCE') || dept.includes('ACCOUNTS')) {
    return 'Accounts';
  }
  return 'Operations';
}

export const PCDelayMonitor: React.FC<PCDelayMonitorProps> = ({
  flows,
  currentUser,
  onNudgeItem,
  onOpenStageAction,
  onSelectFlowDetail,
  onLogDelayReason,
  onOpenWeeklyDigest
}) => {
  const [selectedDept, setSelectedDept] = useState<'ALL' | 'Store' | 'Purchase' | 'Accounts'>('ALL');
  const [localFlows, setLocalFlows] = useState<FmsInstance[]>(flows);

  // Keep local state in sync when flows prop updates
  React.useEffect(() => {
    setLocalFlows(flows);
  }, [flows]);

  // Extract all active overdue flows and calculate exact delays
  const overdueItems = useMemo(() => {
    return localFlows
      .filter((flow) => flow.status === 'In Progress' && flow.stages && flow.stages[flow.currentStageIndex])
      .map((flow) => {
        const stage = flow.stages[flow.currentStageIndex];
        const delayInfo = calculateExactDelay(stage.plannedDateTime || stage.plannedTimestamp);
        const department = getFlowDepartment(flow);
        return {
          flow,
          stage,
          stageIndex: flow.currentStageIndex,
          department,
          ...delayInfo
        };
      })
      .filter((item) => item.isOverdue)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [localFlows]);

  // Top 3 Bottlenecks grouped by stage.assignee
  const topBottlenecks = useMemo(() => {
    const counts: Record<string, { count: number; maxDelay: string; totalMinutes: number; department: string }> = {};
    overdueItems.forEach((item) => {
      const assignee = item.stage.assignee || item.stage.whoDefaultAssignee || 'Unassigned';
      if (!counts[assignee]) {
        counts[assignee] = {
          count: 0,
          maxDelay: item.delayText,
          totalMinutes: 0,
          department: item.department
        };
      }
      counts[assignee].count += 1;
      counts[assignee].totalMinutes += item.totalMinutes;
    });

    return Object.entries(counts)
      .map(([assignee, stats]) => ({
        assignee,
        ...stats
      }))
      .sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes)
      .slice(0, 3);
  }, [overdueItems]);

  // Filtered by department
  const filteredOverdue = useMemo(() => {
    if (selectedDept === 'ALL') return overdueItems;
    return overdueItems.filter((i) => i.department === selectedDept);
  }, [overdueItems, selectedDept]);

  // Handle Nudge with count increment and persistence
  const handleNudge = (flow: FmsInstance, stageIndex: number) => {
    const nowStr = new Date().toLocaleString('en-GB');
    const updatedStages = [...flow.stages];
    const currentCount = updatedStages[stageIndex]?.nudgeCount || 0;
    
    updatedStages[stageIndex] = {
      ...updatedStages[stageIndex],
      nudgeCount: currentCount + 1,
      lastNudgeAt: nowStr,
      lastNudgeTimestamp: nowStr
    };

    const updatedFlow: FmsInstance = {
      ...flow,
      stages: updatedStages,
      updatedAt: nowStr
    };

    // Update local state and persist
    const updatedAll = localFlows.map((f) => (f.id === flow.id ? updatedFlow : f));
    setLocalFlows(updatedAll);
    storageAdapter.saveFmsFlows(updatedAll);

    // Call parent handler to dispatch notifications and audit
    if (onNudgeItem) {
      onNudgeItem('FMS', flow.id, stageIndex);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-4 rounded-2xl border border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-black shrink-0">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">Process Coordinator (PC) Delay Monitor</h3>
            <p className="text-xs text-amber-200 mt-0.5">
              Identify stage bottlenecks, track exact SLA variances, log delay reasons, and dispatch nudges across departments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenWeeklyDigest && (
            <button
              type="button"
              onClick={onOpenWeeklyDigest}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>Weekly Director Digest</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP BOTTLENECK SUMMARY (Top 3 Assignees with Delayed Tasks) */}
      <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Top 3 Bottleneck Assignees (Highest Delayed Flows)
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Total Overdue Workflows: <strong className="text-rose-600">{overdueItems.length}</strong>
          </span>
        </div>

        {topBottlenecks.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500 bg-amber-50/50 rounded-xl border border-dashed border-amber-200">
            No active bottlenecks found. All department tasks are progressing within SLA limits.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topBottlenecks.map((b, idx) => (
              <div 
                key={b.assignee}
                className="p-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-white flex items-center justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-white'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{b.assignee}</span>
                    </h5>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Dept: {b.department}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-rose-600 block">
                    {b.count} {b.count === 1 ? 'delay' : 'delays'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Top: {b.maxDelay}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DEPARTMENT FILTER & ACTIVE TASKS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-extrabold text-slate-800">
              Department Filter:
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
              {(['ALL', 'Store', 'Purchase', 'Accounts'] as const).map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDept === dept
                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dept === 'ALL' ? 'All Departments' : dept}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{filteredOverdue.length}</strong> overdue tasks
          </div>
        </div>

        {/* Task List Cards */}
        {filteredOverdue.length === 0 ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-slate-800 text-sm">
              No Overdue Workflows in {selectedDept === 'ALL' ? 'Any Department' : `${selectedDept} Department`}!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All pipeline stages are operating on schedule.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOverdue.map(({ flow, stage, stageIndex, department, delayText }) => {
              const nudgeCount = stage.nudgeCount || 0;
              const lastNudgeAt = stage.lastNudgeAt || stage.lastNudgeTimestamp;
              const lastRemark = stage.processRemarks && stage.processRemarks.length > 0 
                ? stage.processRemarks[stage.processRemarks.length - 1] 
                : null;

              return (
                <div 
                  key={`${flow.id}-${stageIndex}`}
                  className="p-4 hover:bg-amber-50/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                        Indent #{flow.indentNo || flow.requisitionNumber || flow.id}
                      </span>
                      <span className="font-black text-slate-900 text-xs">
                        Stage {stageIndex + 1}: {stage.stageName}
                      </span>
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-rose-600" /> {delayText} OVERDUE
                      </span>
                      <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                        {department}
                      </span>
                      {nudgeCount > 0 && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-600" /> Nudged {nudgeCount} {nudgeCount === 1 ? 'time' : 'times'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <strong>Assignee:</strong> {stage.assignee || 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <strong>Site:</strong> {flow.siteName || 'Raipur HQ'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <strong>Planned:</strong> {stage.plannedDateTime || '—'}
                      </span>
                    </div>

                    {/* Display Logged Reason */}
                    {lastRemark && (
                      <div className="mt-1 p-2 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-950 font-medium">
                        <strong className="font-bold text-purple-900 text-[11px] block">
                          PC Logged Reason ({lastRemark.authorName}):
                        </strong>
                        "{lastRemark.remarkText}"
                      </div>
                    )}

                    {lastNudgeAt && (
                      <div className="text-[10px] text-amber-700 italic">
                        Last follow-up issued: {lastNudgeAt}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Nudge Button */}
                    <button
                      type="button"
                      onClick={() => handleNudge(flow, stageIndex)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Send Instant Nudge"
                    >
                      <Bell className="w-3.5 h-3.5 text-amber-700" />
                      <span>{nudgeCount > 0 ? `Nudge (${nudgeCount})` : 'Nudge'}</span>
                    </button>

                    {/* Log Delay Reason Button */}
                    {onLogDelayReason && (
                      <button
                        type="button"
                        onClick={() => onLogDelayReason(flow, stageIndex)}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Log Reason</span>
                      </button>
                    )}

                    {/* Open Stage Action */}
                    {onOpenStageAction && (
                      <button
                        type="button"
                        onClick={() => onOpenStageAction(flow, stageIndex)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Execute
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
