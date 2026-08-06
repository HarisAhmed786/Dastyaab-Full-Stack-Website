const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT sent as `Authorization: Bearer <token>`.
 * On success, attaches { id, role } to req.user and calls next().
 * On failure, responds 401 immediately — no route reached without a
 * valid token once this middleware is applied.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

/**
 * Use after requireAuth. Restricts a route to a specific role.
 * Usage: router.patch("/upgrade-to-provider/:id", requireAuth, requireRole("customer"), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `This action requires the '${role}' role.` });
    }
    next();
  };
}

/**
 * Use after requireAuth on routes with an :id / :userId / :providerId param
 * that must match the logged-in user (e.g. you can only edit your own
 * profile, view your own bookings, etc). Pass the name of the param to check.
 * Usage: router.put("/providers/:id", requireAuth, requireSelf("id"), handler)
 */
function requireSelf(paramName) {
  return (req, res, next) => {
    if (!req.user || req.user.id !== req.params[paramName]) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requireSelf };
