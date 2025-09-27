import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, message } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { error: "Missing required fields: conversation_id and message" },
        { status: 400 }
      );
    }

    // Make request to Python agent to evaluate pitch
    const agentUrl = process.env.AGENT_URL || 'http://localhost:9000';
    const response = await fetch(`${agentUrl}/pitch/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id,
        message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pitch evaluation failed:', errorText);
      return NextResponse.json(
        { error: "Failed to evaluate pitch", details: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Evaluate pitch error:', error);
    return NextResponse.json(
      { error: "Internal server error during pitch evaluation" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Pitch evaluation API endpoint" });
}
