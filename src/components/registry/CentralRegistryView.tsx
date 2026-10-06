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
  Code2
} from 'lucide-react';
import { CentralRegistryConfig } from '../../types';
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
}

export const CentralRegistryView: React.FC<CentralRegistryViewProps> = ({
  config,
  onSaveConfig,
  onResetSeedData,
}) => {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'SQL_SCHEMA' | 'COLUMN_MAPPINGS'>('CONFIG');
  const [formConfig, setFormConfig] = useState<CentralRegistryConfig>(config);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

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
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'CONFIG'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google IDs Registry
          </button>
          <button
            onClick={() => setActiveTab('SQL_SCHEMA')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'SQL_SCHEMA'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PostgreSQL DDL
          </button>
          <button
            onClick={() => setActiveTab('COLUMN_MAPPINGS')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${
              activeTab === 'COLUMN_MAPPINGS'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Field Mappings
          </button>
        </div>
      </div>

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
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
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
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
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
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
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
