import { STATUS_CODES } from 'node:http';
import mongoose from 'mongoose';
import { HttpError } from '../errors.js';

// Express 5 needs the 4-arg signature to recognise an error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: STATUS_CODES[err.status], reason: err.reason, ...err.extra });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return res.status(400).json({ error: 'Bad Request', reason: 'validation_failed', details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ error: 'Not Found', reason: 'invalid_id' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Conflict', reason: 'duplicate' });
  }
  // Stack stays server-side; clients only get a generic reason.
  console.error(err);
  return res.status(500).json({ error: 'Internal Server Error', reason: 'internal' });
}
