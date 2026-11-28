import mongoose, { Schema } from "mongoose";
const farmSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  areaHectares: { type: Number, required: true, min: 0.01, max: 1000000 },
  allocatedAreaHectares: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive", "archived"], default: "active", index: true },
  location: {
    address: { type: String, trim: true, maxlength: 300, default: "" },
    village: { type: String, trim: true, maxlength: 120, default: "" },
    district: { type: String, trim: true, maxlength: 120, default: "" },
    state: { type: String, trim: true, maxlength: 120, default: "" },
    country: { type: String, trim: true, maxlength: 120, default: "India" },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, versionKey: false });
farmSchema.index({ organizationId: 1, code: 1 }, { unique: true });
farmSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
export const Farm: mongoose.Model<any> = mongoose.models.Farm ?? mongoose.model("Farm", farmSchema);
