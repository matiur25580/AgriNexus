import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { asyncRoute } from "../lib/async-route.js";
import { HttpError } from "../lib/http-error.js";
import { Membership } from "../models/membership.model.js";
import { Organization } from "../models/organization.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { User } from "../models/user.model.js";
import { requireAuth } from "./auth.middleware.js";
import { createAccessToken, createRefreshToken, hashRefreshToken } from "./tokens.js";
export const authRouter = Router();
const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(10).max(128) });
const registerSchema = credentialsSchema.extend({ fullName: z.string().trim().min(2).max(120), organizationName: z.string().trim().min(2).max(120) });
const cookieName = env.REFRESH_COOKIE_NAME;
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "strict" as const, path: `${env.API_PREFIX}/auth` };
function readRefreshCookie(header: string | undefined): string | null {
  const item = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return item ? decodeURIComponent(item.slice(cookieName.length + 1)) : null;
}
async function issueSession(userId: string, req: Request, res: Response) {
  const token = createRefreshToken(), expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
  await RefreshSession.create({ tokenHash: hashRefreshToken(token), familyId: randomUUID(), userId, expiresAt,
    userAgent: req.get("user-agent")?.slice(0, 500) ?? null, ipAddress: req.ip ?? null });
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
  return { accessToken: await createAccessToken(userId), tokenType: "Bearer", expiresIn: env.ACCESS_TOKEN_TTL };
}
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "organization"; }
async function listActiveOrganizations(userId: string) {
  const memberships = await Membership.find({ userId, status: "active" }).exec();
  const organizations = await Organization.find({ _id: { $in: memberships.map((m) => m.organizationId) }, status: "active" }).select("name slug").exec();
  const roles = new Map(memberships.map((m) => [m.organizationId.toString(), m.role] as const));
  return organizations.map((org) => ({ id: org._id.toString(), name: org.name, slug: org.slug, role: roles.get(org._id.toString()) }));
}
authRouter.post("/register", asyncRoute(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "Provide a valid name, email, password (10–128 characters), and organization name.");
  const { fullName, email, password, organizationName } = parsed.data, normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) throw new HttpError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
  const user = await User.create({ fullName, email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
  const organization = await Organization.create({ name: organizationName, slug: `${slugify(organizationName)}-${randomUUID().slice(0, 8)}`, createdBy: user._id });
  await Membership.create({ organizationId: organization._id, userId: user._id, role: "owner", status: "active" });
  const session = await issueSession(user.id, req, res);
  res.status(201).json({ success: true, data: { ...session, user: { id: user.id, fullName: user.fullName, email: user.email }, organization: { id: organization.id, name: organization.name, slug: organization.slug, role: "owner" } } });
}));
authRouter.post("/login", asyncRoute(async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "VALIDATION_ERROR", "A valid email and password are required.");
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select("+passwordHash").exec();
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  if (user.status !== "active") throw new HttpError(403, "ACCOUNT_SUSPENDED", "This account is currently suspended.");
  const session = await issueSession(user.id, req, res);
  const organizations = await listActiveOrganizations(user.id);
  res.json({ success: true, data: { ...session, user: { id: user.id, fullName: user.fullName, email: user.email }, organizations } });
}));
authRouter.post("/refresh", asyncRoute(async (req, res) => {
  const raw = readRefreshCookie(req.headers.cookie);
  if (!raw) throw new HttpError(401, "REFRESH_TOKEN_REQUIRED", "A refresh session is required.");
  const current = await RefreshSession.findOne({ tokenHash: hashRefreshToken(raw) }).exec();
  if (!current || current.expiresAt <= new Date()) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "The refresh session is invalid or expired.");
  if (current.revokedAt) {
    await RefreshSession.updateMany({ familyId: current.familyId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
    throw new HttpError(401, "REFRESH_TOKEN_REUSED", "Refresh-token reuse was detected; this session family has been revoked.");
  }
  const nextToken = createRefreshToken(), nextHash = hashRefreshToken(nextToken), now = new Date();
  const claimed = await RefreshSession.findOneAndUpdate({ _id: current._id, revokedAt: null, expiresAt: { $gt: now } }, { $set: { revokedAt: now, replacedByTokenHash: nextHash } }, { new: true }).exec();
  if (!claimed) {
    await RefreshSession.updateMany({ familyId: current.familyId, revokedAt: null }, { $set: { revokedAt: now } }).exec();
    throw new HttpError(401, "REFRESH_TOKEN_REUSED", "Refresh-token reuse was detected; this session family has been revoked.");
  }
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
  await RefreshSession.create({ tokenHash: nextHash, familyId: current.familyId, userId: current.userId, expiresAt,
    userAgent: req.get("user-agent")?.slice(0, 500) ?? null, ipAddress: req.ip ?? null });
  res.cookie(cookieName, nextToken, { ...cookieOptions, expires: expiresAt });
  res.json({ success: true, data: { accessToken: await createAccessToken(current.userId.toString()), tokenType: "Bearer", expiresIn: env.ACCESS_TOKEN_TTL } });
}));
authRouter.post("/logout", asyncRoute(async (req, res) => {
  const raw = readRefreshCookie(req.headers.cookie);
  if (raw) await RefreshSession.updateOne({ tokenHash: hashRefreshToken(raw), revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
  res.clearCookie(cookieName, cookieOptions); res.status(204).send();
}));
authRouter.get("/me", requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.auth!.userId).select("fullName email status createdAt").exec();
  if (!user || user.status !== "active") throw new HttpError(401, "ACCOUNT_UNAVAILABLE", "This account is unavailable.");
  const organizations = await listActiveOrganizations(user.id);
  res.json({ success: true, data: { user: { id: user.id, fullName: user.fullName, email: user.email }, organizations } });
}));
