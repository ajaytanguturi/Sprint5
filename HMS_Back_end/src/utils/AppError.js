// Operational error translated into an HTTP response by the global error handler
class AppError extends Error {

    // Takes a 4xx/5xx status, a catalog message, an optional field-level error
    // array, and an optional machine-readable code for clients to branch on
    constructor(statusCode, message, errors = undefined, code = undefined) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.errors = errors;
        this.code = code;
        // Marks errors we threw on purpose, as opposed to programmer bugs
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
