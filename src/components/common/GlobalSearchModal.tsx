import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  GitBranch, 
  ListTodo, 
  CheckSquare, 
  Boxes, 
  Users, 
  Megaphone, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  Building2, 
  FileText,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Command,
  CornerDownLeft
} from 'lucide-react';
import { 
  FmsInstance, 
  DelegationTask, 
  ChecklistItem, 
  InventoryItem, 
  UserProfile, 
  NoticeBoardItem 
} from '../../types';
import { NavTab } from '../layout/Sidebar';

export type GlobalSearchCategory = 'ALL' | 'FMS' | 'DELEGATION' | 'CHECKLIST' | 'IMS' | 'STAFF' | 'NOTICES';

export interface GlobalSearchResultItem {
  id: string;
  category: 'FMS' | 'DELEGATION' | 'CHECKLIST' | 'IMS' | 'STAFF' | 'NOTICES';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  metadata?: string;
  targetTab: NavTab;
  onSelectAction: () => void;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  flows: FmsInstance[];
  delegationTasks: DelegationTask[];
  checklistItems: ChecklistItem[];
  inventoryItems: InventoryItem[];
  usersList: UserProfile[];
  noticeBoardItems: NoticeBoardItem[];
  onNavigateTab: (tab: NavTab) => void;
  onSelectFlowDetail?: (flow: FmsInstance) => void;
  onSelectInventoryItem?: (item: InventoryItem) => void;
  onSelectDelegationTask?: (task: DelegationTask) => void;
  onImpersonateUser?: (user: UserProfile) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  flows,
  delegationTasks,
  checklistItems,
  inventoryItems,
  usersList,
  noticeBoardItems,
  onNavigateTab,
  onSelectFlowDetail,
  onSelectInventoryItem,
  onSelectDelegationTask,
  onImpersonateUser,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlobalSearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultListRef = useRef<HTMLDivElement>(null);

  // Auto focus on open & clear query
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  // Global search results indexing
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }

    const items: GlobalSearchResultItem[] = [];

    // 1. FMS Flows Search
    if (selectedCategory === 'ALL' || selectedCategory === 'FMS') {
      flows.forEach((flow) => {
        const matchesIndent = (flow.indentNo || '').toLowerCase().includes(q);
        const matchesFlowId = (flow.flowId || '').toLowerCase().includes(q);
        const matchesType = (flow.flowType || '').toLowerCase().includes(q);
        const matchesSite = (flow.siteName || '').toLowerCase().includes(q);
        const matchesPo = (flow.poNumber || '').toLowerCase().includes(q);
        const matchesVendor = (flow.vendorName || '').toLowerCase().includes(q);
        const matchesStages = flow.stages.some(
          (s) =>
            s.stageName.toLowerCase().includes(q) ||
            s.assignee.toLowerCase().includes(q) ||
            (s.notes && s.notes.toLowerCase().includes(q))
        );

        if (matchesIndent || matchesFlowId || matchesType || matchesSite || matchesPo || matchesVendor || matchesStages) {
          const currentStage = flow.stages[flow.currentStageIndex];
          items.push({
            id: `fms-${flow.id}`,
            category: 'FMS',
            title: `FMS #${flow.indentNo || flow.flowId}: ${flow.flowType.replace(/_/g, ' ')}`,
            subtitle: `Site: ${flow.siteName} • Current: Stage ${flow.currentStageIndex + 1}/${flow.totalStages} (${currentStage?.stageName || 'In Progress'})`,
            badge: flow.status,
            badgeColor: flow.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
            metadata: flow.vendorName ? `Vendor: ${flow.vendorName}` : flow.poNumber ? `PO: ${flow.poNumber}` : undefined,
            targetTab: 'fms',
            onSelectAction: () => {
              onNavigateTab('fms');
              if (onSelectFlowDetail) {
                onSelectFlowDetail(flow);
              }
              onClose();
            },
          });
        }
      });
    }

    // 2. Delegation Tasks Search
    if (selectedCategory === 'ALL' || selectedCategory === 'DELEGATION') {
      delegationTasks.forEach((d) => {
        const matchesId = (d.taskId || '').toLowerCase().includes(q);
        const matchesTask = (d.task || '').toLowerCase().includes(q);
        const matchesName = (d.name || '').toLowerCase().includes(q);
        const matchesPhone = (d.rolePhone || '').toLowerCase().includes(q);

        if (matchesId || matchesTask || matchesName || matchesPhone) {
          items.push({
            id: `del-${d.id || d.taskId}`,
            category: 'DELEGATION',
            title: `Delegation #${d.taskId}: ${d.task}`,
            subtitle: `Assigned: ${d.name} (${d.rolePhone}) • Target: ${d.firstDate}`,
            badge: d.status,
            badgeColor: d.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : d.status === 'Week Shifted' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800',
            metadata: d.priority ? `Priority: ${d.priority}` : undefined,
            targetTab: 'delegation',
            onSelectAction: () => {
              onNavigateTab('delegation');
              if (onSelectDelegationTask) {
                onSelectDelegationTask(d);
              }
              onClose();
            },
          });
        }
      });
    }

    // 3. Checklist Items Search
    if (selectedCategory === 'ALL' || selectedCategory === 'CHECKLIST') {
      checklistItems.forEach((c) => {
        const matchesId = (c.taskId || '').toLowerCase().includes(q);
        const matchesTask = (c.task || '').toLowerCase().includes(q);
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesDept = (c.department || '').toLowerCase().includes(q);

        if (matchesId || matchesTask || matchesName || matchesDept) {
          items.push({
            id: `chk-${c.id || c.taskId}`,
            category: 'CHECKLIST',
            title: `Checklist #${c.taskId}: ${c.task}`,
            subtitle: `Doer: ${c.name} • Dept: ${c.department} • Frequency: ${c.frequency === 'D' ? 'Daily' : c.frequency === 'W' ? 'Weekly' : 'Monthly'}`,
            badge: c.status,
            badgeColor: c.status === 'Done' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700',
            metadata: `Planned: ${c.plannedDate}`,
            targetTab: 'checklist',
            onSelectAction: () => {
              onNavigateTab('checklist');
              onClose();
            },
          });
        }
      });
    }

    // 4. Inventory IMS Items Search
    if (selectedCategory === 'ALL' || selectedCategory === 'IMS') {
      inventoryItems.forEach((item) => {
        const matchesId = (item.itemId || '').toLowerCase().includes(q);
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesCategory = (item.category || '').toLowerCase().includes(q);
        const matchesLocation = (item.location || '').toLowerCase().includes(q);

        if (matchesId || matchesName || matchesCategory || matchesLocation) {
          const isLow = item.currentStock <= item.minThreshold;
          items.push({
            id: `ims-${item.id || item.itemId}`,
            category: 'IMS',
            title: `Item #${item.itemId}: ${item.name}`,
            subtitle: `Stock: ${item.currentStock} ${item.unit} (Min: ${item.minThreshold}) • Location: ${item.location} • Cond: ${item.condition}`,
            badge: isLow ? 'Low Stock' : 'In Stock',
            badgeColor: isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
            metadata: `Category: ${item.category}`,
            targetTab: 'ims',
            onSelectAction: () => {
              onNavigateTab('ims');
              if (onSelectInventoryItem) {
                onSelectInventoryItem(item);
              }
              onClose();
            },
          });
        }
      });
    }

    // 5. Staff Users Search
    if (selectedCategory === 'ALL' || selectedCategory === 'STAFF') {
      usersList.forEach((user) => {
        const matchesName = (user.name || '').toLowerCase().includes(q);
        const matchesUsername = (user.username || '').toLowerCase().includes(q);
        const matchesRole = (user.role || '').toLowerCase().includes(q);
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesPhone = (user.phone || '').toLowerCase().includes(q);
        const matchesDept = (user.departmentName || '').toLowerCase().includes(q);

        if (matchesName || matchesUsername || matchesRole || matchesEmail || matchesPhone || matchesDept) {
          items.push({
            id: `usr-${user.userId}`,
            category: 'STAFF',
            title: `Staff: ${user.name} (${user.role})`,
            subtitle: `Email: ${user.email} • Phone: ${user.phone || '9827100000'} • Site: ${user.siteLocation || 'Siladehi Site'}`,
            badge: user.systemRole || 'STAFF',
            badgeColor: user.systemRole === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-indigo-100 text-indigo-900',
            metadata: user.departmentName || 'Operations',
            targetTab: 'super-admin',
            onSelectAction: () => {
              onNavigateTab('super-admin');
              onClose();
            },
          });
        }
      });
    }

    // 6. Notices Search
    if (selectedCategory === 'ALL' || selectedCategory === 'NOTICES') {
      noticeBoardItems.forEach((n) => {
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesContent = (n.content || '').toLowerCase().includes(q);
        const matchesCat = (n.category || '').toLowerCase().includes(q);

        if (matchesTitle || matchesContent || matchesCat) {
          items.push({
            id: `notice-${n.id}`,
            category: 'NOTICES',
            title: `Notice: ${n.title}`,
            subtitle: `${n.content.slice(0, 90)}... • Posted: ${n.date} by ${n.author}`,
            badge: n.category,
            badgeColor: 'bg-purple-100 text-purple-900',
            targetTab: 'super-admin',
            onSelectAction: () => {
              onNavigateTab('super-admin');
              onClose();
            },
          });
        }
      });
    }

    return items;
  }, [
    query, 
    selectedCategory, 
    flows, 
    delegationTasks, 
    checklistItems, 
    inventoryItems, 
    usersList, 
    noticeBoardItems, 
    onNavigateTab, 
    onSelectFlowDetail, 
    onSelectInventoryItem, 
    onSelectDelegationTask, 
    onClose
  ]);

  // Keyboard navigation inside search results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].onSelectAction();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (resultListRef.current) {
      const activeEl = resultListRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryPills: { id: GlobalSearchCategory; label: string; icon: any }[] = [
    { id: 'ALL', label: 'All Everything', icon: Search },
    { id: 'FMS', label: 'FMS Flows', icon: GitBranch },
    { id: 'DELEGATION', label: 'Delegation', icon: ListTodo },
    { id: 'CHECKLIST', label: 'Checklist', icon: CheckSquare },
    { id: 'IMS', label: 'Inventory (IMS)', icon: Boxes },
    { id: 'STAFF', label: 'Staff Directory', icon: Users },
    { id: 'NOTICES', label: 'Notice Board', icon: Megaphone },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-3 relative">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search indents, POs, tasks, staff, stock items, checklists, notices..."
              className="w-full text-base sm:text-lg font-bold text-slate-900 placeholder-slate-400 bg-transparent border-none focus:outline-none"
            />
          </div>

          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-200/60 text-slate-600 rounded-lg text-[11px] font-mono font-bold">
            <kbd>ESC</kbd> <span>to close</span>
          </div>

          <button
            onClick={onClose}
            className="sm:hidden p-1.5 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Categories Pill Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          {categoryPills.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Area */}
        <div 
          ref={resultListRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-[260px] max-h-[56vh]"
        >
          {query.trim() === '' ? (
            /* Empty Prompt / Quick Recommendations */
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
                <Command className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Quick Universal Search</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Type any keyword to search across active <strong>FMS Workflows</strong>, <strong>Delegation Tasks</strong>, <strong>Daily SOP Checklists</strong>, <strong>Stock Inventory</strong>, and <strong>Staff Directory</strong>.
                </p>
              </div>

              {/* Quick suggestion tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400">Try searching:</span>
                {['Siladehi', 'Purchase', 'PO', 'Indent', 'Safety', 'Store', 'Ramesh', 'Cement'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setQuery(tag);
                      setSelectedIndex(0);
                    }}
                    className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    "{tag}"
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            /* Zero Results Found */
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">No matching records found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No results matched "{query}" in {selectedCategory === 'ALL' ? 'any module' : selectedCategory}. Try checking for typos or searching a broader keyword.
              </p>
            </div>
          ) : (
            /* Results List */
            results.map((res, index) => {
              const isSelected = index === selectedIndex;
              const isFms = res.category === 'FMS';
              const isDel = res.category === 'DELEGATION';
              const isChk = res.category === 'CHECKLIST';
              const isIms = res.category === 'IMS';
              const isStaff = res.category === 'STAFF';
              const isNotice = res.category === 'NOTICES';

              const Icon = isFms
                ? GitBranch
                : isDel
                ? ListTodo
                : isChk
                ? CheckSquare
                : isIms
                ? Boxes
                : isStaff
                ? Users
                : Megaphone;

              const iconColor = isFms
                ? 'text-indigo-600 bg-indigo-50 border-indigo-100'
                : isDel
                ? 'text-amber-600 bg-amber-50 border-amber-100'
                : isChk
                ? 'text-blue-600 bg-blue-50 border-blue-100'
                : isIms
                ? 'text-orange-600 bg-orange-50 border-orange-100'
                : isStaff
                ? 'text-purple-600 bg-purple-50 border-purple-100'
                : 'text-rose-600 bg-rose-50 border-rose-100';

              return (
                <div
                  key={res.id}
                  onClick={res.onSelectAction}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {res.category}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                          {res.title}
                        </h4>
                        {res.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${res.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {res.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-snug truncate sm:whitespace-normal">
                        {res.subtitle}
                      </p>

                      {res.metadata && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          {res.metadata}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform items-center gap-1">
                      <span>Jump</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <CornerDownLeft className="w-4 h-4 text-slate-400 sm:hidden" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">↓</kbd>
              <span className="hidden sm:inline">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">↵</kbd>
              <span className="hidden sm:inline">Select &amp; Open</span>
            </span>
          </div>

          <div className="font-bold text-slate-600">
            {results.length > 0 ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
          </div>
        </div>

      </div>
    </div>
  );
};
