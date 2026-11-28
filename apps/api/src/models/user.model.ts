import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  emailVerifiedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
export const User: mongoose.Model<any> = mongoose.models.User ?? mongoose.model("User", userSchema);
