// OpenAI pricing per 1M tokens (as of January 2025)
// Prices are in USD

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // GPT-4o models
  "gpt-4o": {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
  },
  "gpt-4o-2024-11-20": {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
  },
  "gpt-4o-2024-08-06": {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
  },
  "gpt-4o-2024-05-13": {
    inputPer1M: 5.00,
    outputPer1M: 15.00,
  },
  "gpt-4o-mini": {
    inputPer1M: 0.150,
    outputPer1M: 0.600,
  },
  "gpt-4o-mini-2024-07-18": {
    inputPer1M: 0.150,
    outputPer1M: 0.600,
  },

  // GPT-4 Turbo models
  "gpt-4-turbo": {
    inputPer1M: 10.00,
    outputPer1M: 30.00,
  },
  "gpt-4-turbo-2024-04-09": {
    inputPer1M: 10.00,
    outputPer1M: 30.00,
  },
  "gpt-4-turbo-preview": {
    inputPer1M: 10.00,
    outputPer1M: 30.00,
  },

  // GPT-4 models
  "gpt-4": {
    inputPer1M: 30.00,
    outputPer1M: 60.00,
  },
  "gpt-4-0613": {
    inputPer1M: 30.00,
    outputPer1M: 60.00,
  },
  "gpt-4-32k": {
    inputPer1M: 60.00,
    outputPer1M: 120.00,
  },

  // GPT-3.5 Turbo models
  "gpt-3.5-turbo": {
    inputPer1M: 0.50,
    outputPer1M: 1.50,
  },
  "gpt-3.5-turbo-0125": {
    inputPer1M: 0.50,
    outputPer1M: 1.50,
  },
  "gpt-3.5-turbo-1106": {
    inputPer1M: 1.00,
    outputPer1M: 2.00,
  },

  // o1 models
  "o1": {
    inputPer1M: 15.00,
    outputPer1M: 60.00,
  },
  "o1-preview": {
    inputPer1M: 15.00,
    outputPer1M: 60.00,
  },
  "o1-mini": {
    inputPer1M: 3.00,
    outputPer1M: 12.00,
  },
};

// Default pricing for unknown models (using gpt-4o as baseline)
const DEFAULT_PRICING: ModelPricing = {
  inputPer1M: 2.50,
  outputPer1M: 10.00,
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1_000_000).toFixed(2)}M`;
}
