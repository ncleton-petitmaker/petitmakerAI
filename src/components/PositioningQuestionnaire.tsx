import React from 'react';
import { BaseQuestionnaire } from './questionnaires/BaseQuestionnaire';
import { QuestionnaireType, QuestionnaireSubType } from '../types/questionnaire';

interface PositioningQuestionnaireProps {
  onClose: () => void;
  readOnly?: boolean;
  type: QuestionnaireType;
  sous_type?: QuestionnaireSubType;
  onSubmitSuccess?: () => void;
  adminResponseData?: any;
  companyStatus?: 'valid' | 'pending' | 'not_found';
}

export const PositioningQuestionnaire: React.FC<PositioningQuestionnaireProps> = ({ 
  onClose, 
  readOnly = false, 
  type = 'positioning',
  sous_type = null,
  onSubmitSuccess,
  adminResponseData,
  companyStatus = 'valid'
}) => {
  console.log('🔍 [DEBUG] PositioningQuestionnaire props:', {
    type,
    sous_type,
    readOnly, 
    companyStatus
  });

  return (
    <BaseQuestionnaire
      onClose={onClose}
      readOnly={readOnly}
      type={type}
      sous_type={sous_type}
      onSubmitSuccess={onSubmitSuccess}
      adminResponseData={adminResponseData}
      companyStatus={companyStatus}
    />
  );
};