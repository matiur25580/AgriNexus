import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
const accessKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
export async function createAccessToken(userId: string): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(env.ACCESS_TOKEN_TTL).sign(accessKey);
}
export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, accessKey, { algorithms: ["HS256"] });
  if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
  return { userId: payload.sub };
}
export function createRefreshToken(): string { return randomBytes(48).toString("base64url"); }
export function hashRefreshToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
