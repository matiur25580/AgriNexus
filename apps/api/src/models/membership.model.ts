import mongoose, { Schema } from "mongoose";
export const ORGANIZATION_ROLES = ["owner", "admin", "manager", "field_agent", "viewer"] as const;
const membershipSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ORGANIZATION_ROLES, required: true, default: "viewer" },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });
membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
export const Membership = mongoose.models.Membership || mongoose.model("Membership", membershipSchema);
