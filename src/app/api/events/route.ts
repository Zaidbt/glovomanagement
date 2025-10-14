import { NextRequest, NextResponse } from "next/server";
import { eventTracker } from "@/lib/event-tracker";

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();

    const result = await eventTracker.trackEvent(eventData);

    return NextResponse.json({ success: true, event: result });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track event" },
      { status: 500 }
    );
  }
}
