const { validationResult } = require('express-validator');

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