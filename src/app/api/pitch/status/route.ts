import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: "Missing required field: conversation_id" },
        { status: 400 }
      );
    }

    // Make request to Python agent to get pitch status
    const agentUrl = process.env.AGENT_URL || 'http://localhost:9000';
    const response = await fetch(`${agentUrl}/pitch/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get pitch status failed:', errorText);
      return NextResponse.json(
        { error: "Failed to get pitch status", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Get pitch status error:', error);
    return NextResponse.json(
      { error: "Internal server error getting pitch status" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Pitch status API endpoint" });
}
