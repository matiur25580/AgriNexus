import { Router } from "express";
import { z } from "zod";
import { requireOrganization } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/permissions.js";
import { asyncRoute } from "../lib/async-route.js";
import { HttpError } from "../lib/http-error.js";
import { Farm } from "../models/farm.model.js";
import { Plot } from "../models/plot.model.js";
export const farmRouter = Router();
const locationSchema = z.object({
  address: z.string().max(300).optional(), village: z.string().max(120).optional(),
  district: z.string().max(120).optional(), state: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).optional();
const createFarmSchema = z.object({
  name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().max(1000).optional(), areaHectares: z.number().positive().max(1000000),
  location: locationSchema,
});
const updateFarmSchema = createFarmSchema.partial().extend({ status: z.enum(["active", "inactive", "archived"]).optional() });
const createPlotSchema = z.object({
  name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  areaHectares: z.number().positive().max(100000), soilType: z.enum(["alluvial", "black", "red", "laterite", "sandy", "clay", "loamy", "other"]).optional(),
  irrigationType: z.enum(["rainfed", "drip", "sprinkler", "flood", "other"]).optional(),
  currentCrop: z.string().max(120).nullable().optional(), status: z.enum(["active", "fallow", "inactive"]).optional(), notes: z.string().max(1000).optional(),
});
const updatePlotSchema = createPlotSchema.partial();
const objectId = /^[a-f\d]{24}$/i;
farmRouter.use(requireOrganization);
farmRouter.get("/", requirePermission("farms:read"), asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter: Record<string, unknown> = { organizationId: req.organization!.id };
  if (req.query.status && ["active", "inactive", "archived"].includes(String(req.query.status))) filter.status = String(req.query.status);
  const [items, total] = await Promise.all([
    Farm.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
    Farm.countDocuments(filter).exec(),
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
farmRouter.post("/", requirePermission("farms:write"), asyncRoute(async (req, res) => {
  const parsed = createFarmSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Provide a valid farm name, code, and positive area in hectares.");
  const farm = await Farm.create({ ...parsed.data, organizationId: req.organization!.id, createdBy: req.auth!.userId, updatedBy: req.auth!.userId });
  res.status(201).json({ success: true, data: farm });
}));
farmRouter.get("/:farmId", requirePermission("farms:read"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.farmId!)) throw new HttpError(400, "INVALID_FARM_ID", "The farm ID is invalid.");
  const farm = await Farm.findOne({ _id: req.params.farmId, organizationId: req.organization!.id }).lean().exec();
  if (!farm) throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
  res.json({ success: true, data: farm });
}));
farmRouter.patch("/:farmId", requirePermission("farms:write"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.farmId!)) throw new HttpError(400, "INVALID_FARM_ID", "The farm ID is invalid.");
  const parsed = updateFarmSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) throw new HttpError(400, "VALIDATION_ERROR", "Provide at least one valid farm field to update.");
  if (parsed.data.areaHectares !== undefined) {
    const allocated = await Farm.exists({ _id: req.params.farmId, organizationId: req.organization!.id, allocatedAreaHectares: { $gt: parsed.data.areaHectares } });
    if (allocated) throw new HttpError(409, "FARM_AREA_BELOW_ALLOCATED_PLOTS", "Farm area cannot be reduced below the combined area of its registered plots.");
  }
  const farm = await Farm.findOneAndUpdate({ _id: req.params.farmId, organizationId: req.organization!.id }, { $set: { ...parsed.data, updatedBy: req.auth!.userId } }, { new: true, runValidators: true }).lean().exec();
  if (!farm) throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
  res.json({ success: true, data: farm });
}));
farmRouter.get("/:farmId/plots", requirePermission("plots:read"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.farmId!)) throw new HttpError(400, "INVALID_FARM_ID", "The farm ID is invalid.");
  const farm = await Farm.exists({ _id: req.params.farmId, organizationId: req.organization!.id });
  if (!farm) throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
  const plots = await Plot.find({ organizationId: req.organization!.id, farmId: req.params.farmId }).sort({ createdAt: -1 }).lean().exec();
  res.json({ success: true, data: plots });
}));
farmRouter.post("/:farmId/plots", requirePermission("plots:write"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.farmId!)) throw new HttpError(400, "INVALID_FARM_ID", "The farm ID is invalid.");
  const parsed = createPlotSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Provide valid plot details and a positive area in hectares.");
  const farm = await Farm.exists({ _id: req.params.farmId, organizationId: req.organization!.id, status: "active" });
  if (!farm) throw new HttpError(404, "FARM_NOT_FOUND", "An active farm in this organization was not found.");
  const reserved = await Farm.findOneAndUpdate({ _id: req.params.farmId, organizationId: req.organization!.id, status: "active", $expr: { $lte: [{ $add: [{ $ifNull: ["$allocatedAreaHectares", 0] }, parsed.data.areaHectares] }, "$areaHectares"] } }, { $inc: { allocatedAreaHectares: parsed.data.areaHectares } }, { new: true }).exec();
  if (!reserved) throw new HttpError(409, "PLOT_AREA_EXCEEDS_FARM", "Combined plot area cannot exceed the registered farm area.");
  let plot;
  try {
    plot = await Plot.create({ ...parsed.data, organizationId: req.organization!.id, farmId: req.params.farmId, createdBy: req.auth!.userId, updatedBy: req.auth!.userId });
  } catch (error) {
    await Farm.updateOne({ _id: req.params.farmId, organizationId: req.organization!.id }, { $inc: { allocatedAreaHectares: -parsed.data.areaHectares } }).exec();
    throw error;
  }
  res.status(201).json({ success: true, data: plot });
}));
