/**
 * OPEN DECISION (contradiction #3): BAB 3 specifies an execution ceiling of
 * <= 10 seconds. Module 04 copy says "inside the 5-second ceiling" and the
 * submissions table shows a Time Limit Exceeded verdict at exactly 5.00 s.
 * Named constant so one edit settles it once the team decides.
 */
export const EXECUTION_CEILING_MS = 5000;

/** OPEN DECISION (contradiction #7): no time limit exists in the proposal. */
export const SESSION_DURATION_SECONDS = 60 * 60;

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
export const PORT = Number(process.env.PORT || 4000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
