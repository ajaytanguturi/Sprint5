const mongoose = require("mongoose");

// Server-side record for an opaque refresh token. The raw token is never stored;
// only its sha256 hash, so a DB read cannot recover a usable token.
const refreshTokenSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: true,
            unique: true
        },
        subjectType: {
            type: String,
            enum: ["EMPLOYEE", "PATIENT"],
            required: true
        },
        // employeeCode for staff, UHID for patients
        subjectId: {
            type: String,
            required: true
        },
        // Rotation lineage; reuse of a consumed token revokes the whole family
        familyId: {
            type: String,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        revokedAt: {
            type: Date,
            default: null
        },
        // Hash of the token that superseded this one on rotation
        replacedByHash: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        ip: {
            type: String,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

// TTL index: Mongo purges each document once expiresAt passes
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ subjectType: 1, subjectId: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
