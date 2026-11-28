import mongoose, { Schema } from "mongoose";
const cropSeasonSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
  plotId: { type: Schema.Types.ObjectId, ref: "Plot", required: true, index: true },
  seasonName: { type: String, required: true, trim: true, maxlength: 100 },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  variety: { type: String, trim: true, maxlength: 120, default: "" },
  status: { type: String, enum: ["planned", "active", "completed", "cancelled"], default: "planned", index: true },
  startDate: { type: Date, required: true },
  expectedHarvestDate: { type: Date, required: true },
  targetYieldKgPerHectare: { type: Number, min: 0, max: 100000, default: null },
  targetTotalYieldKg: { type: Number, min: 0, max: 1000000000, default: null },
  actualHarvestKg: { type: Number, min: 0, max: 1000000000, default: null },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
cropSeasonSchema.index({ organizationId: 1, plotId: 1, startDate: -1 });
cropSeasonSchema.index({ organizationId: 1, status: 1, expectedHarvestDate: 1 });
export const CropSeason: mongoose.Model<any> = mongoose.models.CropSeason ?? mongoose.model("CropSeason", cropSeasonSchema);
