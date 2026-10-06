import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  Download,
  Building2,
  Users,
  User,
  CheckSquare,
  ListTodo
} from 'lucide-react';
import { ChecklistItem, DelegationTask, FmsInstance, InventoryItem, UserProfile } from '../../types';
import { ViewScope } from '../layout/Header';

interface MisDashboardProps {
  flows: FmsInstance[];
  delegationTasks: DelegationTask[];
  checklistItems: ChecklistItem[];
  inventoryItems: InventoryItem[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onNavigateTab: (tab: any) => void;
}

export const MisDashboard: React.FC<MisDashboardProps> = ({
  flows,
  delegationTasks,
  checklistItems,
  inventoryItems,
  currentUser,
  viewScope,
  onToggleScope,
  onNavigateTab,
}) => {
  // Helpers for user-specific items
  const isMyChecklist = (c: ChecklistItem) => {
    return c.email.toLowerCase() === currentUser.email.toLowerCase() ||
           c.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           (currentUser.phone ? c.name.includes(currentUser.phone) : false);
  };

  const isMyDelegation = (d: DelegationTask) => {
    return d.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           d.rolePhone.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           (currentUser.phone ? d.rolePhone.includes(currentUser.phone) : false);
  };

  const isMyFmsApproval = (f: FmsInstance) => {
    const curStage = f.stages[f.currentStageIndex];
    if (!curStage) return false;
    const curName = currentUser.name.toLowerCase();
    const curRole = currentUser.role.toLowerCase();
    const assignee = curStage.assignee.toLowerCase();
    return assignee.includes(curName) || assignee.includes(curRole);
  };

  // User-scoped sets
  const myChecklists = checklistItems.filter(isMyChecklist);
  const myDelegations = delegationTasks.filter(isMyDelegation);
  const myPendingFms = flows.filter(isMyFmsApproval);

  // Active dataset depending on viewScope
  const activeChecklists = viewScope === 'USER_ONLY' ? myChecklists : checklistItems;
  const activeDelegations = viewScope === 'USER_ONLY' ? myDelegations : delegationTasks;

  const totalChecklists = activeChecklists.length;
  const completedChecklists = activeChecklists.filter((c) => c.status === 'Done').length;
  const checklistComplianceRate = totalChecklists > 0 
    ? Math.round((completedChecklists / totalChecklists) * 100) 
    : 100;

  const totalTasks = activeDelegations.length;
  const completedTasks = activeDelegations.filter((d) => d.status === 'Completed').length;
  const shiftedTasks = activeDelegations.filter((d) => d.totalRevisions > 0);
  const delegationSuccessRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 100;

  const activeFlows = flows.filter((f) => f.status === 'In Progress');
  const totalDelayHours = flows.reduce((acc, f) => acc + (f.totalDelayHours || 0), 0);

  const healthScore = Math.round(
    checklistComplianceRate * 0.4 + 
    delegationSuccessRate * 0.4 + 
    (activeFlows.length > 0 ? 88 : 95) * 0.2
  );

  const bottlenecks = (viewScope === 'USER_ONLY' ? myDelegations : delegationTasks)
    .filter((t) => t.totalRevisions >= 2)
    .map((t) => ({
      type: 'DELEGATION_REVISED',
      title: `Repeated Revisions: ${t.task}`,
      subtitle: `Assignee: ${t.name} • Revised ${t.totalRevisions} times (Latest: ${t.latestRevision})`,
      severity: 'HIGH' as const,
      actionTab: 'delegation',
    }));

  const exportSummaryCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "User Scope,Metric,Value\n" +
      `Current User,${currentUser.name},${currentUser.role}\n` +
      `Checklist,My Tasks,${myChecklists.length}\n` +
      `Checklist,My Completed,${myChecklists.filter(c => c.status === 'Done').length}\n` +
      `Delegation,My Tasks,${myDelegations.length}\n` +
      `Delegation,My Pending,${myDelegations.filter(d => d.status === 'Pending').length}\n` +
      `FMS Approvals,Awaiting Me,${myPendingFms.length}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BarBrik_MIS_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Scope banner if USER_ONLY */}
      {viewScope === 'USER_ONLY' ? (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Personal Cockpit: Showing metrics strictly for <strong>{currentUser.name}</strong> ({currentUser.role}).
            </span>
          </div>
          <button
            onClick={() => onToggleScope('ALL_ORG')}
            className="font-bold underline text-indigo-700 hover:text-indigo-900 shrink-0 ml-2"
          >
            Switch to Organization-Wide View →
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Executive Mode: Showing aggregated statistics across all staff and departments.
            </span>
          </div>
          <button
            onClick={() => onToggleScope('USER_ONLY')}
            className="font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
          >
            Focus on my individual workload →
          </button>
        </div>
      )}

      {/* Executive Welcome & Health Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              {viewScope === 'USER_ONLY' ? 'Personal Work Cockpit' : 'Organization MIS Cockpit'}
            </span>
            <span className="text-xs text-slate-400">
              {currentUser.name} ({currentUser.departmentName})
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {viewScope === 'USER_ONLY'
              ? `My Daily Queue & SLA Scorecard`
              : 'Operational Performance & SLA Overview'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {viewScope === 'USER_ONLY'
              ? `Real-time summary of tasks delegated to you, your scheduled maintenance checklists, and FMS approvals awaiting your action.`
              : 'Consolidated telemetry across 3 live Google Sheets (FMS Indents, Delegation Task Assignment, and Recurring Compliance Checklists).'}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <div className="text-right">
            <span className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">
              {viewScope === 'USER_ONLY' ? 'My Adherence' : 'Org Health'}
            </span>
            <div className="text-3xl font-black text-white">{healthScore}%</div>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center justify-end gap-1">
              <TrendingUp className="w-3 h-3" /> Optimal Performance
            </span>
          </div>
          <button
            onClick={exportSummaryCsv}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 4 Core Module Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Checklist */}
        <div
          onClick={() => onNavigateTab('checklist')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{viewScope === 'USER_ONLY' ? 'My Checklists' : 'Checklist Compliance'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-slate-900">{checklistComplianceRate}%</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              {completedChecklists}/{totalChecklists} Done
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {viewScope === 'USER_ONLY'
              ? `${myChecklists.filter(c => c.status === 'Pending').length} pending checks assigned to you.`
              : 'Weekly/monthly IT, Store & Structure checks.'}
          </p>
        </div>

        {/* Delegation */}
        <div
          onClick={() => onNavigateTab('delegation')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{viewScope === 'USER_ONLY' ? 'My Delegated Tasks' : 'Delegation (DTA)'}</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-slate-900">{completedTasks}</span>
            <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold">
              {totalTasks - completedTasks} Pending
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {viewScope === 'USER_ONLY'
              ? `${shiftedTasks.length} of your tasks revised/shifted.`
              : `${shiftedTasks.length} tasks shifted/revised with audit reason.`}
          </p>
        </div>

        {/* FMS Workflow */}
        <div
          onClick={() => onNavigateTab('fms')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{viewScope === 'USER_ONLY' ? 'My Approvals Queue' : 'FMS Requisitions'}</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-slate-900">
              {viewScope === 'USER_ONLY' ? myPendingFms.length : activeFlows.length}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
              {viewScope === 'USER_ONLY' ? 'Awaiting Your Step' : 'In 12-Stage Pipeline'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {viewScope === 'USER_ONLY'
              ? `Check your role-assigned steps in Indent FMS.`
              : `Avg SLA Delay: ${totalDelayHours} hrs across site indents.`}
          </p>
        </div>

        {/* IMS Inventory */}
        <div
          onClick={() => onNavigateTab('ims')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>IMS Store Stock</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-slate-900">{inventoryItems.length}</span>
            <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded font-semibold">
              {inventoryItems.filter((i) => i.currentStock <= i.minThreshold).length} Low Stock
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Connected to Stage 2 Degraded Scrap Return.
          </p>
        </div>
      </div>

      {/* AI Operations Digest & Process Coordination Summary */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-purple-800/40 space-y-3">
        <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">AI Executive Briefing &amp; Process Coordination Radar</h3>
              <p className="text-[11px] text-purple-200">Real-time synthesis of 100+ FMS processes, checklists, and Ritu Sahu's audit notes</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full font-bold">
            Live AI Telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-purple-200 block text-[11px]">1. High-Priority FMS Action</span>
            <p className="text-slate-200 font-medium">
              PO #1084 (JSW Steel, ₹2,45,000) is awaiting 30% advance payment approval at Stage 2.
            </p>
            <span className="text-[10px] text-purple-300 block font-mono">Process Coordinator Note: "Awaiting Director OTP"</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-amber-200 block text-[11px]">2. Site Material Dispatch</span>
            <p className="text-slate-200 font-medium">
              Indent #752 (Siladehi Site, 200 Cement Bags) stock check complete. Store dispatch pending gate pass.
            </p>
            <span className="text-[10px] text-amber-300 block font-mono">Status: Store Stock Verified</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-emerald-200 block text-[11px]">3. Plant &amp; Maintenance</span>
            <p className="text-slate-200 font-medium">
              Hydraulic Pump Repair (#REP-09) diagnosis completed by Mechanical Team. Vendor quotation approved.
            </p>
            <span className="text-[10px] text-emerald-300 block font-mono">Status: On Track (SLA 4h)</span>
          </div>
        </div>
      </div>

      {/* Active Bottlenecks & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                {viewScope === 'USER_ONLY' ? 'My Attention Items & Delays' : 'Operational Bottlenecks & Escalation Radar'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {bottlenecks.length} items flagged
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {bottlenecks.length > 0 ? (
              bottlenecks.map((b, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateTab(b.actionTab)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          b.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.severity}
                      </span>
                      <p className="text-xs font-semibold text-slate-900">{b.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-500">{b.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <span>Resolve</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active bottlenecks for {currentUser.name}. All SLAs on track!
              </div>
            )}
          </div>
        </div>

        {/* Staff Quick Action Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                My Pending Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Items</span>
          </div>

          <div className="space-y-3">
            <div 
              onClick={() => onNavigateTab('checklist')}
              className="p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-slate-700">Checklist items due</span>
              </div>
              <span className="font-bold text-slate-900">
                {myChecklists.filter((c) => c.status === 'Pending').length}
              </span>
            </div>

            <div 
              onClick={() => onNavigateTab('delegation')}
              className="p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-slate-700">Delegated tasks pending</span>
              </div>
              <span className="font-bold text-slate-900">
                {myDelegations.filter((d) => d.status === 'Pending').length}
              </span>
            </div>

            <div 
              onClick={() => onNavigateTab('fms')}
              className="p-3 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-700">FMS approvals waiting on you</span>
              </div>
              <span className="font-bold text-slate-900">
                {myPendingFms.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
