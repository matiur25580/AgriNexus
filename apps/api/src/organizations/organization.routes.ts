import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../lib/async-route.js";
import { HttpError } from "../lib/http-error.js";
import { Membership } from "../models/membership.model.js";
import { Organization } from "../models/organization.model.js";
import { requireAuth, requireOrganization } from "../auth/auth.middleware.js";
export const organizationRouter = Router();
const createSchema = z.object({ name: z.string().trim().min(2).max(120) });
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "organization"; }
organizationRouter.use(requireAuth);
organizationRouter.get("/", asyncRoute(async (req, res) => {
  const memberships = await Membership.find({ userId: req.auth!.userId, status: "active" }).exec();
  const organizations = await Organization.find({ _id: { $in: memberships.map((m) => m.organizationId) }, status: "active" }).select("name slug createdAt").exec();
  const roles = new Map(memberships.map((m) => [m.organizationId.toString(), m.role] as const));
  res.json({ success: true, data: organizations.map((org) => ({ id: org._id.toString(), name: org.name, slug: org.slug, role: roles.get(org._id.toString()), createdAt: org.createdAt })) });
}));
organizationRouter.post("/", asyncRoute(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Organization name must contain 2–120 characters.");
  const userId = req.auth!.userId;
  const organization = await Organization.create({ name: parsed.data.name, slug: `${slugify(parsed.data.name)}-${randomUUID().slice(0, 8)}`, createdBy: userId });
  await Membership.create({ organizationId: organization._id, userId, role: "owner", status: "active" });
  res.status(201).json({ success: true, data: { id: organization.id, name: organization.name, slug: organization.slug, role: "owner" } });
}));
organizationRouter.get("/context", requireOrganization, asyncRoute(async (req, res) => {
  const organization = await Organization.findById(req.organization!.id).select("name slug status").exec();
  if (!organization || organization.status !== "active") throw new HttpError(404, "ORGANIZATION_NOT_FOUND", "The organization is unavailable.");
  res.json({ success: true, data: { id: organization._id.toString(), name: organization.name, slug: organization.slug, role: req.organization!.role } });
}));
