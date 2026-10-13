import React, { useState } from 'react';
import { 
  GitFork, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  User, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  CornerDownRight, 
  Tag, 
  FileText, 
  ListChecks, 
  Lock,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';
import { FmsStageTemplate, FmsStageFieldConfig, FmsStageLogicConfig } from '../../types';

interface FmsStagePreviewAccordionProps {
  stages: FmsStageTemplate[];
  startIndex?: number; // Starting index to show (e.g. 1 to show future stages in creation modal)
  title?: string;
  subtitle?: string;
  activeDecision?: 'Yes' | 'No' | ''; // For highlighting conditional branches in quick actions
  compact?: boolean;
}

export const FmsStagePreviewAccordion: React.FC<FmsStagePreviewAccordionProps> = ({
  stages,
  startIndex = 1,
  title = "Workflow Roadmap & Future Stage Fields",
  subtitle = "Preview of downstream stages, required input fields, responsible roles, and conditional rules.",
  activeDecision = '',
  compact = false
}) => {
  const futureStages = stages.slice(startIndex);
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(false);

  if (!stages || stages.length <= startIndex) {
    return null;
  }

  const toggleStage = (stageId: string) => {
    setExpandedStageIds(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const toggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newExpanded: Record<string, boolean> = {};
    futureStages.forEach((s) => {
      newExpanded[s.stageId || s.stageName] = nextState;
    });
    setExpandedStageIds(newExpanded);
  };

  const getFieldTypeBadge = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Approval Decision</span>;
      case 'SELECT':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Dropdown Option</span>;
      case 'FILE':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Attachment Upload</span>;
      case 'URL':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">Web Link</span>;
      case 'NUMBER':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">Numeric Input</span>;
      case 'DATE':
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">Calendar Date</span>;
      default:
        return <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/50">Text Field</span>;
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden transition-all my-3">
      {/* Roadmap Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 leading-tight">
              <span>{title}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {futureStages.length} {futureStages.length === 1 ? 'Upcoming Stage' : 'Upcoming Stages'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
        >
          {allExpanded ? 'Collapse All' : 'Expand All Fields'}
        </button>
      </div>

      {/* Stage Accordion Cards */}
      <div className="p-3 sm:p-4 space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar">
        {futureStages.map((stg, relativeIdx) => {
          const actualStageNum = startIndex + relativeIdx + 1;
          const key = stg.stageId || `stg-${actualStageNum}-${stg.stageName}`;
          const isExpanded = Boolean(expandedStageIds[key] || allExpanded);
          const fields = stg.fields || [];
          const logic = stg.logic;
          const isConditional = logic?.gatewayType === 'APPROVAL_DECISION' || logic?.gatewayType === 'CONDITIONAL_JUMP';

          // Determine branch highlighting if decision is present
          let isTargetedBranch = false;
          if (activeDecision && isConditional) {
            if (activeDecision === 'Yes' && logic?.yesConditionLabel) isTargetedBranch = true;
            if (activeDecision === 'No' && logic?.noConditionLabel) isTargetedBranch = true;
          }

          return (
            <div
              key={key}
              className={`rounded-xl border transition-all overflow-hidden ${
                isTargetedBranch
                  ? 'bg-amber-950/30 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700/90'
              }`}
            >
              {/* Card Title Header */}
              <div
                onClick={() => toggleStage(key)}
                className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isConditional 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    #{actualStageNum}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {stg.stageName}
                      </span>

                      {/* Sequential vs Conditional Badges */}
                      {isConditional ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          Conditional Gateway
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <CornerDownRight className="w-2.5 h-2.5" />
                          Sequential Step
                        </span>
                      )}

                      {stg.subWorkflowTrigger?.enabled && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Triggers {stg.subWorkflowTrigger.targetTemplateKey}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3 h-3 text-slate-400" />
                        {stg.whoDefaultAssignee || stg.whoRole || 'Assigned Officer'}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        SLA: {stg.slaHours || 4} Hrs Target
                      </span>
                      <span className="text-slate-500">
                        • {fields.length} {fields.length === 1 ? 'Input Field' : 'Input Fields'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline-block">
                    {isExpanded ? 'Hide Fields' : 'View Fields'}
                  </span>
                  <div className="p-1 rounded bg-slate-800 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Fields & Details Panel */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
                  
                  {/* Logic / Branch Rule Info Box */}
                  {logic && (
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/80 text-[11px] space-y-1">
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Execution Rule &amp; Gateway Type:</span>
                        <span className="font-mono text-indigo-300">{logic.gatewayType}</span>
                      </div>
                      {logic.gatewayType === 'APPROVAL_DECISION' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div className={`p-1.5 rounded border text-[10px] ${
                            activeDecision === 'Yes' 
                              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-bold' 
                              : 'bg-slate-900/80 border-slate-700 text-slate-300'
                          }`}>
                            <span className="text-emerald-400 font-bold">IF APPROVED:</span> Proceed to next sequential stage
                          </div>
                          <div className={`p-1.5 rounded border text-[10px] ${
                            activeDecision === 'No' 
                              ? 'bg-rose-950/60 border-rose-500/50 text-rose-200 font-bold' 
                              : 'bg-slate-900/80 border-slate-700 text-slate-300'
                          }`}>
                            <span className="text-rose-400 font-bold">IF REJECTED:</span> {logic.rejectionBehavior === 'HALT_WORKFLOW' ? 'Halt workflow & notify requester' : 'Return to previous stage for correction'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input Fields Preview */}
                  {fields.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-indigo-400" />
                        Required Stage Fields ({fields.length})
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fields.map((fld) => (
                          <div
                            key={fld.id}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-200 truncate">
                                {fld.label} {fld.required && <span className="text-rose-400">*</span>}
                              </span>
                              {getFieldTypeBadge(fld.type)}
                            </div>

                            {/* Disabled Input Visual Placeholder */}
                            <div className="relative">
                              <input
                                type="text"
                                disabled
                                readOnly
                                value={fld.placeholder || `[Placeholder: ${fld.label}]`}
                                className="w-full text-[10px] px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed select-none font-mono"
                              />
                              <Lock className="w-2.5 h-2.5 text-slate-600 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            {fld.options && fld.options.length > 0 && (
                              <div className="text-[9px] text-slate-400 flex items-center gap-1 flex-wrap">
                                <span className="font-semibold text-slate-500">Options:</span>
                                {fld.options.slice(0, 4).map((opt, oIdx) => (
                                  <span key={oIdx} className="bg-slate-800/80 text-slate-300 px-1 rounded border border-slate-700/60">
                                    {opt}
                                  </span>
                                ))}
                                {fld.options.length > 4 && (
                                  <span className="text-slate-500">+{fld.options.length - 4} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2 rounded border border-slate-800/60">
                      Standard operational sign-off step (No custom fields configured).
                    </p>
                  )}

                  {/* Verification Checkpoints if present */}
                  {stg.checkpoints && stg.checkpoints.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <ListChecks className="w-3 h-3 text-emerald-400" />
                        Stage Verification Checkpoints ({stg.checkpoints.length})
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-300">
                        {stg.checkpoints.map((cp, cIdx) => (
                          <li key={cIdx} className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{cp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
