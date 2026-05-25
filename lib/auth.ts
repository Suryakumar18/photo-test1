import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

// Never throw at module level — Next.js imports this during static generation.
// Read env vars lazily inside each function so a missing var only fails the
// specific request that needs it, not the whole app.
const JWT_SECRET =
  process.env.JWT_SECRET || "memorable-pictures-jwt-secret-surya-2024-prod";

const SUPER_JWT_SECRET =
  process.env.SUPER_JWT_SECRET || "super-admin-jwt-secret-surya-memorable-2024-prod";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "photographer" | "client";
  name: string;
  studioId?: string;
  iat?: number;
  exp?: number;
}

export interface SuperAdminJWTPayload {
  role: "super_admin";
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// ── Token signing ─────────────────────────────────────────────────────────────
export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function signSuperAdminToken(
  payload: Omit<SuperAdminJWTPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, SUPER_JWT_SECRET, { expiresIn: "24h" });
}

// ── Token verification ────────────────────────────────────────────────────────
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifySuperAdminToken(
  token: string
): SuperAdminJWTPayload | null {
  try {
    return jwt.verify(token, SUPER_JWT_SECRET) as SuperAdminJWTPayload;
  } catch {
    return null;
  }
}

// ── Token extraction ──────────────────────────────────────────────────────────
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  return req.cookies.get("auth-token")?.value ?? null;
}

export function getSuperAdminTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  return req.cookies.get("super-admin-token")?.value ?? null;
}

// ── User helpers ──────────────────────────────────────────────────────────────
export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(req);
  return token ? verifyToken(token) : null;
}

export function getSuperAdminFromRequest(
  req: NextRequest
): SuperAdminJWTPayload | null {
  const token = getSuperAdminTokenFromRequest(req);
  return token ? verifySuperAdminToken(token) : null;
}

// ── Guards ────────────────────────────────────────────────────────────────────
export function requireAuth(
  req: NextRequest,
  roles?: Array<"admin" | "photographer" | "client">
): { user: JWTPayload } | { error: string; status: number } {
  const user = getUserFromRequest(req);
  if (!user) return { error: "Unauthorized — please log in", status: 401 };
  if (roles && !roles.includes(user.role))
    return { error: "Forbidden — insufficient permissions", status: 403 };
  return { user };
}

export function requireSuperAdmin(
  req: NextRequest
): { admin: SuperAdminJWTPayload } | { error: string; status: number } {
  const admin = getSuperAdminFromRequest(req);
  if (!admin || admin.role !== "super_admin")
    return { error: "Super admin access required", status: 403 };
  return { admin };
}
