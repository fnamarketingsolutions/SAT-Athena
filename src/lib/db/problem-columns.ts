/** Columns safe to select on `problems` (remote DB may lack question_phonetic). */
export const PROBLEM_SELECT_COLUMNS =
  "id, order_index, difficulty, difficulty_level, question_text, options, correct_option, explanation, solution_steps, hint, detailed_hint, time_recommendation_seconds";

export const PROBLEM_SELECT_COLUMNS_LEGACY =
  "id, order_index, difficulty, question_text, options, correct_option, explanation, solution_steps, hint, detailed_hint, time_recommendation_seconds";
