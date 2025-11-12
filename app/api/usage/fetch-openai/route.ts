import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCost } from "@/lib/pricing";

export const runtime = "nodejs";

interface OpenAIUsageResponse {
  object: string;
  data: Array<{
    aggregation_timestamp: number;
    n_requests: number;
    operation: string;
    snapshot_id: string;
    n_context_tokens_total: number;
    n_generated_tokens_total: number;
  }>;
  ft_data: Array<Record<string, unknown>>;
  dalle_api_data: Array<Record<string, unknown>>;
  whisper_api_data: Array<Record<string, unknown>>;
  tts_api_data: Array<Record<string, unknown>>;
  has_more: boolean;
  next_page?: string;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date"); // Format: YYYY-MM-DD
    const endDate = searchParams.get("end_date"); // Format: YYYY-MM-DD

    // Build URL for OpenAI Usage API
    let url = "https://api.openai.com/v1/usage";
    const params = new URLSearchParams();

    if (startDate) params.append("date", startDate);
    if (endDate) params.append("end_date", endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    // Fetch usage data from OpenAI
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch usage from OpenAI", details: errorText },
        { status: response.status }
      );
    }

    const usageData: OpenAIUsageResponse = await response.json();

    // Process and store usage data
    const processedRecords = [];

    for (const record of usageData.data) {
      const date = new Date(record.aggregation_timestamp * 1000);
      const dateOnly = new Date(date.toISOString().split("T")[0]);

      const inputTokens = record.n_context_tokens_total || 0;
      const outputTokens = record.n_generated_tokens_total || 0;
      const totalTokens = inputTokens + outputTokens;

      // Extract model from operation (e.g., "gpt-4o-2024-11-20")
      const model = record.operation || "unknown";
      const cost = calculateCost(model, inputTokens, outputTokens);

      // Upsert daily aggregate
      await prisma.dailyAggregate.upsert({
        where: { date: dateOnly },
        update: {
          totalRequests: { increment: record.n_requests },
          tokensInput: { increment: inputTokens },
          tokensOutput: { increment: outputTokens },
          tokensTotal: { increment: totalTokens },
          totalCost: { increment: cost },
        },
        create: {
          date: dateOnly,
          totalRequests: record.n_requests,
          tokensInput: inputTokens,
          tokensOutput: outputTokens,
          tokensTotal: totalTokens,
          totalCost: cost,
        },
      });

      processedRecords.push({
        date: dateOnly,
        model,
        requests: record.n_requests,
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
      });
    }

    return NextResponse.json({
      success: true,
      recordsProcessed: processedRecords.length,
      data: processedRecords,
    });
  } catch (error) {
    console.error("Error fetching OpenAI usage:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
