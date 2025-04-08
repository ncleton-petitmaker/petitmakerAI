export type QuestionnaireType = 'positioning' | 'initial_final_evaluation' | 'satisfaction';
export type QuestionnaireSubType = 'initial' | 'final' | null;

export interface Question {
  id: string;
  template_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer' | 'rating' | 'yes_no';
  options?: string[];
  correct_answer?: string | null;
  order_index: number;
  is_required: boolean;
}

export interface QuestionnaireStatuses {
  positioning: { available: boolean; completed: boolean };
  initial: { available: boolean; completed: boolean };
  final: { available: boolean; completed: boolean };
  satisfaction: { available: boolean; completed: boolean };
}

export interface QuestionnaireScores {
  initial: number | null;
  final: number | null;
} 