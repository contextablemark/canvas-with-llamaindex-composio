import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to_email, subject, body: emailBody, company_name } = body;

    if (!to_email || !subject || !emailBody || !company_name) {
      return NextResponse.json(
        { error: "Missing required fields: to_email, subject, body, and company_name" },
        { status: 400 }
      );
    }

    // Make request to Python agent to send email
    const agentUrl = process.env.AGENT_URL || 'http://localhost:9000';
    const response = await fetch(`${agentUrl}/pitch/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to_email,
        subject,
        body: emailBody,
        company_name,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email sending failed:', errorText);
      return NextResponse.json(
        { error: "Failed to send email", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: "Internal server error sending email" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Email sending API endpoint" });
}
