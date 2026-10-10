/** Error with an HTTP status; the central handler turns it into { error, reason, ...extra }. */
export class HttpError extends Error {
  constructor(status, reason, extra = {}) {
    super(reason);
    this.status = status;
    this.reason = reason;
    this.extra = extra;
  }
}
