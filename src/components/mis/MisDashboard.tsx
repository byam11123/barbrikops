import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
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
  ListTodo,
  Trophy,
  Award,
  Calendar,
  Filter,
  Percent,
  Minus,
  Target,
  Send,
  Bookmark
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
  usersList?: UserProfile[];
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
  usersList,
}) => {
  // Month & Department State Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Helper to extract month key 'YYYY-MM' from dates formatted like 'DD/MM/YYYY', 'YYYY-MM-DD', etc.
  const extractMonthKey = (d?: string): string => {
    if (!d) return '';
    const match = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}`;
    }
    const matchIso = d.match(/(\d{4})-(\d{1,2})/);
    if (matchIso) {
      return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}`;
    }
    return '';
  };

  // Extract all distinct available months from tasks and checklists
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const addDate = (d?: string) => {
      const k = extractMonthKey(d);
      if (k) set.add(k);
    };
    delegationTasks.forEach((t) => {
      addDate(t.firstDate);
      addDate(t.latestRevision);
      addDate(t.completedAt);
    });
    checklistItems.forEach((c) => {
      addDate(c.plannedDate);
      addDate(c.actualDate);
      addDate(c.createdAt);
    });
    const sorted = Array.from(set).sort().reverse();
    return sorted.length > 0 ? sorted : ['2026-10'];
  }, [delegationTasks, checklistItems]);

  const formatMonthLabel = (mKey: string) => {
    if (mKey === 'ALL') return 'All Months (Cumulative)';
    const [year, month] = mKey.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // Extract unique departments from usersList
  const departments = useMemo(() => {
    const depts = new Set<string>();
    (usersList || []).forEach((u) => {
      if (u.departmentName) depts.add(u.departmentName);
    });
    return Array.from(depts).sort();
  }, [usersList]);

  const itemMatchesMonth = (dateStr?: string, targetMonth: string = selectedMonth) => {
    if (targetMonth === 'ALL') return true;
    return extractMonthKey(dateStr) === targetMonth;
  };

  const isUserChecklist = (c: ChecklistItem, u: UserProfile) => {
    const userEmail = (u.email || '').toLowerCase().trim();
    const userName = (u.name || '').toLowerCase().trim();
    const userPhone = (u.phone || '').trim();
    const cEmail = (c.email || '').toLowerCase().trim();
    const cName = (c.name || '').toLowerCase().trim();

    return (userEmail && cEmail === userEmail) ||
           (userName && cName.includes(userName)) ||
           (userPhone && cName.includes(userPhone));
  };

  const isUserDelegation = (d: DelegationTask, u: UserProfile) => {
    const userName = (u.name || '').toLowerCase().trim();
    const userPhone = (u.phone || '').trim();
    const dName = (d.name || '').toLowerCase().trim();
    const dRolePhone = (d.rolePhone || '').toLowerCase().trim();

    return (userName && (dName.includes(userName) || dRolePhone.includes(userName))) ||
           (userPhone && dRolePhone.includes(userPhone));
  };

  const getPreviousMonthKey = (currentMKey: string): string | null => {
    if (currentMKey === 'ALL') return null;
    const [yearStr, monthStr] = currentMKey.split('-');
    let y = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  };

  // Staff Monthly Rankings calculation across all staff
  const staffRankings = useMemo(() => {
    const staff = (usersList && usersList.length > 0) ? usersList : [currentUser];
    const prevMonthKey = getPreviousMonthKey(selectedMonth);

    // Filter tasks for selected month
    const curMonthChecklists = checklistItems.filter((c) => itemMatchesMonth(c.plannedDate || c.createdAt, selectedMonth));
    const curMonthDelegations = delegationTasks.filter((d) => itemMatchesMonth(d.firstDate || d.latestRevision || d.completedAt, selectedMonth));

    // Filter tasks for previous month
    const prevMonthChecklists = prevMonthKey ? checklistItems.filter((c) => itemMatchesMonth(c.plannedDate || c.createdAt, prevMonthKey)) : [];
    const prevMonthDelegations = prevMonthKey ? delegationTasks.filter((d) => itemMatchesMonth(d.firstDate || d.latestRevision || d.completedAt, prevMonthKey)) : [];

    const computed = staff.map((u) => {
      // Current Month
      const uCheck = curMonthChecklists.filter((c) => isUserChecklist(c, u));
      const uDeleg = curMonthDelegations.filter((d) => isUserDelegation(d, u));
      const totalCount = uCheck.length + uDeleg.length;
      
      const compCheck = uCheck.filter((c) => c.status === 'Done').length;
      const compDeleg = uDeleg.filter((d) => d.status === 'Completed').length;
      const completedCount = compCheck + compDeleg;
      const pendingCount = totalCount - completedCount;

      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

      // On-time SLA rate: completed with 0 revisions / on-time planned date
      const onTimeDeleg = uDeleg.filter((d) => d.status === 'Completed' && d.totalRevisions === 0).length;
      const onTimeCheck = uCheck.filter((c) => c.status === 'Done' && (!c.actualDate || !c.plannedDate || c.actualDate <= c.plannedDate)).length;
      const totalOnTime = onTimeDeleg + onTimeCheck;
      const onTimeRate = completedCount > 0 ? Math.round((totalOnTime / completedCount) * 100) : 100;

      // Composite MIS score: 60% completion rate + 40% on-time adherence
      const misScore = totalCount > 0
        ? Math.round(completionRate * 0.6 + onTimeRate * 0.4)
        : 92;

      // Previous Month for Trend
      let trendDiff = 0;
      if (prevMonthKey) {
        const uPrevCheck = prevMonthChecklists.filter((c) => isUserChecklist(c, u));
        const uPrevDeleg = prevMonthDelegations.filter((d) => isUserDelegation(d, u));
        const prevTotal = uPrevCheck.length + uPrevDeleg.length;
        if (prevTotal > 0) {
          const prevComp = uPrevCheck.filter((c) => c.status === 'Done').length + uPrevDeleg.filter((d) => d.status === 'Completed').length;
          const prevRate = Math.round((prevComp / prevTotal) * 100);
          trendDiff = completionRate - prevRate;
        }
      }

      return {
        user: u,
        totalCount,
        completedCount,
        pendingCount,
        completionRate,
        onTimeCount: totalOnTime,
        onTimeRate,
        misScore,
        trendDiff,
        departmentName: u.departmentName || 'Operations',
      };
    });

    // Sort overall by MIS score desc, then completedCount desc, then completionRate desc
    computed.sort((a, b) => {
      if (b.misScore !== a.misScore) return b.misScore - a.misScore;
      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
      return b.completionRate - a.completionRate;
    });

    const withOverallRank = computed.map((item, idx) => ({
      ...item,
      overallRank: idx + 1,
    }));

    // Group by department to calculate department rank
    const deptGroups: Record<string, typeof withOverallRank> = {};
    withOverallRank.forEach((item) => {
      const dept = item.departmentName;
      if (!deptGroups[dept]) deptGroups[dept] = [];
      deptGroups[dept].push(item);
    });

    const finalRanks = withOverallRank.map((item) => {
      const deptList = deptGroups[item.departmentName] || [];
      const deptRank = deptList.findIndex((d) => d.user.userId === item.user.userId) + 1;
      return {
        ...item,
        departmentRank: deptRank || 1,
        totalInDept: deptList.length,
        totalInOrg: withOverallRank.length,
      };
    });

    return finalRanks;
  }, [usersList, currentUser, delegationTasks, checklistItems, selectedMonth]);

  // Current User's Specific Metrics & Ranking
  const currentUserMetrics = useMemo(() => {
    const found = staffRankings.find((s) => s.user.userId === currentUser.userId);
    if (found) return found;
    return {
      user: currentUser,
      totalCount: 0,
      completedCount: 0,
      pendingCount: 0,
      completionRate: 100,
      onTimeCount: 0,
      onTimeRate: 100,
      misScore: 95,
      trendDiff: 0,
      departmentName: currentUser.departmentName || 'Operations',
      overallRank: 1,
      departmentRank: 1,
      totalInDept: 1,
      totalInOrg: staffRankings.length || 1,
    };
  }, [staffRankings, currentUser]);

  // Filtered leaderboard table according to selectedDepartment
  const filteredLeaderboard = useMemo(() => {
    if (selectedDepartment === 'ALL') return staffRankings;
    return staffRankings.filter((s) => s.departmentName === selectedDepartment);
  }, [staffRankings, selectedDepartment]);

  // Helpers for user-specific items (all-time)
  const isMyChecklist = (c: ChecklistItem) => isUserChecklist(c, currentUser);
  const isMyDelegation = (d: DelegationTask) => isUserDelegation(d, currentUser);

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
      `Selected Month,${formatMonthLabel(selectedMonth)},-\n` +
      `Monthly MIS Score,${currentUserMetrics.misScore}%,-\n` +
      `Task Completion Rate,${currentUserMetrics.completionRate}%,-\n` +
      `Department Rank,Rank #${currentUserMetrics.departmentRank} of ${currentUserMetrics.totalInDept},${currentUserMetrics.departmentName}\n` +
      `Company Rank,Rank #${currentUserMetrics.overallRank} of ${currentUserMetrics.totalInOrg},Overall\n` +
      `Monthly Completed,${currentUserMetrics.completedCount},Items\n` +
      `Monthly Pending,${currentUserMetrics.pendingCount},Items\n` +
      `Checklist,My Tasks,${myChecklists.length}\n` +
      `Checklist,My Completed,${myChecklists.filter(c => c.status === 'Done').length}\n` +
      `Delegation,My Tasks,${myDelegations.length}\n` +
      `Delegation,My Pending,${myDelegations.filter(d => d.status === 'Pending').length}\n` +
      `FMS Approvals,Awaiting Me,${myPendingFms.length}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BarBrik_MIS_${currentUser.name.replace(/\s+/g, '_')}_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // User's monthly checklists and delegations for Employee Profile sub-cards
  const userMonthChecklists = useMemo(() => {
    return checklistItems.filter((c) => isUserChecklist(c, currentUser) && itemMatchesMonth(c.plannedDate || c.createdAt, selectedMonth));
  }, [checklistItems, currentUser, selectedMonth]);

  const userMonthDelegations = useMemo(() => {
    return delegationTasks.filter((d) => isUserDelegation(d, currentUser) && itemMatchesMonth(d.firstDate || d.latestRevision || d.completedAt, selectedMonth));
  }, [delegationTasks, currentUser, selectedMonth]);

  const userChecklistTotal = userMonthChecklists.length || (myChecklists.length > 0 ? myChecklists.length : 1);
  const userChecklistCompleted = userMonthChecklists.length > 0 
    ? userMonthChecklists.filter(c => c.status === 'Done').length 
    : myChecklists.filter(c => c.status === 'Done').length;

  const userDelegTotal = userMonthDelegations.length || (myDelegations.length > 0 ? myDelegations.length : 1);
  const userDelegCompleted = userMonthDelegations.length > 0
    ? userMonthDelegations.filter(d => d.status === 'Completed').length
    : myDelegations.filter(d => d.status === 'Completed').length;

  // Circular gauge calculations
  const gaugeRadius = 42;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (gaugeCircumference * Math.min(100, Math.max(0, currentUserMetrics.misScore))) / 100;

  return (
    <div className="space-y-6">
      {/* Top Header Bar with Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Dashboard &amp; Scoreboard</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live MIS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational indices, task completion velocity, and departmental standings
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => onToggleScope('USER_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewScope === 'USER_ONLY'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Cockpit
            </button>
            <button
              onClick={() => onToggleScope('ALL_ORG')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewScope === 'ALL_ORG'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Organization
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              aria-label="Filter by Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 cursor-pointer focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
              <option value="ALL">All Months</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              aria-label="Filter by Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 cursor-pointer focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Export Report Button */}
          <button
            onClick={exportSummaryCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Download MIS CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* TOP ROW: 3 EXECUTIVE CARDS (Inspired by Reference UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD 1: MIS Score (Overall performance index) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">MIS Score</h2>
              <p className="text-[11px] text-slate-500">Overall performance index</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>

          {/* Circular Gauge Center */}
          <div className="my-5 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={gaugeRadius}
                  stroke={
                    currentUserMetrics.misScore >= 80 
                      ? '#10b981' 
                      : currentUserMetrics.misScore >= 50 
                      ? '#f59e0b' 
                      : '#ef4444'
                  }
                  strokeWidth="8"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Number Inside Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={`text-3xl font-black ${
                  currentUserMetrics.misScore >= 80 
                    ? 'text-slate-900' 
                    : currentUserMetrics.misScore >= 50 
                    ? 'text-amber-600' 
                    : 'text-rose-600'
                }`}>
                  {currentUserMetrics.misScore}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  out of 100
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic mt-3 text-center">
              "Excellence is not an act, but a habit."
            </p>
          </div>

          {/* Bottom 3-Column Stats */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div>
              <div className="text-sm font-black text-slate-900">
                #{currentUserMetrics.overallRank}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rank</span>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 truncate px-1">
                {currentUserMetrics.departmentName}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dept</span>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">
                {selectedMonth === 'ALL' ? 'All' : formatMonthLabel(selectedMonth).slice(0, 4)}
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Month</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Employee Profile (Personal & employment details) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Employee Profile</h2>
                <p className="text-[11px] text-slate-500">Personal &amp; employment details</p>
              </div>
            </div>

            {/* Profile Header */}
            <div className="mt-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black flex items-center justify-center text-lg shadow-2xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-slate-900">{currentUser.name}</span>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 uppercase border border-slate-200">
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span>{currentUser.departmentName || 'Operations'}</span>
                </div>
              </div>
            </div>

            {/* Metadata Pills */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">JOINED</span>
                <span className="text-[11px] font-bold text-slate-800 truncate block">23 Sept 2026</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">DEPARTMENT</span>
                <span className="text-[11px] font-bold text-slate-800 truncate block">{currentUser.departmentName || 'Operations'}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">STAFF ID</span>
                <span className="text-[11px] font-bold text-slate-800 truncate block">{currentUser.userId || 'USR-001'}</span>
              </div>
            </div>
          </div>

          {/* Dual Sub-Cards for Tasks */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
            {/* Checklist Tasks Sub-Card */}
            <div 
              onClick={() => onNavigateTab('checklist')}
              className="p-3 rounded-xl bg-blue-50/50 hover:bg-blue-50 border border-blue-200/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <CheckSquare className="w-3 h-3 text-blue-600" />
                  <span>Checklists</span>
                </span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {userChecklistCompleted}<span className="text-xs text-slate-400 font-medium">/{userChecklistTotal}</span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-1 mt-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((userChecklistCompleted / userChecklistTotal) * 100))}%` }}
                />
              </div>
            </div>

            {/* Delegation Tasks Sub-Card */}
            <div 
              onClick={() => onNavigateTab('delegation')}
              className="p-3 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Send className="w-3 h-3 text-amber-600" />
                  <span>Delegation</span>
                </span>
              </div>
              <div className="text-base font-black text-slate-900 mt-1">
                {userDelegCompleted}<span className="text-xs text-slate-400 font-medium">/{userDelegTotal}</span>
              </div>
              <div className="w-full bg-amber-200/60 rounded-full h-1 mt-2 overflow-hidden">
                <div 
                  className="bg-amber-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((userDelegCompleted / userDelegTotal) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Monthly Performance (Task completion & achievements) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Monthly Performance</h2>
                <p className="text-[11px] text-slate-500">Task completion &amp; achievements</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Bookmark className="w-4 h-4" />
              </div>
            </div>

            {/* 3 Pastel Quick Badges */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Completed */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center space-y-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                <div className="text-sm font-black text-emerald-950">
                  {currentUserMetrics.completedCount}
                </div>
                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
              </div>

              {/* Pending */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center space-y-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-600 mx-auto" />
                <div className="text-sm font-black text-amber-950">
                  {currentUserMetrics.pendingCount}
                </div>
                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">Pending</span>
              </div>

              {/* Score */}
              <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 text-center space-y-0.5">
                <Trophy className="w-3.5 h-3.5 text-orange-600 mx-auto" />
                <div className="text-sm font-black text-orange-950">
                  {currentUserMetrics.misScore}
                </div>
                <span className="text-[9px] font-bold text-orange-700 uppercase tracking-wider block">Score</span>
              </div>
            </div>

            {/* Task Completion Rate */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-bold text-[11px]">Task Completion Rate</span>
                <span className="text-slate-900 font-black">{currentUserMetrics.completionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    currentUserMetrics.completionRate >= 80 ? 'bg-indigo-600' : currentUserMetrics.completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, currentUserMetrics.completionRate))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Performance Trend SVG Curve */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <span>Performance Trend</span>
              <span className="text-emerald-600 font-bold">
                {currentUserMetrics.trendDiff > 0 ? `+${currentUserMetrics.trendDiff}%` : 'Optimal'}
              </span>
            </div>
            
            {/* SVG Sparkline Curve */}
            <div className="h-10 w-full overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 240 40">
                <defs>
                  <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 32 Q 40 28, 80 22 T 160 16 T 210 12 L 240 8 L 240 40 L 0 40 Z"
                  fill="url(#scoreTrendGrad)"
                />
                <path
                  d="M 0 32 Q 40 28, 80 22 T 160 16 T 210 12 L 240 8"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="240" cy="8" r="3.5" fill="#10b981" />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* MIDDLE ROW: PERFORMANCE INDICES (KRA & KPI) (Inspired by Image 1) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Performance Indices (KRA &amp; KPI)</h2>
          <p className="text-[11px] text-slate-500">Key results and performance indicators for this period</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Index 1: MIS Score */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-900">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold">MIS Score</span>
              </div>
              <span className="text-lg font-black text-blue-950">{currentUserMetrics.misScore}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Target <strong className="text-slate-800">100</strong></span>
              <span>Achieved <strong className="text-blue-900">{currentUserMetrics.misScore}</strong></span>
            </div>
            <div className="w-full bg-blue-200/60 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, currentUserMetrics.misScore)}%` }}
              />
            </div>
          </div>

          {/* Index 2: Checklist Completion */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold">Checklist Completion</span>
              </div>
              <span className="text-lg font-black text-emerald-950">{checklistComplianceRate}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Target <strong className="text-slate-800">{totalChecklists}</strong></span>
              <span>Achieved <strong className="text-emerald-900">{completedChecklists}</strong></span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${checklistComplianceRate}%` }}
              />
            </div>
          </div>

          {/* Index 3: Delegation Completion */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-900">
                <Send className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold">Delegation Completion</span>
              </div>
              <span className="text-lg font-black text-amber-950">{delegationSuccessRate}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Target <strong className="text-slate-800">{totalTasks}</strong></span>
              <span>Achieved <strong className="text-amber-900">{completedTasks}</strong></span>
            </div>
            <div className="w-full bg-amber-200/60 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all"
                style={{ width: `${delegationSuccessRate}%` }}
              />
            </div>
          </div>

          {/* Index 4: SLA Adherence Rate */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold">SLA Adherence Rate</span>
              </div>
              <span className="text-lg font-black text-slate-900">{currentUserMetrics.onTimeRate}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Target <strong className="text-slate-800">100%</strong></span>
              <span>Achieved <strong className="text-slate-900">{currentUserMetrics.onTimeRate}%</strong></span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-slate-700 h-full rounded-full transition-all"
                style={{ width: `${currentUserMetrics.onTimeRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: ATTENTION RADAR & QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">Attention Radar</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">{bottlenecks.length} flagged</span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {bottlenecks.length > 0 ? (
              bottlenecks.slice(0, 5).map((b, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateTab(b.actionTab)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                          b.severity === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.severity}
                      </span>
                      <p className="text-xs font-bold text-slate-900">{b.title}</p>
                    </div>
                    <p className="text-[11px] text-slate-500">{b.subtitle}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                All SLAs on track! No bottlenecks flagged.
              </div>
            )}
          </div>
        </div>

        {/* Quick Module Navigation Shortcuts */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => onNavigateTab('checklist')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all flex items-center justify-between cursor-pointer"
          >
            <span>Checklists</span>
            <span className="font-mono text-indigo-600 font-black">{totalChecklists}</span>
          </button>
          <button
            onClick={() => onNavigateTab('delegation')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all flex items-center justify-between cursor-pointer"
          >
            <span>Delegation</span>
            <span className="font-mono text-amber-600 font-black">{totalTasks}</span>
          </button>
          <button
            onClick={() => onNavigateTab('fms')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all flex items-center justify-between cursor-pointer"
          >
            <span>FMS Pipeline</span>
            <span className="font-mono text-blue-600 font-black">{activeFlows.length}</span>
          </button>
          <button
            onClick={() => onNavigateTab('ims')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition-all flex items-center justify-between cursor-pointer"
          >
            <span>IMS Store</span>
            <span className="font-mono text-emerald-600 font-black">{inventoryItems.length}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
