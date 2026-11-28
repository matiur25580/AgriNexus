import mongoose, { Schema } from "mongoose";
const cropStageEventSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  seasonId: { type: Schema.Types.ObjectId, ref: "CropSeason", required: true, index: true },
  farmId: { type: Schema.Types.ObjectId, ref: "Farm", required: true, index: true },
  plotId: { type: Schema.Types.ObjectId, ref: "Plot", required: true, index: true },
  stage: { type: String, enum: ["land_preparation", "sowing", "transplanting", "germination", "vegetative", "flowering", "fruiting", "harvesting", "post_harvest"], required: true },
  occurredAt: { type: Date, required: true },
  summary: { type: String, required: true, trim: true, maxlength: 500 },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  quantity: { type: Number, min: 0, max: 1000000000, default: null },
  quantityUnit: { type: String, trim: true, maxlength: 40, default: "" },
  recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
cropStageEventSchema.index({ organizationId: 1, seasonId: 1, occurredAt: 1 }, { unique: true });
export const CropStageEvent: mongoose.Model<any> = mongoose.models.CropStageEvent ?? mongoose.model("CropStageEvent", cropStageEventSchema);
