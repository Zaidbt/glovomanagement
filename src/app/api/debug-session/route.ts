import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: "Not logged in" 
      });
    }

    return NextResponse.json({
      success: true,
      message: "Session found",
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      note: "Use this session to authenticate N8N requests"
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to get session" },
      { status: 500 }
    );
  }
}
