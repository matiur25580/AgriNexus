import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";
import { Membership } from "../models/membership.model.js";
import { verifyAccessToken } from "./tokens.js";
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new HttpError(401, "UNAUTHENTICATED", "Authentication is required."));
  void verifyAccessToken(header.slice(7)).then(({ userId }) => { req.auth = { userId }; next(); })
    .catch(() => next(new HttpError(401, "INVALID_ACCESS_TOKEN", "The access token is invalid or expired.")));
};
export const requireOrganization: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new HttpError(401, "UNAUTHENTICATED", "Authentication is required."));
  const organizationId = req.header("x-organization-id");
  if (!organizationId || !/^[a-f\d]{24}$/i.test(organizationId)) return next(new HttpError(400, "ORGANIZATION_CONTEXT_REQUIRED", "Provide a valid X-Organization-Id header."));
  void Membership.findOne({ organizationId, userId: req.auth.userId, status: "active" }).exec().then((membership) => {
    if (!membership) return next(new HttpError(403, "ORGANIZATION_ACCESS_DENIED", "You are not an active member of this organization."));
    req.organization = { id: organizationId, role: membership.role };
    next();
  }).catch(next);
};
