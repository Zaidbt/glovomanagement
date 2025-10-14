import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, password, host, port } = await request.json();

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port: parseInt(port) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: email,
        pass: password,
      },
    });

    // Verify connection
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: "SMTP connection successful",
    });
  } catch (error) {
    console.error("SMTP test error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "SMTP connection failed",
      },
      { status: 400 }
    );
  }
}
