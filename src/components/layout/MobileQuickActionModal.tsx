import React from 'react';
import { 
  X, 
  GitBranch, 
  ListTodo, 
  CheckSquare, 
  Boxes, 
  Zap, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, isUserSuperAdmin } from '../../types';

interface MobileQuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
  onCreateFms: () => void;
  onNewTask: () => void;
  onNewChecklist: () => void;
  onStockMovement: () => void;
  onOpenTemplateStudio: () => void;
}

export const MobileQuickActionModal: React.FC<MobileQuickActionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateFms,
  onNewTask,
  onNewChecklist,
  onStockMovement,
  onOpenTemplateStudio,
}) => {
  if (!isOpen) return null;

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const allActions = [
    {
      title: 'New FMS Workflow',
      desc: 'Initialize purchase, stock check, payment, or custom stage flow',
      icon: GitBranch,
      color: 'bg-indigo-600 text-white',
      badge: 'FMS Pipeline',
      adminOnly: false,
      onClick: () => {
        onClose();
        onCreateFms();
      },
    },
    {
      title: 'New Delegation Task',
      desc: 'Assign operational task with SLA date and assignee',
      icon: ListTodo,
      color: 'bg-purple-600 text-white',
      badge: 'Delegation',
      adminOnly: false,
      onClick: () => {
        onClose();
        onNewTask();
      },
    },
    {
      title: 'New Daily Checklist',
      desc: 'Schedule recurring compliance or operational check',
      icon: CheckSquare,
      color: 'bg-blue-600 text-white',
      badge: 'Checklist',
      adminOnly: true,
      onClick: () => {
        onClose();
        onNewChecklist();
      },
    },
    {
      title: 'Record Stock Movement',
      desc: 'Log inward, outward, or transfer inventory transaction',
      icon: Boxes,
      color: 'bg-amber-600 text-white',
      badge: 'IMS Inventory',
      adminOnly: true,
      onClick: () => {
        onClose();
        onStockMovement();
      },
    },
    {
      title: 'FMS Template Studio',
      desc: 'Design or customize workflow stages, checkpoints, and forms',
      icon: Zap,
      color: 'bg-emerald-600 text-white',
      badge: 'Studio',
      adminOnly: true,
      onClick: () => {
        onClose();
        onOpenTemplateStudio();
      },
    },
  ];

  const actions = allActions.filter((a) => (a.adminOnly ? isSuperAdmin : true));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto pb-8 sm:pb-6 pt-3 sm:pt-4 px-4 sm:px-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Quick Action</h3>
            <p className="text-xs text-slate-500">Create new operation entry or launch tool</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 mt-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                type="button"
                onClick={act.onClick}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${act.color} shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {act.title}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                        {act.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {act.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
