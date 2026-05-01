import { ROLES } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

// Ensures users can only access data within their organization
export function tenantIsolation(req, _res, next) {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    // Super admin can access everything
    return next();
  }

  if (!req.user.organizationId) {
    return next(new AppError("User not assigned to any organization", 403));
  }

  // Enforce organizationId on queries
  req.tenantId = req.user.organizationId;
  next();
}
