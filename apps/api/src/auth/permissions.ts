import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";
export type Permission = "farms:read" | "farms:write" | "plots:read" | "plots:write" | "field:read" | "field:write";
const rolePermissions: Record<NonNullable<Express.Request["organization"]>["role"], readonly Permission[]> = {
  owner: ["farms:read", "farms:write", "plots:read", "plots:write", "field:read", "field:write"],
  admin: ["farms:read", "farms:write", "plots:read", "plots:write", "field:read", "field:write"],
  manager: ["farms:read", "farms:write", "plots:read", "plots:write", "field:read", "field:write"],
  field_agent: ["farms:read", "plots:read", "plots:write", "field:read", "field:write"],
  viewer: ["farms:read", "plots:read", "field:read"],
};
export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.organization) return next(new HttpError(400, "ORGANIZATION_CONTEXT_REQUIRED", "Select an organization before accessing farm resources."));
    if (!rolePermissions[req.organization.role].includes(permission)) return next(new HttpError(403, "PERMISSION_DENIED", "Your organization role does not allow this action."));
    next();
  };
}
