import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  X, 
  Landmark, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  ChevronRight, 
  ShieldCheck, 
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { VendorProfileRecord, UserProfile, isUserAuthorizedForVendorBanking } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { VendorProfileDrawer } from './VendorProfileDrawer';
import { NewVendorModal } from './NewVendorModal';

interface VendorDirectoryViewProps {
  currentUser: UserProfile;
}

export const VendorDirectoryView: React.FC<VendorDirectoryViewProps> = ({ currentUser }) => {
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);

  const [vendors, setVendors] = useState<VendorProfileRecord[]>(() => storageAdapter.getVendorProfiles());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [bankingFilter, setBankingFilter] = useState<'ALL' | 'VERIFIED' | 'MISSING' | 'PENDING'>('ALL');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set).sort();
  }, [vendors]);

  // Compute Stat Card metrics
  const totalVendorsCount = vendors.length;

  const missingOrPendingBankingCount = useMemo(() => {
    return vendors.filter((v) => {
      if (v.bankAccounts.length === 0) return true;
      const primary = v.bankAccounts.find((a) => a.isPrimary) || v.bankAccounts[0];
      return !primary || primary.verificationStatus !== 'VERIFIED' || !primary.cancelledChequeUrl;
    }).length;
  }, [vendors]);

  const verifiedAccountsCount = useMemo(() => {
    return vendors.reduce((acc, v) => {
      const verified = v.bankAccounts.filter((b) => b.verificationStatus === 'VERIFIED');
      return acc + verified.length;
    }, 0);
  }, [vendors]);

  // Total Disbursed Rupee Volume across all vendors
  const totalDisbursedRupees = useMemo(() => {
    const payments = storageAdapter.getBankPayments();
    return payments
      .filter((p) => p.paymentStatus === 'DONE')
      .reduce((sum, p) => sum + (p.amountToBePaid || 0), 0);
  }, []);

  // Filtered vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // 1. Category Filter
      if (categoryFilter !== 'ALL' && v.category !== categoryFilter) {
        return false;
      }

      // 2. Banking Status Filter
      if (bankingFilter === 'MISSING') {
        if (v.bankAccounts.length > 0) return false;
      } else if (bankingFilter === 'VERIFIED') {
        const hasVerified = v.bankAccounts.some((a) => a.verificationStatus === 'VERIFIED');
        if (!hasVerified) return false;
      } else if (bankingFilter === 'PENDING') {
        const hasPending = v.bankAccounts.some((a) => a.verificationStatus === 'PENDING');
        if (!hasPending) return false;
      }

      // 3. Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const matchTrade = (v.tradeName || '').toLowerCase().includes(q);
        const matchLegal = (v.legalName || '').toLowerCase().includes(q);
        const matchCode = (v.vendorCode || '').toLowerCase().includes(q);
        const matchGstin = (v.gstin || '').toLowerCase().includes(q);
        const matchPan = (v.pan || '').toLowerCase().includes(q);
        const matchCity = (v.city || '').toLowerCase().includes(q);
        const matchCategory = (v.category || '').toLowerCase().includes(q);
        const matchBank = v.bankAccounts.some(
          (b) =>
            (b.beneficiaryName || '').toLowerCase().includes(q) ||
            (b.bankName || '').toLowerCase().includes(q) ||
            (b.accountNo || '').includes(q) ||
            (b.ifscCode || '').toLowerCase().includes(q)
        );

        if (!matchTrade && !matchLegal && !matchCode && !matchGstin && !matchPan && !matchCity && !matchCategory && !matchBank) {
          return false;
        }
      }

      return true;
    });
  }, [vendors, categoryFilter, bankingFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'Vendor Code',
      'Trade Name',
      'Legal Name',
      'Category',
      'GSTIN',
      'PAN',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'State',
      'Bank Accounts Count',
      'Primary Bank',
      'Primary Account No',
      'IFSC Code',
      'Banking Status',
    ];

    const rows = filteredVendors.map((v) => {
      const primary = v.bankAccounts.find((a) => a.isPrimary) || v.bankAccounts[0];
      return [
        v.vendorCode,
        v.tradeName,
        v.legalName || '',
        v.category,
        v.gstin || '',
        v.pan || '',
        v.contactPerson || '',
        v.phone || '',
        v.email || '',
        v.city || '',
        v.state || '',
        v.bankAccounts.length,
        primary ? primary.bankName : 'N/A',
        primary ? primary.accountNo : 'N/A',
        primary ? primary.ifscCode : 'N/A',
        primary ? primary.verificationStatus : 'NO_ACCOUNT',
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BPL_Vendor_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVendorCreated = (newVendor: VendorProfileRecord) => {
    const updated = storageAdapter.getVendorProfiles();
    setVendors(updated);
    setSelectedVendorId(newVendor.id);
  };

  const handleVendorUpdated = (updatedVendor: VendorProfileRecord) => {
    const updated = storageAdapter.getVendorProfiles();
    setVendors(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Utilities & Tools</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Commercial Operations</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <span>Vendor Master Directory & Individual Profiles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered commercial vendors, statutory GSTIN/PAN records, and authorized bank disbursement accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {isAuthorized ? (
            <button
              onClick={() => setIsNewVendorModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Vendor</span>
            </button>
          ) : (
            <div
              className="px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-not-allowed"
              title="Only Accounts, Director, Admin, or Super Admin can register new vendors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Vendor (Restricted)</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 STAT CARDS (2 COUNT CARDS + 2 AMOUNT / VOLUME CARDS)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Count Card 1: Total Registered Vendors */}
        <div
          onClick={() => {
            setBankingFilter('ALL');
            setCategoryFilter('ALL');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            bankingFilter === 'ALL' && categoryFilter === 'ALL'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400 shadow-sm scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Vendors</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalVendorsCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">commercial entities</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">Click to show all vendors</div>
        </div>

        {/* Count Card 2: Missing or Pending Banking */}
        <div
          onClick={() => {
            setBankingFilter(bankingFilter === 'MISSING' ? 'ALL' : 'MISSING');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            bankingFilter === 'MISSING'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400 shadow-sm scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Pending Banking / Cheque</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {missingOrPendingBankingCount}
            </span>
            <span className="text-xs text-amber-800 font-semibold">needs bank entry</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            {bankingFilter === 'MISSING' ? 'Filtering: Missing Bank Details' : 'Click to filter missing accounts'}
          </div>
        </div>

        {/* Amount Card 3: Total Disbursed Volume (₹) */}
        <div
          onClick={() => {
            setBankingFilter(bankingFilter === 'VERIFIED' ? 'ALL' : 'VERIFIED');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            bankingFilter === 'VERIFIED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400 shadow-sm scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>Total Disbursed</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              ₹{totalDisbursedRupees.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            Settled disbursements across active projects
          </div>
        </div>

        {/* Amount/Count Card 4: Active Verified Bank Accounts */}
        <div
          onClick={() => {
            setBankingFilter(bankingFilter === 'VERIFIED' ? 'ALL' : 'VERIFIED');
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            bankingFilter === 'VERIFIED'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400 shadow-sm scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-800 uppercase tracking-wider">
            <span>Verified Accounts</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-700 tabular-nums">
              {verifiedAccountsCount}
            </span>
            <span className="text-xs text-blue-800 font-semibold">bank accounts</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-700 font-medium">
            Ready for RTGS / NEFT / IMPS transfers
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FILTER TOOLBAR WITH INTEGRATED SEARCH INPUT              */}
      {/* ========================================================= */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Integrated Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vendor trade name, legal entity, GSTIN, PAN, city, category, or bank account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(searchQuery || categoryFilter !== 'ALL' || bankingFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setBankingFilter('ALL');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Banking Facet Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          <span className="text-slate-400 font-bold text-[11px] uppercase mr-1">Status:</span>
          <button
            onClick={() => setBankingFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              bankingFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            All Vendors ({vendors.length})
          </button>
          <button
            onClick={() => setBankingFilter('VERIFIED')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              bankingFilter === 'VERIFIED'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Verified Bank Accounts
          </button>
          <button
            onClick={() => setBankingFilter('MISSING')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              bankingFilter === 'MISSING'
                ? 'bg-amber-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Missing Bank Details ({missingOrPendingBankingCount})
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VENDOR DIRECTORY TABLE                                   */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3.5">Vendor Code & Trade Name</th>
                <th className="p-3.5">Category & Region</th>
                <th className="p-3.5">Tax IDs (GSTIN / PAN)</th>
                <th className="p-3.5">Primary Bank Details</th>
                <th className="p-3.5 text-center">Banking Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-semibold text-slate-700">No matching vendors found</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Try adjusting your search terms or filters
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const primaryBank = vendor.bankAccounts.find((a) => a.isPrimary) || vendor.bankAccounts[0];
                  const hasBank = Boolean(primaryBank);
                  const isVerified = Boolean(primaryBank && primaryBank.verificationStatus === 'VERIFIED');

                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => setSelectedVendorId(vendor.id)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Vendor Code & Trade Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {vendor.vendorCode}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {vendor.tradeName}
                          </span>
                        </div>
                        {vendor.legalName && vendor.legalName !== vendor.tradeName && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Legal: {vendor.legalName}
                          </div>
                        )}
                      </td>

                      {/* Category & Region */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{vendor.category}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {vendor.city || 'Raipur'}, {vendor.state || 'CG'}
                        </div>
                      </td>

                      {/* GSTIN / PAN */}
                      <td className="p-3.5 font-mono text-[11px]">
                        {vendor.gstin ? (
                          <div className="font-bold text-slate-900">{vendor.gstin}</div>
                        ) : (
                          <div className="text-slate-400 font-sans italic">No GSTIN</div>
                        )}
                        {vendor.pan && (
                          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            PAN: {vendor.pan}
                          </div>
                        )}
                      </td>

                      {/* Primary Bank Details */}
                      <td className="p-3.5">
                        {hasBank ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{primaryBank.bankName}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-600 flex items-center gap-2">
                              <span>{primaryBank.accountNoMasked}</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-bold uppercase text-slate-700">{primaryBank.ifscCode}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Holder: <span className="font-semibold">{primaryBank.beneficiaryName}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>No Bank Account Linked</span>
                          </div>
                        )}
                      </td>

                      {/* Banking Status */}
                      <td className="p-3.5 text-center">
                        {hasBank ? (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified Bank</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Pending Sanction</span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full inline-flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Missing Bank</span>
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVendorId(vendor.id);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <span className="font-bold text-slate-900">{filteredVendors.length}</span> of{' '}
            <span className="font-bold text-slate-900">{vendors.length}</span> vendors
          </span>
          <span className="text-[11px]">Barbrik Project Ltd. Vendor Master Directory</span>
        </div>
      </div>

      {/* Individual Vendor Profile Drawer */}
      <VendorProfileDrawer
        isOpen={Boolean(selectedVendorId)}
        onClose={() => setSelectedVendorId(null)}
        vendorId={selectedVendorId}
        currentUser={currentUser}
        onVendorUpdated={handleVendorUpdated}
      />

      {/* New Vendor Registration Modal */}
      <NewVendorModal
        isOpen={isNewVendorModalOpen}
        onClose={() => setIsNewVendorModalOpen(false)}
        currentUser={currentUser}
        onSuccess={handleVendorCreated}
      />
    </div>
  );
};
