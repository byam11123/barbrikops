import React, { useState } from 'react';
import { 
  GitBranch, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  User, 
  Layers, 
  Play, 
  ShoppingCart, 
  Warehouse, 
  Landmark, 
  Wrench, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { FmsTemplateDefinition, UserProfile, isUserSuperAdmin } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { getDepartmentBranchLabel } from '../../services/stageAssignment';
import { downloadFmsExcelTemplate } from '../../services/fmsExcelService';

interface FmsMasterCatalogViewProps {
  currentUser?: UserProfile;
  onOpenTemplateStudio?: (templateKey?: string) => void;
  onCreateFlow?: (flowType?: string) => void;
}

export const FmsMasterCatalogView: React.FC<FmsMasterCatalogViewProps> = ({
  currentUser,
  onOpenTemplateStudio,
  onCreateFlow,
}) => {
  const activeUser = currentUser || storageAdapter.getAuthUser();
  const isSuperAdmin = isUserSuperAdmin(activeUser);
  const [templates, setTemplates] = useState<FmsTemplateDefinition[]>(() => storageAdapter.getAllMasterTemplates());
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refreshTemplates = () => {
    setTemplates(storageAdapter.getAllMasterTemplates());
  };

  const handleToggleArchive = (tpl: FmsTemplateDefinition) => {
    storageAdapter.toggleArchiveFmsTemplate(tpl.id || tpl.templateKey);
    refreshTemplates();
  };

  const handleDelete = (tpl: FmsTemplateDefinition) => {
    storageAdapter.deleteFmsTemplate(tpl.id, activeUser || undefined);
    if (tpl.templateKey) {
      storageAdapter.deleteFmsTemplate(tpl.templateKey, activeUser || undefined);
    }
    setConfirmDeleteId(null);
    refreshTemplates();
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch = 
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.templateKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'ALL' || (tpl.departmentHub && tpl.departmentHub.toUpperCase() === deptFilter.toUpperCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !tpl.isArchived) ||
      (statusFilter === 'ARCHIVED' && tpl.isArchived);

    return matchesSearch && matchesDept && matchesStatus;
  });

  const getDeptBadge = (deptHub?: string) => {
    const hub = (deptHub || 'GENERAL').toUpperCase();
    const label = getDepartmentBranchLabel(hub);

    if (hub === 'PURCHASE' || hub === 'PROCUREMENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (hub === 'STORE' || hub === 'SITE_LOGISTICS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Warehouse className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (hub === 'ACCOUNTS' || hub === 'FINANCE_ACCOUNTS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Landmark className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </span>
      );
    }
    if (hub === 'PLANT_OPS' || hub === 'HR_EQUIPMENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
          <Wrench className="w-3.5 h-3.5 text-purple-600" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
        <Building2 className="w-3.5 h-3.5 text-slate-600" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">FMS Workflow Master Directory</h3>
            <p className="text-xs text-slate-500">
              Master catalog of {templates.length} standard &amp; custom FMS workflow templates, stage definitions, and form mappings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadFmsExcelTemplate()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Download blank Excel template to configure workflows offline"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Excel Template</span>
          </button>
          {onOpenTemplateStudio && (
            <button
              type="button"
              onClick={() => onOpenTemplateStudio()}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Design / Import in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows by name, key or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Departments</option>
              <option value="PURCHASE">Purchase</option>
              <option value="STORE">Store</option>
              <option value="ACCOUNTS">Accounts</option>
              <option value="PLANT_OPS">Plant &amp; Ops</option>
              <option value="OPERATIONS">Operations</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-1 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Workflows</option>
              <option value="ARCHIVED">Archived Workflows</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Workflows Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Workflow Name &amp; Key</th>
                <th className="py-3 px-4">Department Hub</th>
                <th className="py-3 px-4 text-center">Stages</th>
                <th className="py-3 px-4">Identifier Label</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No workflow templates match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isExpanded = expandedId === tpl.id;
                  const totalSla = tpl.stages.reduce((acc, s) => acc + (s.slaHours || 0), 0);

                  return (
                    <React.Fragment key={tpl.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${tpl.isArchived ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                              className="mt-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Toggle Stage Sequence Details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{tpl.name}</span>
                                {tpl.isCustom && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded uppercase">Custom</span>
                                )}
                              </div>
                              <span className="font-mono text-[11px] text-slate-500">{tpl.templateKey}</span>
                              {tpl.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {getDeptBadge(tpl.departmentHub)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{tpl.stages.length} Steps</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {tpl.referenceLabel}
                        </td>

                        <td className="py-3.5 px-4">
                          {tpl.isArchived ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Archived
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onCreateFlow && !tpl.isArchived && (
                              <button
                                type="button"
                                onClick={() => onCreateFlow(tpl.templateKey)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold transition-colors cursor-pointer"
                                title="Start a new live workflow requisition instance (e.g. fill Indent Receive form)"
                              >
                                <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                                <span>+ Start Requisition</span>
                              </button>
                            )}

                            {onOpenTemplateStudio && (
                              <button
                                type="button"
                                onClick={() => onOpenTemplateStudio(tpl.templateKey)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Customize Workflow in Template Studio"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleArchive(tpl)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                tpl.isArchived 
                                  ? 'text-amber-600 hover:bg-amber-50' 
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                              }`}
                              title={tpl.isArchived ? 'Restore Workflow' : 'Archive Workflow'}
                            >
                              {tpl.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                            </button>

                            {isSuperAdmin && (
                              confirmDeleteId === tpl.id || confirmDeleteId === tpl.templateKey ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                                  <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(tpl)}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(tpl.id || tpl.templateKey)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Workflow Template (Super Admin)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Stage Details Row */}
                      {isExpanded && (
                        <tr className="bg-indigo-50/30 border-b border-indigo-100">
                          <td colSpan={6} className="p-4">
                            <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                  Sequential Stage Breakdown ({tpl.stages.length} Stages | Total SLA: ~{totalSla}h)
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                  Default Identifier: <strong className="text-slate-700">{tpl.referenceLabel}</strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {tpl.stages.map((stg, sIdx) => (
                                  <div key={stg.stageId || sIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold text-slate-800">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                                          {sIdx + 1}
                                        </span>
                                        <span className="uppercase text-[11px] text-indigo-900">{stg.stageName}</span>
                                      </span>
                                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                        {stg.slaHours ? `+${stg.slaHours}h SLA` : 'As Needed'}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                                      <div className="flex items-center gap-1 text-slate-700">
                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-medium">{stg.whoDefaultAssignee || stg.whoRole}</span>
                                      </div>
                                      {stg.howChannel && (
                                        <div className="text-[10px] font-mono text-slate-500 truncate">
                                          HOW: {stg.howChannel}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
