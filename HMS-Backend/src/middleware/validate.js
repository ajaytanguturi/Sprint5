const { validationResult } = require('express-validator');

/**
 * Runs express-validator checks and returns a structured 422 if any fail.
 * Attach this after your rule arrays in any route that needs validation.
 */
const validate = (req, res, next) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
        const formatted = result.array().map((err) => ({
            field: err.path,
            message: err.msg,
        }));

        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: formatted,
        });
    }

    return next();
};

module.exports = { validate };