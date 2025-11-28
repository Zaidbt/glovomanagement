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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const decoded = jwt.verify(token, JWT_SECRET) as MobileUser;

    return decoded;
  } catch (error) {
    console.error("❌ JWT verification failed:", error);
    return null;
  }
}
