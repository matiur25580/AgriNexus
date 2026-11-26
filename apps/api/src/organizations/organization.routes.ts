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
  const memberships = await Membership.find({ userId: req.auth!.userId, status: "active" }).populate({ path: "organizationId", match: { status: "active" }, select: "name slug createdAt" }).lean();
  res.json({ success: true, data: memberships.filter((m) => m.organizationId).map((m) => {
    const org = m.organizationId as unknown as { _id: { toString(): string }; name: string; slug: string; createdAt: Date };
    return { id: org._id.toString(), name: org.name, slug: org.slug, role: m.role, createdAt: org.createdAt };
  }) });
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
  const organization = await Organization.findById(req.organization!.id).select("name slug status").lean();
  if (!organization || organization.status !== "active") throw new HttpError(404, "ORGANIZATION_NOT_FOUND", "The organization is unavailable.");
  res.json({ success: true, data: { id: organization._id.toString(), name: organization.name, slug: organization.slug, role: req.organization!.role } });
}));
