import { NextResponse } from "next/server";

export async function POST() {
  // For mobile, we don't need to do anything server-side
  // Token is stored on device and will be removed by client
  return NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });
}
