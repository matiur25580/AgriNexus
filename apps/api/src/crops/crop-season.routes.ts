import { Router } from "express";
import { z } from "zod";
import { requireOrganization } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/permissions.js";
import { asyncRoute } from "../lib/async-route.js";
import { HttpError } from "../lib/http-error.js";
import { CropSeason } from "../models/crop-season.model.js";
import { CropStageEvent } from "../models/crop-stage-event.model.js";
import { Farm } from "../models/farm.model.js";
import { Plot } from "../models/plot.model.js";

export const cropSeasonRouter = Router();
type CropSeasonRecord = { _id: unknown; startDate: Date; farmId: unknown; plotId: unknown };
const objectId = /^[a-f\d]{24}$/i;
const stages = ["land_preparation", "sowing", "transplanting", "germination", "vegetative", "flowering", "fruiting", "harvesting", "post_harvest"] as const;
const createSchema = z.object({
  farmId: z.string().regex(objectId), plotId: z.string().regex(objectId),
  seasonName: z.string().trim().min(2).max(100), cropName: z.string().trim().min(2).max(120),
  variety: z.string().max(120).optional(),
  startDate: z.coerce.date(), expectedHarvestDate: z.coerce.date(),
  targetYieldKgPerHectare: z.number().min(0).max(100000).optional(),
  targetTotalYieldKg: z.number().min(0).max(1000000000).optional(),
  notes: z.string().max(2000).optional(),
}).refine(v => v.expectedHarvestDate > v.startDate, { message: "Expected harvest date must be after the start date." });
const updateSchema = z.object({
  seasonName: z.string().trim().min(2).max(100).optional(),
  variety: z.string().max(120).optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  targetYieldKgPerHectare: z.number().min(0).max(100000).nullable().optional(),
  targetTotalYieldKg: z.number().min(0).max(1000000000).nullable().optional(),
  actualHarvestKg: z.number().min(0).max(1000000000).nullable().optional(),
  notes: z.string().max(2000).optional(),
});
const eventSchema = z.object({
  stage: z.enum(stages), occurredAt: z.coerce.date(),
  summary: z.string().trim().min(3).max(500), notes: z.string().max(2000).optional(),
  quantity: z.number().min(0).max(1000000000).optional(),
  quantityUnit: z.string().max(40).optional(),
});
cropSeasonRouter.use(requireOrganization);

cropSeasonRouter.get("/", requirePermission("plots:read"), asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter: Record<string, unknown> = { organizationId: req.organization!.id };
  if (req.query.plotId && objectId.test(String(req.query.plotId))) filter.plotId = String(req.query.plotId);
  if (req.query.farmId && objectId.test(String(req.query.farmId))) filter.farmId = String(req.query.farmId);
  if (req.query.status && ["planned", "active", "completed", "cancelled"].includes(String(req.query.status))) filter.status = String(req.query.status);
  const [items, total] = await Promise.all([
    CropSeason.find(filter).sort({ startDate: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
    CropSeason.countDocuments(filter).exec(),
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

cropSeasonRouter.post("/", requirePermission("plots:write"), asyncRoute(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Provide valid crop, plot, season, and date details.");
  const plot = await Plot.findOne({ _id: parsed.data.plotId, farmId: parsed.data.farmId, organizationId: req.organization!.id, status: "active" }).lean().exec();
  if (!plot) throw new HttpError(404, "PLOT_NOT_FOUND", "An active plot in the selected farm and organization was not found.");
  const farm = await Farm.exists({ _id: parsed.data.farmId, organizationId: req.organization!.id });
  if (!farm) throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
  const season = await CropSeason.create({ ...parsed.data, organizationId: req.organization!.id, createdBy: req.auth!.userId, updatedBy: req.auth!.userId });
  res.status(201).json({ success: true, data: season });
}));

cropSeasonRouter.get("/:seasonId", requirePermission("plots:read"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.seasonId!)) throw new HttpError(400, "INVALID_SEASON_ID", "The season ID is invalid.");
  const season = await CropSeason.findOne({ _id: req.params.seasonId, organizationId: req.organization!.id }).lean().exec() as unknown as CropSeasonRecord | null;
  if (!season) throw new HttpError(404, "SEASON_NOT_FOUND", "Crop season not found.");
  res.json({ success: true, data: season });
}));

cropSeasonRouter.patch("/:seasonId", requirePermission("plots:write"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.seasonId!)) throw new HttpError(400, "INVALID_SEASON_ID", "The season ID is invalid.");
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) throw new HttpError(400, "VALIDATION_ERROR", "Provide at least one valid season field to update.");
  const existing = await CropSeason.findOne({ _id: req.params.seasonId, organizationId: req.organization!.id }).lean().exec() as unknown as Pick<CropSeasonRecord, "startDate"> | null;
  if (!existing) throw new HttpError(404, "SEASON_NOT_FOUND", "Crop season not found.");
  if (parsed.data.expectedHarvestDate && parsed.data.expectedHarvestDate <= existing.startDate) throw new HttpError(400, "INVALID_SEASON_DATES", "Expected harvest date must be after the season start date.");
  const season = await CropSeason.findOneAndUpdate({ _id: req.params.seasonId, organizationId: req.organization!.id }, { $set: { ...parsed.data, updatedBy: req.auth!.userId } }, { new: true, runValidators: true }).lean().exec();
  res.json({ success: true, data: season });
}));

cropSeasonRouter.get("/:seasonId/events", requirePermission("plots:read"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.seasonId!)) throw new HttpError(400, "INVALID_SEASON_ID", "The season ID is invalid.");
  const season = await CropSeason.findOne({ _id: req.params.seasonId, organizationId: req.organization!.id }).lean().exec() as unknown as CropSeasonRecord | null;
  if (!season) throw new HttpError(404, "SEASON_NOT_FOUND", "Crop season not found.");
  const events = await CropStageEvent.find({ seasonId: season._id, organizationId: req.organization!.id }).sort({ occurredAt: 1 }).lean().exec();
  res.json({ success: true, data: events });
}));

cropSeasonRouter.post("/:seasonId/events", requirePermission("plots:write"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.seasonId!)) throw new HttpError(400, "INVALID_SEASON_ID", "The season ID is invalid.");
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Provide a valid crop stage and event summary.");
  const season = await CropSeason.findOne({ _id: req.params.seasonId, organizationId: req.organization!.id }).lean().exec() as unknown as CropSeasonRecord | null;
  if (!season) throw new HttpError(404, "SEASON_NOT_FOUND", "Crop season not found.");
  if (parsed.data.occurredAt < season.startDate) throw new HttpError(400, "EVENT_BEFORE_SEASON", "A crop event cannot occur before the season start date.");
  const latest = await CropStageEvent.findOne({ seasonId: season._id, organizationId: req.organization!.id }).sort({ occurredAt: -1 }).lean().exec() as unknown as { occurredAt: Date } | null;
  if (latest && parsed.data.occurredAt <= latest.occurredAt) throw new HttpError(409, "EVENT_ORDER_CONFLICT", "Crop stage events must be recorded in chronological order with unique timestamps.");
  const event = await CropStageEvent.create({
    ...parsed.data, organizationId: req.organization!.id, seasonId: season._id,
    farmId: season.farmId, plotId: season.plotId, recordedBy: req.auth!.userId,
  });
  res.status(201).json({ success: true, data: event });
}));
