import { runWorkflow } from "@/moey";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // Use nodejs runtime for @openai/agents

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("🤖 AGENT WORKFLOW STARTED");
    console.log("=".repeat(60));
    console.log(`📥 User Input: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    console.log("⏳ Starting agent pipeline...\n");

    // Run the agent workflow
    const result = await runWorkflow({
      input_as_text: message,
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ AGENT WORKFLOW COMPLETED");
    console.log("=".repeat(60));
    console.log(`📤 Final Output: "${result.output_text?.substring(0, 100)}${result.output_text && result.output_text.length > 100 ? '...' : ''}"`);
    console.log("=".repeat(60) + "\n");

    // Extract the final output text
    const responseText = result.output_text || "";

    return NextResponse.json({
      message: responseText,
      agentResults: {
        orchestrator: result.orchestrator,
        intent_strategy: result.intent_strategy,
        memory: result.memory,
        persona_stylist: result.persona_stylist,
        emotion_empathy: result.emotion_empathy,
        diversity_spark: result.diversity_spark,
        writer: result.writer,
        delivery: result.delivery,
        safety: result.safety,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

