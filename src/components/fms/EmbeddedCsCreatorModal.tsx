import React from 'react';
import {
  ComparativeStatement,
  FmsInstance,
  UserProfile
} from '../../types';
import { ComparativeStatementWorkspace } from '../comparative/ComparativeStatementWorkspace';

export interface EmbeddedCsCreatorModalProps {
  isOpen: boolean;
  flow: FmsInstance;
  stageIndex: number;
  currentUser: UserProfile;
  onClose: () => void;
  onSaveAndLink: (cs: ComparativeStatement) => void;
}

export const EmbeddedCsCreatorModal: React.FC<EmbeddedCsCreatorModalProps> = ({
  isOpen,
  flow,
  stageIndex,
  currentUser,
  onClose,
  onSaveAndLink,
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
            mode="EDIT"
            currentUser={currentUser}
            onClose={onClose}
            onSaveAndLink={onSaveAndLink}
          />
        </div>
      </div>
    </div>
  );
};
