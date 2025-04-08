import React from 'react';
import { BaseQuestionnaire } from './questionnaires/BaseQuestionnaire';

interface SatisfactionQuestionnaireProps {
  onClose: () => void;
  readOnly?: boolean;
  onSubmitSuccess?: () => void;
  adminResponseData?: any;
  companyStatus?: 'valid' | 'pending' | 'not_found';
}

export const SatisfactionQuestionnaire: React.FC<SatisfactionQuestionnaireProps> = ({
  onClose,
  readOnly = false,
  onSubmitSuccess,
  adminResponseData,
  companyStatus = 'valid'
}) => {
  return (
    <BaseQuestionnaire
      onClose={onClose}
      readOnly={readOnly}
      type="satisfaction"
      sous_type={null}
      onSubmitSuccess={onSubmitSuccess}
      adminResponseData={adminResponseData}
      companyStatus={companyStatus}
    />
  );
};