import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production";

export interface MobileUser {
  userId: string;
  username: string;
  role: "COLLABORATEUR" | "FOURNISSEUR";
}

export async function verifyMobileToken(request: NextRequest): Promise<MobileUser | null> {
  try {
    const authHeader = request.headers.get("authorization");

    console.log("🔍 Auth header:", authHeader ? `Bearer ${authHeader.substring(0, 20)}...` : "MISSING");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ No Bearer token found in authorization header");
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    console.log("🔑 Verifying token with JWT_SECRET...");
    const decoded = jwt.verify(token, JWT_SECRET) as MobileUser;

    console.log("✅ Token verified successfully:", { userId: decoded.userId, role: decoded.role });
    return decoded;
  } catch (error) {
    console.error("❌ JWT verification failed:", error);
    return null;
  }
}
