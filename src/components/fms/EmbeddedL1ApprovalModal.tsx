import React from 'react';
import {
  ComparativeStatement,
  FmsInstance,
  UserProfile
} from '../../types';
import { ComparativeStatementWorkspace } from '../comparative/ComparativeStatementWorkspace';

export interface EmbeddedL1ApprovalModalProps {
  isOpen: boolean;
  flow: FmsInstance;
  stageIndex: number;
  csSheet?: ComparativeStatement | null;
  currentUser: UserProfile;
  onClose: () => void;
  onApproveL1: (updatedCs: ComparativeStatement, remarks: string) => void;
}

export const EmbeddedL1ApprovalModal: React.FC<EmbeddedL1ApprovalModalProps> = ({
  isOpen,
  flow,
  stageIndex,
  csSheet,
  currentUser,
  onClose,
  onApproveL1,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-7xl w-full shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in duration-200">
        <div className="p-4 sm:p-6 overflow-y-auto">
          <ComparativeStatementWorkspace
            isEmbedded={true}
            flow={flow}
            stageIndex={stageIndex}
            mode="APPROVAL"
            initialCs={csSheet || undefined}
            currentUser={currentUser}
            onClose={onClose}
            onSaveAndLink={(approvedCs) => {
              onApproveL1(
                approvedCs,
                approvedCs.approvalDetails?.remarks || 'Approved by Director Pranjal Agrawal'
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};
