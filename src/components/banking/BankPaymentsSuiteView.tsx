import React, { useState } from 'react';
import { Landmark, Building2, ArrowRightLeft, ShieldCheck, Clock } from 'lucide-react';
import { UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { BankPaymentsFmsView } from './BankPaymentsFmsView';
import { BeneficiaryMasterView } from './BeneficiaryMasterView';
import { InterbankTransferView } from './InterbankTransferView';

interface BankPaymentsSuiteViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  siteFilter: string;
  onRefresh: () => void;
}

export const BankPaymentsSuiteView: React.FC<BankPaymentsSuiteViewProps> = ({
  currentUser,
  searchQuery,
  siteFilter,
  onRefresh,
}) => {
  const [activeSwitcher, setActiveSwitcher] = useState<'PAYMENTS' | 'BENEFICIARIES' | 'IBT'>('PAYMENTS');

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || 
                     (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || 
                     currentUser.role.toUpperCase().includes('ACCOUNTS');

  // Dynamic badge counts
  const bankPayments = storageAdapter.getBankPayments();
  const beneficiaries = storageAdapter.getBeneficiaryRecords();
  const ibtRecords = storageAdapter.getIbtRecords();

  const pendingPaymentsCount = bankPayments.filter(p => p.approvalStatus === 'PENDING').length;
  const pendingBenCount = beneficiaries.filter(b => b.approvalStatus === 'PENDING').length;
  const pendingIbtCount = ibtRecords.filter(i => i.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Suite Switcher Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Bank Payments &amp; Treasury Suite</h2>
              {isDirector && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span>Director Sanction Authority</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal">
              Barbrik Project Ltd. Corporate Banking, Master Beneficiary Directory &amp; Interbank Transfers
            </p>
          </div>
        </div>

        {/* 3 Switchers - Scrollable on mobile without squishing */}
        <div className="w-full sm:w-auto overflow-x-auto flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl no-scrollbar whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveSwitcher('PAYMENTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSwitcher === 'PAYMENTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 shrink-0" />
            <span>Bank Payments</span>
            {pendingPaymentsCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeSwitcher === 'PAYMENTS' ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
              }`}>
                {pendingPaymentsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSwitcher('BENEFICIARIES')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSwitcher === 'BENEFICIARIES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>Beneficiary Master</span>
            {pendingBenCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeSwitcher === 'BENEFICIARIES' ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
              }`}>
                {pendingBenCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSwitcher('IBT')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeSwitcher === 'IBT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Interbank Transfer</span>
            {pendingIbtCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                activeSwitcher === 'IBT' ? 'bg-white text-indigo-700' : 'bg-amber-500 text-white'
              }`}>
                {pendingIbtCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Switcher Content */}
      {activeSwitcher === 'PAYMENTS' && (
        <BankPaymentsFmsView
          currentUser={currentUser}
          searchQuery={searchQuery}
          siteFilter={siteFilter}
          onRefresh={onRefresh}
        />
      )}

      {activeSwitcher === 'BENEFICIARIES' && (
        <BeneficiaryMasterView
          currentUser={currentUser}
          searchQuery={searchQuery}
          onRefresh={onRefresh}
        />
      )}

      {activeSwitcher === 'IBT' && (
        <InterbankTransferView
          currentUser={currentUser}
          searchQuery={searchQuery}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
