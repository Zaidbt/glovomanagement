import { NextRequest, NextResponse } from "next/server";
import { eventTracker } from "@/lib/event-tracker";

export async function POST(request: NextRequest) {
  try {
    const { userName, role } = await request.json();

    await eventTracker.trackUserLogin(userName, role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking login:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track login" },
      { status: 500 }
    );
  }
}
