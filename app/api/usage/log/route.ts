import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCost } from "@/lib/pricing";

export const runtime = "nodejs";

interface LogUsageRequest {
  sessionId: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LogUsageRequest = await request.json();

    const { sessionId, model, tokensInput, tokensOutput, userId } = body;

    if (!sessionId || !model || tokensInput === undefined || tokensOutput === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, model, tokensInput, tokensOutput" },
        { status: 400 }
      );
    }

    const tokensTotal = tokensInput + tokensOutput;
    const cost = calculateCost(model, tokensInput, tokensOutput);

    // Ensure session exists
    await prisma.usageSession.upsert({
      where: { sessionId },
      update: {
        endTime: new Date(),
        userId: userId || undefined,
      },
      create: {
        sessionId,
        userId: userId || undefined,
        startTime: new Date(),
      },
    });

    // Log the usage
    const log = await prisma.usageLog.create({
      data: {
        sessionId,
        model,
        tokensInput,
        tokensOutput,
        tokensTotal,
        cost,
      },
    });

    // Update daily aggregate
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyAggregate.upsert({
      where: { date: today },
      update: {
        totalRequests: { increment: 1 },
        tokensInput: { increment: tokensInput },
        tokensOutput: { increment: tokensOutput },
        tokensTotal: { increment: tokensTotal },
        totalCost: { increment: cost },
      },
      create: {
        date: today,
        totalRequests: 1,
        tokensInput,
        tokensOutput,
        tokensTotal,
        totalCost: cost,
      },
    });

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        sessionId: log.sessionId,
        cost,
        tokensTotal,
      },
    });
  } catch (error) {
    console.error("Error logging usage:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
