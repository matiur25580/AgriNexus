import { Router } from "express";
import { z } from "zod";
import { requireOrganization } from "../auth/auth.middleware.js";
import { requirePermission } from "../auth/permissions.js";
import { asyncRoute } from "../lib/async-route.js";
import { HttpError } from "../lib/http-error.js";
import { Farm } from "../models/farm.model.js";
import { Plot } from "../models/plot.model.js";
export const plotRouter = Router();
const objectId = /^[a-f\d]{24}$/i;
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  areaHectares: z.number().positive().max(100000).optional(),
  soilType: z.enum(["alluvial", "black", "red", "laterite", "sandy", "clay", "loamy", "other"]).optional(),
  irrigationType: z.enum(["rainfed", "drip", "sprinkler", "flood", "other"]).optional(),
  currentCrop: z.string().max(120).nullable().optional(),
  status: z.enum(["active", "fallow", "inactive"]).optional(),
  notes: z.string().max(1000).optional(),
});
plotRouter.use(requireOrganization);
plotRouter.get("/:plotId", requirePermission("plots:read"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.plotId!)) throw new HttpError(400, "INVALID_PLOT_ID", "The plot ID is invalid.");
  const plot = await Plot.findOne({ _id: req.params.plotId, organizationId: req.organization!.id }).lean().exec();
  if (!plot) throw new HttpError(404, "PLOT_NOT_FOUND", "Plot not found.");
  res.json({ success: true, data: plot });
}));
plotRouter.patch("/:plotId", requirePermission("plots:write"), asyncRoute(async (req, res) => {
  if (!objectId.test(req.params.plotId!)) throw new HttpError(400, "INVALID_PLOT_ID", "The plot ID is invalid.");
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) throw new HttpError(400, "VALIDATION_ERROR", "Provide at least one valid plot field to update.");
  const existing = await Plot.findOne({ _id: req.params.plotId, organizationId: req.organization!.id }).exec();
  if (!existing) throw new HttpError(404, "PLOT_NOT_FOUND", "Plot not found.");
  const nextArea = parsed.data.areaHectares ?? existing.areaHectares;
  const delta = nextArea - existing.areaHectares;
  if (delta > 0) {
    const reserved = await Farm.findOneAndUpdate({ _id: existing.farmId, organizationId: req.organization!.id, status: "active", $expr: { $lte: [{ $add: [{ $ifNull: ["$allocatedAreaHectares", 0] }, delta] }, "$areaHectares"] } }, { $inc: { allocatedAreaHectares: delta } }, { new: true }).exec();
    if (!reserved) throw new HttpError(409, "PLOT_AREA_EXCEEDS_FARM", "Combined plot area cannot exceed the registered farm area.");
  }
  let plot;
  try {
    plot = await Plot.findOneAndUpdate({ _id: req.params.plotId, organizationId: req.organization!.id }, { $set: { ...parsed.data, updatedBy: req.auth!.userId } }, { new: true, runValidators: true }).lean().exec();
    if (!plot) throw new HttpError(404, "PLOT_NOT_FOUND", "Plot not found.");
  } catch (error) {
    if (delta > 0) await Farm.updateOne({ _id: existing.farmId, organizationId: req.organization!.id }, { $inc: { allocatedAreaHectares: -delta } }).exec();
    throw error;
  }
  if (delta < 0) await Farm.updateOne({ _id: existing.farmId, organizationId: req.organization!.id }, { $inc: { allocatedAreaHectares: delta } }).exec();
  res.json({ success: true, data: plot });
}));
