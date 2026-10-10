import Question from '../models/Question.js';

// Mongo cannot sort enum strings by meaning, so the order is applied in memory.
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

/**
 * Strips what must never leave the server. correct_answer is already excluded
 * by the schema (select:false); it is removed here too so a document loaded
 * with +correct_answer cannot leak through this path.
 */
export function toSafeQuestion(q) {
  const { correct_answer, test_cases, ...rest } = typeof q.toObject === 'function' ? q.toObject() : q;
  return {
    ...rest,
    test_cases: (test_cases || []).filter((c) => !c.is_hidden),
    hidden_case_count: (test_cases || []).filter((c) => c.is_hidden).length,
  };
}

/** Published questions, easy -> medium -> hard, then by _id; optionally one difficulty. */
export async function listPublished(difficulty) {
  const filter = { is_published: true };
  if (difficulty !== undefined) filter.difficulty = difficulty;
  const docs = await Question.find(filter).sort({ _id: 1 }).lean();
  return docs.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
}
