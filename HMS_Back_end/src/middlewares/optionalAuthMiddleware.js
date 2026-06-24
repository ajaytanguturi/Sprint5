const jwt = require("jsonwebtoken");

// Best-effort employee identity for routes that must work with or without a live
// access token (e.g. logout). Verifies the signature but tolerates expiry, since
// it only attributes an action and grants no access — a just-expired token can
// still name the actor. Never rejects: on any failure it leaves req.user unset.
const attachEmployeeOptional = (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"],
                ignoreExpiration: true
            });

            if (payload.type === "EMPLOYEE" && payload.employeeCode) {
                req.user = payload;
            }
        } catch {
            // Forged/malformed token: continue unauthenticated
        }
    }

    next();
};

module.exports = attachEmployeeOptional;
