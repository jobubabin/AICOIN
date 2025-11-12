import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7"; // days
    const sessionId = searchParams.get("sessionId");

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    startDate.setHours(0, 0, 0, 0);

    // Get daily aggregates for the period
    const dailyStats = await prisma.dailyAggregate.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get current session stats if sessionId provided
    let currentSessionStats = null;
    if (sessionId) {
      const sessionLogs = await prisma.usageLog.findMany({
        where: { sessionId },
      });

      if (sessionLogs.length > 0) {
        currentSessionStats = {
          sessionId,
          tokensInput: sessionLogs.reduce((sum, log) => sum + log.tokensInput, 0),
          tokensOutput: sessionLogs.reduce((sum, log) => sum + log.tokensOutput, 0),
          tokensTotal: sessionLogs.reduce((sum, log) => sum + log.tokensTotal, 0),
          cost: sessionLogs.reduce((sum, log) => sum + log.cost, 0),
          requestCount: sessionLogs.length,
        };
      }
    }

    // Calculate totals
    const totals = {
      totalRequests: dailyStats.reduce((sum, day) => sum + day.totalRequests, 0),
      tokensInput: dailyStats.reduce((sum, day) => sum + day.tokensInput, 0),
      tokensOutput: dailyStats.reduce((sum, day) => sum + day.tokensOutput, 0),
      tokensTotal: dailyStats.reduce((sum, day) => sum + day.tokensTotal, 0),
      totalCost: dailyStats.reduce((sum, day) => sum + day.totalCost, 0),
    };

    return NextResponse.json({
      success: true,
      period: daysAgo,
      dailyStats: dailyStats.map((day) => ({
        date: day.date.toISOString().split("T")[0],
        requests: day.totalRequests,
        tokensInput: day.tokensInput,
        tokensOutput: day.tokensOutput,
        tokensTotal: day.tokensTotal,
        cost: day.totalCost,
      })),
      totals,
      currentSession: currentSessionStats,
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
