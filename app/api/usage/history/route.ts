import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get recent sessions with their aggregated logs
    const sessions = await prisma.usageSession.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        startTime: "desc",
      },
      include: {
        logs: true,
      },
    });

    const history = sessions.map((session) => {
      const logs = session.logs;
      const tokensInput = logs.reduce((sum, log) => sum + log.tokensInput, 0);
      const tokensOutput = logs.reduce((sum, log) => sum + log.tokensOutput, 0);
      const tokensTotal = logs.reduce((sum, log) => sum + log.tokensTotal, 0);
      const cost = logs.reduce((sum, log) => sum + log.cost, 0);

      return {
        sessionId: session.sessionId,
        userId: session.userId,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        requestCount: logs.length,
        tokensInput,
        tokensOutput,
        tokensTotal,
        cost,
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.usageSession.count();

    return NextResponse.json({
      success: true,
      history,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching usage history:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
