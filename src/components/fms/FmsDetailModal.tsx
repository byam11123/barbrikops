import React from 'react';
import { FmsInstance, UserProfile } from '../../types';
import { FmsIndividualView } from './FmsIndividualView';

interface FmsDetailModalProps {
  flow: FmsInstance | null;
  currentUser: UserProfile;
  onClose: () => void;
  onUpdateFlow?: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
  allFlows?: FmsInstance[];
  onSelectFlow?: (flow: FmsInstance) => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
}

export const FmsDetailModal: React.FC<FmsDetailModalProps> = ({
  flow,
  currentUser,
  onClose,
  onUpdateFlow,
  onOpenStageAction,
}) => {
  if (!flow) return null;

  return (
    <FmsIndividualView
      flow={flow}
      currentUser={currentUser}
      onBack={onClose}
      onUpdateFlow={onUpdateFlow}
      onOpenStageAction={onOpenStageAction}
    />
  );
};
