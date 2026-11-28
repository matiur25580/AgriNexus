import mongoose, { Schema } from "mongoose";
const plotSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  areaHectares: { type: Number, required: true, min: 0.01, max: 100000 },
  soilType: { type: String, enum: ["alluvial", "black", "red", "laterite", "sandy", "clay", "loamy", "other"], default: "other" },
  irrigationType: { type: String, enum: ["rainfed", "drip", "sprinkler", "flood", "other"], default: "other" },
  currentCrop: { type: String, trim: true, maxlength: 120, default: null },
  status: { type: String, enum: ["active", "fallow", "inactive"], default: "active", index: true },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
plotSchema.index({ organizationId: 1, farmId: 1, code: 1 }, { unique: true });
plotSchema.index({ organizationId: 1, farmId: 1, status: 1 });
export const Plot: mongoose.Model<any> = mongoose.models.Plot ?? mongoose.model("Plot", plotSchema);
