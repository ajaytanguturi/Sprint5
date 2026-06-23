// httpOnly refresh-token cookie for the staff web app. Mobile clients use the
// body-based refresh token instead, so this only applies to the employee routes.
const REFRESH_COOKIE_NAME = "refreshToken";
const DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly keeps it out of reach of JS/XSS; Secure requires HTTPS in production;
// path scopes it so the browser only sends it to the auth endpoints
const baseCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth"
});

const setRefreshCookie = (res, token) =>
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...baseCookieOptions(),
        maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) * DAY_MS
    });

const clearRefreshCookie = (res) =>
    res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());

module.exports = {
    REFRESH_COOKIE_NAME,
    setRefreshCookie,
    clearRefreshCookie
};
