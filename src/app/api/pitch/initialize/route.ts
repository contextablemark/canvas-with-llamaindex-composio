import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, company_info } = body;

    if (!conversation_id || !company_info) {
      return NextResponse.json(
        { error: "Missing required fields: conversation_id and company_info" },
        { status: 400 }
      );
    }

    // Make request to Python agent to initialize pitch
    const agentUrl = process.env.AGENT_URL || 'http://localhost:9000';
    const response = await fetch(`${agentUrl}/pitch/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id,
        company_info,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pitch initialization failed:', errorText);
      return NextResponse.json(
        { error: "Failed to initialize pitch", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Initialize pitch error:', error);
    return NextResponse.json(
      { error: "Internal server error during pitch initialization" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Pitch initialization API endpoint" });
}
