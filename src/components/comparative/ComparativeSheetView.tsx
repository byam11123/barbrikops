import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Layers, 
  ArrowRight, 
} from 'lucide-react';
import { ComparativeStatement, UserProfile, FmsInstance } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { ComparativeDirectoryView } from './ComparativeDirectoryView';
import { ComparativeStatementWorkspace } from './ComparativeStatementWorkspace';

interface ComparativeSheetViewProps {
  currentUser: UserProfile;
  purchaseFlows?: FmsInstance[];
  onNavigateTab?: (tab: string) => void;
  initialCsId?: string | null;
}

export const ComparativeSheetView: React.FC<ComparativeSheetViewProps> = ({
  currentUser,
  purchaseFlows = [],
  onNavigateTab,
  initialCsId,
}) => {
  // Saved statements
  const [statements, setStatements] = useState<ComparativeStatement[]>(() => {
    return storageAdapter.getComparativeStatements();
  });

  const [activeStatementId, setActiveStatementId] = useState<string>(() => {
    if (initialCsId && statements.some((s) => s.id === initialCsId)) {
      return initialCsId;
    }
    return statements[0]?.id || 'new';
  });

  // Current active statement
  const activeStatement = useMemo(() => {
    return statements.find((s) => s.id === activeStatementId) || statements[0];
  }, [statements, activeStatementId]);

  // Working state for active statement
  const [cs, setCs] = useState<ComparativeStatement>(() => {
    return activeStatement || storageAdapter.getComparativeStatements()[0];
  });

  // View mode switcher: DIRECTORY (ledger table & stats) vs EDITOR (detailed comparison matrix)
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'EDITOR'>(() => {
    return initialCsId ? 'EDITOR' : 'DIRECTORY';
  });

  const handleOpenEditor = (csId: string) => {
    setActiveStatementId(csId);
    const target = storageAdapter.getComparativeStatements().find((s) => s.id === csId);
    if (target) {
      setCs(target);
    }
    setViewMode('EDITOR');
  };

  const handleCreateNewFromDirectory = () => {
    const newId = `cs-${Date.now()}`;
    const newCs: ComparativeStatement = {
      id: newId,
      companyName: 'Barbrik Project Ltd.',
      site: 'BIJETALA',
      indentNo: `${Math.floor(100 + Math.random() * 900)}`,
      indentDate: new Date().toLocaleDateString('en-GB'),
      forPurpose: 'NEW REQUISITION COMPARATIVE STATEMENT',
      statementDate: new Date().toLocaleDateString('en-GB'),
      status: 'Draft',
      preparedBy: currentUser?.name || 'Shyam Rao Sureshe',
      createdAt: new Date().toLocaleString('en-GB'),
      updatedAt: new Date().toLocaleString('en-GB'),
      items: [
        {
          id: `it-1`,
          sn: 1,
          itemName: 'HEAVY EQUIPMENT SPARES',
          brandMake: 'OEM / REPUTED',
          unit: 'NOS',
          qty: 2,
        },
      ],
      vendors: [
        {
          vendorId: 'vnd-01',
          vendorName: 'M/S SHANTI EARTHMOVERS',
          rating: '4.8 / 5.0 (Authorized Distributor)',
          contactPersonMobile: 'Suresh Agrawal | Mo: +91-9826102233',
          storeOfficeAddress: 'Transport Nagar, Raipur (C.G.)',
          paymentTerms: '30 Days Net from Delivery',
          warrantyPeriod: '12 Months OEM Warranty',
          gstTerms: '18% GST Applicable',
          freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
          quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days`,
          primaryProductFocus: 'Earthmoving & Heavy Machinery Parts',
          itemRates: {
            'it-1': {
              baseRate: 4500,
              gstPercent: 18,
              gstAmount: 810,
              landedRate: 5310,
              amount: 10620,
              isQuoted: true,
            },
          },
        },
        {
          vendorId: 'vnd-02',
          vendorName: 'M/S CHHATTISGARH INDUSTRIAL SPARES',
          rating: '4.5 / 5.0 (OEM Stockist)',
          contactPersonMobile: 'Manish Sahu | Mo: +91-9425208899',
          storeOfficeAddress: 'G.E. Road, Bhilai (C.G.)',
          paymentTerms: '15 Days Credit',
          warrantyPeriod: '06 Months Replacement',
          gstTerms: '18% GST Applicable',
          freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
          quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 15 Days`,
          primaryProductFocus: 'Filters, Bearings & Hydraulics',
          itemRates: {
            'it-1': {
              baseRate: 4700,
              gstPercent: 18,
              gstAmount: 846,
              landedRate: 5546,
              amount: 11092,
              isQuoted: true,
            },
          },
        },
      ],
    };

    const saved = storageAdapter.saveComparativeStatement(newCs);
    setStatements(storageAdapter.getComparativeStatements());
    setActiveStatementId(saved.id);
    setCs(saved);
    setViewMode('EDITOR');
  };

  const handleRefreshStatements = () => {
    setStatements(storageAdapter.getComparativeStatements());
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 0. VIEW MODE SWITCHER TABS (Directory vs Editor) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setStatements(storageAdapter.getComparativeStatements());
              setViewMode('DIRECTORY');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'DIRECTORY'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Saved CS Directory &amp; Ledger</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'DIRECTORY' ? 'bg-indigo-750 text-indigo-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {statements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('EDITOR')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'EDITOR'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Comparative Statement Workspace</span>
            {cs.indentNo && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  viewMode === 'EDITOR' ? 'bg-indigo-750 text-indigo-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {cs.site} &bull; IND-{cs.indentNo}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold px-1">
          {viewMode === 'DIRECTORY' ? (
            <span className="hidden sm:inline">Click any row in the ledger table to view summary or open in comparison matrix</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setStatements(storageAdapter.getComparativeStatements());
                setViewMode('DIRECTORY');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Back to Saved CS Directory</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'DIRECTORY' ? (
        <ComparativeDirectoryView
          currentUser={currentUser}
          statements={statements}
          onOpenEditor={handleOpenEditor}
          onCreateNew={handleCreateNewFromDirectory}
          onRefreshStatements={handleRefreshStatements}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        <ComparativeStatementWorkspace
          initialCs={cs}
          currentUser={currentUser}
          purchaseFlows={purchaseFlows}
          statements={statements}
          activeStatementId={activeStatementId}
          onSelectStatementId={(id) => {
            setActiveStatementId(id);
            const target = storageAdapter.getComparativeStatements().find((s) => s.id === id);
            if (target) setCs(target);
          }}
          onBackToDirectory={() => {
            setStatements(storageAdapter.getComparativeStatements());
            setViewMode('DIRECTORY');
          }}
        />
      )}
    </div>
  );
};
