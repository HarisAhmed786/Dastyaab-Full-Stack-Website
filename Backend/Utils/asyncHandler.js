/**
 * Wraps an async Express route handler so any thrown/rejected error is
 * forwarded to next(err) automatically, instead of every route needing
 * its own try/catch + res.status(500).json(...).
 *
 * Usage:
 *   router.get("/providers", asyncHandler(async (req, res) => {
 *     const providers = await User.find({ role: "provider" });
 *     res.json(providers);
 *   }));
 *
 * Errors then land in the centralized error handler in server.js.
 *
 * Adoption note: existing routes still have their own try/catch blocks
 * and work fine as-is. We're introducing this now so Phase 2/3 route
 * changes (auth checks, validation) can be wired in cleanly without
 * carrying forward the old boilerplate.
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
