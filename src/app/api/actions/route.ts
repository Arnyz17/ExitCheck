import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { actionId } = await request.json();

    // Simulate a realistic IoT command dispatch delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Log the action for demo purposes
    console.log(`[ExitCheck] Action dispatched: ${actionId}`);

    // In production, this would call Home Assistant, Tesla API, etc.
    // For now, all actions succeed immediately as a demo
    const actionResponses: Record<string, string> = {
      garage_door_close: "Garage door close command sent",
      tesla_climate_start: "Tesla climate pre-conditioning started",
      default: `Action '${actionId}' dispatched successfully`,
    };

    const message = actionResponses[actionId] || actionResponses.default;

    return NextResponse.json({ status: "success", actionId, message });
  } catch (error) {
    console.error("Failed to execute action", error);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
