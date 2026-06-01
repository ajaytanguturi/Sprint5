const ADMIN_ROLES = new Set(['ADMIN', 'OWNER']);

const buildOwnershipFilter = (user, ownershipField) => {
    if (!user) return {};
    const userRoles = user.roles || [];
    if (userRoles.some((role) => ADMIN_ROLES.has(role))) {
        return {};
    }
    return { [ownershipField]: user.id };
};

module.exports = { buildOwnershipFilter };