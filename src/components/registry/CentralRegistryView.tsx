import React, { useState } from 'react';
import { 
  Sliders, 
  Database, 
  FileSpreadsheet, 
  FolderSync, 
  Check, 
  Copy, 
  Download, 
  Layers, 
  ShieldCheck, 
  RefreshCw,
  ExternalLink,
  Code2,
  Plus,
  Edit3,
  Trash2,
  Building2,
  ShoppingCart,
  Warehouse,
  Landmark,
  Wrench,
  Truck,
  Users,
  FileText,
  X,
  GitBranch
} from 'lucide-react';
import { CentralRegistryConfig, DepartmentDefinition } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { FmsMasterCatalogView } from '../fms/FmsMasterCatalogView';
import { 
  GENERATED_POSTGRES_SCHEMA, 
  FMS_MIGRATION_MAPPINGS, 
  DELEGATION_MIGRATION_MAPPINGS, 
  CHECKLIST_MIGRATION_MAPPINGS 
} from '../../services/migrationEngine';

interface CentralRegistryViewProps {
  config: CentralRegistryConfig;
  onSaveConfig: (config: CentralRegistryConfig) => void;
  onResetSeedData: () => void;
  onOpenTemplateStudio?: (templateKey?: string) => void;
  onCreateFlow?: (flowType?: string) => void;
}

export const CentralRegistryView: React.FC<CentralRegistryViewProps> = ({
  config,
  onSaveConfig,
  onResetSeedData,
  onOpenTemplateStudio,
  onCreateFlow,
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'DEPARTMENTS' | 'FMS_WORKFLOWS' | 'SQL_SCHEMA' | 'COLUMN_MAPPINGS'>('DEPARTMENTS');
  const [formConfig, setFormConfig] = useState<CentralRegistryConfig>(config);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Department Hub State
  const [departments, setDepartments] = useState<DepartmentDefinition[]>(() => storageAdapter.getDepartments());
  const [deptStatusFilter, setDeptStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentDefinition | null>(null);
  const [deptKey, setDeptKey] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptIcon, setDeptIcon] = useState('Building2');
  const [deptError, setDeptError] = useState<string | null>(null);

  const handleToggleArchive = (dept: DepartmentDefinition) => {
    storageAdapter.toggleArchiveDepartment(dept.id);
    setDepartments(storageAdapter.getDepartments());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptKey('');
    setDeptName('');
    setDeptDesc('');
    setDeptIcon('Building2');
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentDefinition) => {
    setEditingDept(dept);
    setDeptKey(dept.key);
    setDeptName(dept.name);
    setDeptDesc(dept.description || '');
    setDeptIcon(dept.icon || 'Building2');
    setDeptError(null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      setDeptError('Department Name is required');
      return;
    }

    const key = (deptKey.trim() || deptName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')).toUpperCase();

    const newDept: DepartmentDefinition = {
      id: editingDept ? editingDept.id : `dept_${Date.now()}`,
      key,
      name: deptName.trim(),
      description: deptDesc.trim() || undefined,
      icon: deptIcon,
      isDefault: editingDept ? editingDept.isDefault : false,
      createdAt: editingDept ? editingDept.createdAt : new Date().toLocaleDateString('en-GB'),
    };

    storageAdapter.saveDepartment(newDept);
    const updated = storageAdapter.getDepartments();
    setDepartments(updated);
    setIsDeptModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteDept = (dept: DepartmentDefinition) => {
    if (window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
      storageAdapter.deleteDepartment(dept.id);
      setDepartments(storageAdapter.getDepartments());
    }
  };

  const getIconComponent = (iconName?: string) => {
    switch (iconName) {
      case 'ShoppingCart': return <ShoppingCart className="w-4 h-4 text-amber-600" />;
      case 'Warehouse': return <Warehouse className="w-4 h-4 text-blue-600" />;
      case 'Landmark': return <Landmark className="w-4 h-4 text-emerald-600" />;
      case 'Wrench': return <Wrench className="w-4 h-4 text-purple-600" />;
      case 'Truck': return <Truck className="w-4 h-4 text-indigo-600" />;
      case 'Users': return <Users className="w-4 h-4 text-rose-600" />;
      case 'FileText': return <FileText className="w-4 h-4 text-slate-600" />;
      default: return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(GENERATED_POSTGRES_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([GENERATED_POSTGRES_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barbrik_ops_schema_ddl.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Central Registry &amp; Migration Architecture
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Migration-Friendly Layer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Decoupled business logic from Google Sheet row indices. Every record uses immutable stable IDs (e.g. <span className="font-mono text-slate-700">taskId: &quot;vhdlgas&quot;</span>, <span className="font-mono text-slate-700">flowId: &quot;FLOW-IND-752&quot;</span>) and maps cleanly to PostgreSQL/Supabase.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 gap-1">
          <button
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Department Hub ({departments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('FMS_WORKFLOWS')}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'FMS_WORKFLOWS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>FMS Workflows Master</span>
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'CONFIG'
                ? 'bg-slate-100 text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google IDs Registry
          </button>
          <button
            onClick={() => setActiveTab('SQL_SCHEMA')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'SQL_SCHEMA'
                ? 'bg-slate-100 text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PostgreSQL DDL
          </button>
          <button
            onClick={() => setActiveTab('COLUMN_MAPPINGS')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'COLUMN_MAPPINGS'
                ? 'bg-slate-100 text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Field Mappings
          </button>
        </div>
      </div>

      {activeTab === 'FMS_WORKFLOWS' && (
        <FmsMasterCatalogView
          onOpenTemplateStudio={onOpenTemplateStudio}
          onCreateFlow={onCreateFlow}
        />
      )}

      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Department Hub updated and audit logged successfully!</span>
            </div>
          )}

          {/* Department Hub Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Central Department Master</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Single source of truth for organization departments. Rename existing departments or add new ones (e.g., <span className="font-semibold text-slate-700">HR, Quality, Safety, Civil</span>). Sidebar branches, Template Studio, and FMS Pipeline filters update automatically without losing historical data.
              </p>
            </div>
            <button
              onClick={handleOpenAddDept}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Department</span>
            </button>
          </div>

          {/* Department Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Table Header Filter Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeptStatusFilter('ALL')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                    deptStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({departments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeptStatusFilter('ACTIVE')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                    deptStatusFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({departments.filter((d) => !d.isArchived).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDeptStatusFilter('ARCHIVED')}
                  className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                    deptStatusFilter === 'ARCHIVED'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Archived / Inactive ({departments.filter((d) => d.isArchived).length})
                </button>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Archived departments are hidden from sidebar branches &amp; template creation.
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Department Icon &amp; Name</th>
                    <th className="py-3 px-4">System Key / Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments
                    .filter((d) => {
                      if (deptStatusFilter === 'ACTIVE') return !d.isArchived;
                      if (deptStatusFilter === 'ARCHIVED') return d.isArchived;
                      return true;
                    })
                    .map((dept) => (
                      <tr key={dept.id} className={`hover:bg-slate-50/80 transition-colors ${dept.isArchived ? 'bg-slate-50/40 opacity-75' : ''}`}>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg shrink-0 ${dept.isArchived ? 'bg-amber-50' : 'bg-slate-100'}`}>
                            {getIconComponent(dept.icon)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>{dept.name}</span>
                              {dept.isDefault && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold">
                                  Baseline
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {dept.id}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {dept.key}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {dept.description || '—'}
                        </td>
                        <td className="py-3 px-4">
                          {dept.isArchived ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Archived / Inactive</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditDept(dept)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Rename or edit department details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Rename / Edit</span>
                            </button>

                            <button
                              onClick={() => handleToggleArchive(dept)}
                              className={`px-2.5 py-1.5 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                                dept.isArchived
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                              title={dept.isArchived ? 'Reactivate department and make visible on sidebar' : 'Archive department and hide from sidebar'}
                            >
                              <span>{dept.isArchived ? 'Reactivate' : 'Archive'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteDept(dept)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="Permanently delete department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Add/Edit Modal */}
          {isDeptModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>{editingDept ? 'Rename / Edit Department' : 'Add New Department'}</span>
                  </h3>
                  <button
                    onClick={() => setIsDeptModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {deptError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold">
                    {deptError}
                  </div>
                )}

                <form onSubmit={handleSaveDepartment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Finance & Accounts, Central Store, Quality"
                      value={deptName}
                      onChange={(e) => {
                        setDeptName(e.target.value);
                        if (!editingDept) {
                          setDeptKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '_'));
                        }
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department System Key / Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ACCOUNTS, STORE, QUALITY"
                      value={deptKey}
                      onChange={(e) => setDeptKey(e.target.value.toUpperCase())}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Immutable key used for workflow mappings.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department Icon
                    </label>
                    <select
                      value={deptIcon}
                      onChange={(e) => setDeptIcon(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Building2">Building / General</option>
                      <option value="ShoppingCart font-semibold">Shopping Cart (Purchase)</option>
                      <option value="Warehouse">Warehouse (Store)</option>
                      <option value="Landmark">Landmark (Finance / Accounts)</option>
                      <option value="Wrench">Wrench (Plant / Operations)</option>
                      <option value="Truck">Truck (Logistics)</option>
                      <option value="Users">Users (HR / Admin)</option>
                      <option value="FileText">FileText (Contracts)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief overview of department scope and responsibilities..."
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsDeptModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      {editingDept ? 'Save Changes' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'CONFIG' && (
        <form onSubmit={handleSave} className="space-y-6">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Registry settings saved and audit logged successfully!</span>
            </div>
          )}

          {/* Storage Mode Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Data Authority &amp; Storage Engine Mode</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'HYBRID_TRANSITION',
                  title: 'Hybrid Transition (Recommended)',
                  desc: 'Next.js backend validates all rules. Syncs to Google Sheets and logs audit events to DB.',
                },
                {
                  id: 'GOOGLE_SHEETS',
                  title: 'Google Sheets Native Only',
                  desc: 'All operational records stored in 3 existing Google Sheets; reads and writes via Sheets API.',
                },
                {
                  id: 'POSTGRES_SUPABASE',
                  title: 'PostgreSQL / Supabase Ready',
                  desc: 'Relational database as primary single source of truth with foreign key constraints.',
                },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    formConfig.activeDataSource === mode.id
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div>
                    <input
                      type="radio"
                      name="dataSource"
                      checked={formConfig.activeDataSource === mode.id}
                      onChange={() =>
                        setFormConfig({
                          ...formConfig,
                          activeDataSource: mode.id as any,
                        })
                      }
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-xs text-slate-900 ml-2">
                      {mode.title}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                      {mode.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Google Spreadsheet IDs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Google Spreadsheet Registry IDs</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sheet 1: FMS Indent Flow Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={formConfig.sheetsConfig.fmsSpreadsheetId}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      sheetsConfig: { ...formConfig.sheetsConfig, fmsSpreadsheetId: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sheet 2: Delegation (DTA) Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={formConfig.sheetsConfig.delegationSpreadsheetId}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      sheetsConfig: { ...formConfig.sheetsConfig, delegationSpreadsheetId: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sheet 3: Checklist Compliance Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={formConfig.sheetsConfig.checklistSpreadsheetId}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      sheetsConfig: { ...formConfig.sheetsConfig, checklistSpreadsheetId: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sheet 4: IMS Store &amp; Site Stock Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={formConfig.sheetsConfig.inventorySpreadsheetId}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      sheetsConfig: { ...formConfig.sheetsConfig, inventorySpreadsheetId: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Google Forms Registry */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-purple-600" />
              <span>Google Forms Registry URLs (From FMS Workflow)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FMS Stage 10: Advance Payment Form URL (Sheet 1)
                </label>
                <input
                  type="url"
                  value={formConfig.formsConfig.advancePaymentApprovalFormUrl}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      formsConfig: { ...formConfig.formsConfig, advancePaymentApprovalFormUrl: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FMS Stage 12: Material Collection PO Form URL (Sheet 1)
                </label>
                <input
                  type="url"
                  value={formConfig.formsConfig.materialCollectionPoFormUrl}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      formsConfig: { ...formConfig.formsConfig, materialCollectionPoFormUrl: e.target.value },
                    })
                  }
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onResetSeedData}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 p-2 rounded hover:bg-rose-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Records to Baseline Seeds</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Save Registry Settings
            </button>
          </div>
        </form>
      )}

      {/* SQL DDL Tab */}
      {activeTab === 'SQL_SCHEMA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-0">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <span className="font-mono text-xs font-bold">
                barbrik_ops_schema_ddl.sql (PostgreSQL 15+ / Supabase Schema)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
              </button>
              <button
                onClick={handleDownloadSql}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .SQL</span>
              </button>
            </div>
          </div>
          <pre className="p-5 text-xs font-mono text-slate-800 bg-slate-50 overflow-x-auto max-h-[600px] leading-relaxed">
            {GENERATED_POSTGRES_SCHEMA}
          </pre>
        </div>
      )}

      {/* Field Mappings Tab */}
      {activeTab === 'COLUMN_MAPPINGS' && (
        <div className="space-y-6">
          {/* FMS Mapping */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Sheet 1: FMS Indent Pipeline Field Mapping
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Google Sheet Column</th>
                    <th className="py-2.5 px-3">PostgreSQL Table / Column</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Validation Rule</th>
                    <th className="py-2.5 px-3">Architectural Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FMS_MIGRATION_MAPPINGS.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{m.sheetColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">{m.postgresColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{m.postgresType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.validationRule}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delegation Mapping */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Sheet 2: Delegation (DTA) Field Mapping
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Google Sheet Column</th>
                    <th className="py-2.5 px-3">PostgreSQL Table / Column</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Validation Rule</th>
                    <th className="py-2.5 px-3">Architectural Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DELEGATION_MIGRATION_MAPPINGS.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{m.sheetColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">{m.postgresColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{m.postgresType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.validationRule}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checklist Mapping */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Sheet 3: Checklist Compliance Field Mapping
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Google Sheet Column</th>
                    <th className="py-2.5 px-3">PostgreSQL Table / Column</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Validation Rule</th>
                    <th className="py-2.5 px-3">Architectural Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CHECKLIST_MIGRATION_MAPPINGS.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{m.sheetColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-700">{m.postgresColumn}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{m.postgresType}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.validationRule}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
