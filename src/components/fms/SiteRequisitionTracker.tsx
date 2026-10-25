import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  X, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  Boxes, 
  ArrowRight, 
  Calendar,
  Layers,
  AlertCircle,
  Tag
} from 'lucide-react';
import { FmsInstance, UserProfile, isFlowAccessibleToUser, FmsLineItem } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface SiteRequisitionTrackerProps {
  currentUser: UserProfile;
  flows: FmsInstance[];
}

export const SiteRequisitionTracker: React.FC<SiteRequisitionTrackerProps> = ({
  currentUser,
  flows,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFlowModal, setSelectedFlowModal] = useState<FmsInstance | null>(null);

  const masterSites = storageAdapter.getMasterSites();

  // Filter flows accessible to user (and limit to stock check / site requisition flows or site accessible flows)
  const accessibleFlows = useMemo(() => {
    return flows.filter((f) => {
      if (!isFlowAccessibleToUser(f, currentUser)) return false;
      return true; // Show all accessible requisitions & stock flows
    });
  }, [flows, currentUser]);

  // Base list filtered by search and site filter
  const siteAndSearchFilteredFlows = useMemo(() => {
    return accessibleFlows.filter((f) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const reqNo = (f.requisitionNumber || f.indentNo || '').toLowerCase();
        const site = (f.siteName || '').toLowerCase();
        const creator = (f.createdBy || '').toLowerCase();
        const itemsStr = (f.lineItems || []).map((i) => i.itemDescription).join(' ').toLowerCase();
        if (!reqNo.includes(q) && !site.includes(q) && !creator.includes(q) && !itemsStr.includes(q)) {
          return false;
        }
      }

      // Site filter
      if (selectedSite !== 'ALL' && f.siteName?.toUpperCase() !== selectedSite.toUpperCase()) {
        return false;
      }

      return true;
    });
  }, [accessibleFlows, searchQuery, selectedSite]);

  // 4 Core Summary Stat Counts
  const statCounts = useMemo(() => {
    let inProgress = 0;
    let awaitingFulfillment = 0;
    let overdueDelayed = 0;

    siteAndSearchFilteredFlows.forEach((f) => {
      if (f.status === 'In Progress') {
        inProgress += 1;
      }
      if (f.status === 'Awaiting Fulfillment' || f.status === 'Pending') {
        awaitingFulfillment += 1;
      }
      const isOverdue =
        (f.totalDelayHours !== undefined && f.totalDelayHours > 0) ||
        f.status === 'Overdue' ||
        f.status === 'Delayed' ||
        Boolean(f.stages && f.stages.some((s) => (s.delayHours !== undefined && s.delayHours > 0) || (s.timeDelayHours !== undefined && s.timeDelayHours > 0) || s.status === 'Delayed'));
      if (isOverdue) {
        overdueDelayed += 1;
      }
    });

    return {
      total: siteAndSearchFilteredFlows.length,
      inProgress,
      awaitingFulfillment,
      overdueDelayed,
    };
  }, [siteAndSearchFilteredFlows]);

  const filteredFlows = useMemo(() => {
    return siteAndSearchFilteredFlows.filter((f) => {
      if (selectedStatus === 'ALL') return true;
      if (selectedStatus === 'IN_PROGRESS') return f.status === 'In Progress';
      if (selectedStatus === 'AWAITING_FULFILLMENT') return f.status === 'Awaiting Fulfillment' || f.status === 'Pending';
      if (selectedStatus === 'OVERDUE') {
        return (
          (f.totalDelayHours !== undefined && f.totalDelayHours > 0) ||
          f.status === 'Overdue' ||
          f.status === 'Delayed' ||
          Boolean(f.stages && f.stages.some((s) => (s.delayHours !== undefined && s.delayHours > 0) || (s.timeDelayHours !== undefined && s.timeDelayHours > 0) || s.status === 'Delayed'))
        );
      }
      if (selectedStatus === 'COMPLETED') return f.status === 'Completed';
      return true;
    });
  }, [siteAndSearchFilteredFlows, selectedStatus]);

  // Find linked child workflows for a selected parent flow
  const getChildWorkflows = (parentFlow: FmsInstance) => {
    return flows.filter((f) => f.parentFlowId === parentFlow.id || f.parentFlowIndentNo === parentFlow.indentNo);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <FileText className="w-4 h-4" />
          <span>Site Material Requisitions & Tracking Desk</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Site Requisitions Tracker
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
          Track active site material requisitions, stock verification status, current assignees, and downstream store/purchase dispatch progress in real-time.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Requisitions */}
        <div
          onClick={() => setSelectedStatus('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'ALL'
              ? 'bg-white border-indigo-400 ring-2 ring-indigo-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Total Requisitions
            </span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {statCounts.total}
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'IN_PROGRESS'
              ? 'bg-white border-amber-400 ring-2 ring-amber-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              In Progress
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {statCounts.inProgress}
          </div>
        </div>

        {/* Awaiting Fulfillment */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'AWAITING_FULFILLMENT' ? 'ALL' : 'AWAITING_FULFILLMENT')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'AWAITING_FULFILLMENT'
              ? 'bg-white border-sky-400 ring-2 ring-sky-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
              Awaiting Fulfillment
            </span>
            <Boxes className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {statCounts.awaitingFulfillment}
          </div>
        </div>

        {/* Overdue / Delayed */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'OVERDUE'
              ? 'bg-white border-rose-400 ring-2 ring-rose-200 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Overdue / Delayed
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {statCounts.overdueDelayed}
          </div>
        </div>
      </div>

      {/* Filter Controls (Sticky top-0 z-30) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Requisition No, Item, Site or Requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-medium"
            />
          </div>

          {/* Site Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sites ({masterSites.length})</option>
              {masterSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_FULFILLMENT">Awaiting Fulfillment</option>
              <option value="OVERDUE">Overdue / Delayed</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredFlows.length}</span> requisitions
        </div>
      </div>

      {/* Requisitions Read-Only Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredFlows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Requisitions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no material requisitions matching your current filters or site access permissions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Requisition No</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Site / Location</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Requested By</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Items Count</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Current Stage</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Assignee</th>
                  <th className="px-4 py-3.5 sticky top-0 bg-slate-50 border-b border-slate-300">Planned Date / SLA</th>
                  <th className="px-4 py-3.5 text-center sticky top-0 bg-slate-50 border-b border-slate-300">Status</th>
                  <th className="px-4 py-3.5 text-right sticky top-0 bg-slate-50 border-b border-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredFlows.map((flow) => {
                  const currentStageObj = flow.stages?.[flow.currentStageIndex || 0];
                  const currentStageName = currentStageObj?.stageName || flow.status;
                  const currentAssignee = currentStageObj?.assignee || 'Unassigned';
                  const plannedDate = currentStageObj?.plannedDateTime || flow.createdAt || '—';
                  const requestedBy =
                    flow.createdBy ||
                    flow.stages?.[0]?.submittedData?.requestedBy ||
                    'Amanat Bharadwaj';
                  const itemsCount = flow.lineItems?.length || 1;

                  return (
                    <tr
                      key={flow.id}
                      onClick={() => setSelectedFlowModal(flow)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-bold text-indigo-600 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{flow.requisitionNumber || flow.indentNo}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {flow.siteName}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{requestedBy}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                          <Boxes className="w-3 h-3 text-slate-500" />
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        <span className="truncate max-w-[180px] block" title={currentStageName}>
                          {currentStageName}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-semibold inline-block">
                          {currentAssignee}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{plannedDate}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            flow.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {flow.status === 'Completed' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {flow.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer"
                          title="View Requisition Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Read-Only Status Timeline Modal */}
      {selectedFlowModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Requisition #{selectedFlowModal.requisitionNumber || selectedFlowModal.indentNo}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        selectedFlowModal.priority === 'Urgent'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {selectedFlowModal.priority || 'Normal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Site: <span className="text-slate-200 font-semibold">{selectedFlowModal.siteName}</span> • Requested By:{' '}
                    <span className="text-slate-200 font-semibold">
                      {selectedFlowModal.createdBy || 'Amanat Bharadwaj'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFlowModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Timeline Stage Progress */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Workflow Progress Timeline</span>
                </h4>

                <div className="relative pl-6 border-l-2 border-indigo-200 space-y-6">
                  {selectedFlowModal.stages?.map((stg, idx) => {
                    const isDone = stg.status === 'Done';
                    const isInProgress = stg.status === 'In Progress' || idx === selectedFlowModal.currentStageIndex;

                    return (
                      <div key={stg.stageId || idx} className="relative">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : isInProgress
                              ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
                              : 'bg-slate-200 border-slate-300 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                        </div>

                        <div>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                              Stage {idx + 1}: {stg.stageName}
                            </h5>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isInProgress
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {stg.status || 'Pending'}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <div>
                              Assignee: <span className="font-semibold text-slate-700">{stg.assignee || 'Store Manager'}</span>
                            </div>
                            {stg.plannedDateTime && (
                              <div>
                                Target: <span className="font-semibold text-slate-700">{stg.plannedDateTime}</span>
                              </div>
                            )}
                            {stg.actualDateTime && (
                              <div>
                                Completed At: <span className="font-semibold text-emerald-700">{stg.actualDateTime}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linked Downstream Child Workflows (if any spawned) */}
              {getChildWorkflows(selectedFlowModal).length > 0 && (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
                    <span>Linked Downstream Sub-Workflows</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getChildWorkflows(selectedFlowModal).map((child) => (
                      <div key={child.id} className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-indigo-700">{child.flowId}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {child.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 font-medium">
                          Current Stage: {child.stages?.[child.currentStageIndex || 0]?.stageName || child.status}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Assignee: {child.stages?.[child.currentStageIndex || 0]?.assignee || 'Assigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requisition Line Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  <span>Requisition Material Items</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Purpose / Activity</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {(selectedFlowModal.lineItems || []).length > 0 ? (
                        selectedFlowModal.lineItems?.map((item: FmsLineItem, i: number) => (
                          <tr key={item.id || i}>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">{item.itemDescription}</td>
                            <td className="px-3 py-2.5">
                              {item.qty} {item.unit}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{item.workPurpose || 'Site Work'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.status || 'PENDING_TRIAGE'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-500 italic">
                            General site material requisition (1 item)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedFlowModal.remarks && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Requisition Remarks / Activity:</span>
                  <p className="text-slate-600">{selectedFlowModal.remarks}</p>
                </div>
              )}
            </div>

            {/* Modal Footer (Read-Only indicator) */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>Read-Only Tracking View (No execution permissions)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFlowModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Tracking View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
