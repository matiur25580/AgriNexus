import mongoose, { Schema } from "mongoose";
const refreshSessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  replacedByTokenHash: { type: String, default: null },
  userAgent: { type: String, maxlength: 500, default: null },
  ipAddress: { type: String, maxlength: 100, default: null },
}, { timestamps: true, versionKey: false });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshSession = mongoose.models.RefreshSession || mongoose.model("RefreshSession", refreshSessionSchema);
