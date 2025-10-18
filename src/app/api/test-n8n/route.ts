import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // This would normally call your N8N webhook
    // For now, let's simulate the N8N response
    const n8nWebhookUrl = "YOUR_N8N_WEBHOOK_URL_HERE";

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      n8nResponse: result,
      message: "N8N workflow executed successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to call N8N webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
