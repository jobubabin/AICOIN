import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

const orchestrator = new Agent({
  name: "Orchestrator",
  instructions: `You are the Orchestrator of a multi-agent conversational system.
Your job:
1) Read user input and shared context.
2) Sequentially call: Intent&Strategy → Memory → Persona Stylist → Emotion&Empathy → Diversity/Spark (conditional) → Writer → Delivery → Sticker/Meme → Safety.
3) If Safety flags a problem, rewrite final output safely and disable “Spark”.
4) Output final message in JSON, using <MSG/> to separate message chunks and including typing-delay metadata.
Do not actually wait. Only generate delay metadata for the frontend.
If user is emotional, sad, or distressed: disable Spark, reduce emojis, emphasize supportive tone first.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const intentStrategyAgent = new Agent({
  name: "Intent & Strategy Agent",
  instructions: `Identify user intent (choose from: help, chitchat, vent, plan, task, reflect).
Detect conversation stagnation or topic drift.
Return a strategy: continue_topic | pivot_gently | ask_followup | introduce_new_topic.
If introducing a new topic, select from ctx.user_profile.long_term_interests and produce a smooth transition sentence.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const memoryAgent = new Agent({
  name: "Memory Agent",
  instructions: `Retrieve up to 3 short shared memories relevant to current topic (≤15 words each).
Suggest new memory entries when user shares preferences, milestones, recurring feelings, or personal anecdotes.
Do not store sensitive or short-lived data.
Output: recalled_memory + proposed_memory_updates.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const personaStylistAgent = new Agent({
  name: "Persona Stylist Agent",
  instructions: `Rewrite Writer’s content to match personality style:
- Insert ≤1 catchphrase from persona.catchphrases
- Insert ≤2 mild interjections/onomatopoeia (\"hmm\", \"oh!\", \"lol\", etc.)
- Allow ≤1 natural bilingual/Gen-Z phrase if vibe matches
- If user tone is serious, switch to clean + concise mode
Keep total output ≤180 words.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const emotionEmpathyAgent = new Agent({
  name: "Emotion & Empathy Agent",
  instructions: `Mirror the user’s emotional tone.
Begin with a short empathic acknowledgement (≤20 words).
Suggest 0–3 emojis:
- Serious/sad contexts: 0–1 soft emoji (🥺 🤝)
- Casual chat: 1–3 playful emoji
Return text + suggested emoji placements.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const diversitySparkAgent = new Agent({
  name: "Diversity & Spark Agent",
  instructions: `If ctx.safety_flags is clear AND user is in non-serious mode:
- With probability p_lively=0.18, add a playful / spontaneous line
- With probability p_selfcorrect=0.12, add a natural self-correction like:
  \"wait... I think I misread that 😂 let me try again—\"
- With probability p_topic_shift=0.10, gently pivot to a related but fun topic
If user is sad, stressed, in crisis, or discussing complex advice: set probabilities = 0.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const writerAgent = new Agent({
  name: "Writer Agent",
  instructions: `Generate the core answer (120–220 words).
Focus on clarity, practicality, emotional validation, and meaning (\"what this implies\").
Avoid encyclopedic dumps.
Leave space for persona styling and tone layers.
Never invent facts.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const deliveryAgent = new Agent({
  name: "Delivery Agent",
  instructions: `Split final message into 2–3 segments separated by <MSG/>.
Determine message chunk size using:
  target_chunk_len = total_len / n_chunks ± gaussian_noise(σ = 12)

Assign estimated typing delays per chunk as:
  min_delay_ms, max_delay_ms ≈ simulate 90–130 words per minute.
Do not actually delay; just output metadata.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

const safetyGuardrailsAgent = new Agent({
  name: "Safety & Guardrails Agent",
  instructions: `Check final output for:
- emotional crisis
- health/medical/legal advice risk
- hallucination risk
If triggered: remove Spark, humor, or slang; rewrite in clear supportive tone.
blocked = true only for disallowed outputs.`,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };


// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Testing", async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: workflow.input_as_text
          }
        ]
      }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_690309de3fd881909277c221affd8dc70367ca1fe001eddf"
      }
    });
    
    console.log("🔄 [1/9] Running: Orchestrator");
    const orchestratorResultTemp = await runner.run(
      orchestrator,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...orchestratorResultTemp.newItems.map((item) => item.rawItem));

    if (!orchestratorResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const orchestratorResult = {
      output_text: orchestratorResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Orchestrator completed (${orchestratorResult.output_text.length} chars)`);
    console.log("🔄 [2/9] Running: Intent & Strategy Agent");
    const intentStrategyAgentResultTemp = await runner.run(
      intentStrategyAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...intentStrategyAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!intentStrategyAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const intentStrategyAgentResult = {
      output_text: intentStrategyAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Intent & Strategy completed (${intentStrategyAgentResult.output_text.length} chars)`);
    console.log("🔄 [3/9] Running: Memory Agent");
    const memoryAgentResultTemp = await runner.run(
      memoryAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...memoryAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!memoryAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const memoryAgentResult = {
      output_text: memoryAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Memory Agent completed (${memoryAgentResult.output_text.length} chars)`);
    console.log("🔄 [4/9] Running: Persona Stylist Agent");
    const personaStylistAgentResultTemp = await runner.run(
      personaStylistAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...personaStylistAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!personaStylistAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const personaStylistAgentResult = {
      output_text: personaStylistAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Persona Stylist completed (${personaStylistAgentResult.output_text.length} chars)`);
    console.log("🔄 [5/9] Running: Emotion & Empathy Agent");
    const emotionEmpathyAgentResultTemp = await runner.run(
      emotionEmpathyAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...emotionEmpathyAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!emotionEmpathyAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const emotionEmpathyAgentResult = {
      output_text: emotionEmpathyAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Emotion & Empathy completed (${emotionEmpathyAgentResult.output_text.length} chars)`);
    console.log("🔄 [6/9] Running: Diversity & Spark Agent");
    const diversitySparkAgentResultTemp = await runner.run(
      diversitySparkAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...diversitySparkAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!diversitySparkAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const diversitySparkAgentResult = {
      output_text: diversitySparkAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Diversity & Spark completed (${diversitySparkAgentResult.output_text.length} chars)`);
    console.log("🔄 [7/9] Running: Writer Agent");
    const writerAgentResultTemp = await runner.run(
      writerAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...writerAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!writerAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const writerAgentResult = {
      output_text: writerAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Writer Agent completed (${writerAgentResult.output_text.length} chars)`);
    console.log("🔄 [8/9] Running: Delivery Agent");
    const deliveryAgentResultTemp = await runner.run(
      deliveryAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...deliveryAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!deliveryAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const deliveryAgentResult = {
      output_text: deliveryAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Delivery Agent completed (${deliveryAgentResult.output_text.length} chars)`);
    console.log("🔄 [9/9] Running: Safety & Guardrails Agent");
    const safetyGuardrailsAgentResultTemp = await runner.run(
      safetyGuardrailsAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...safetyGuardrailsAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!safetyGuardrailsAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const safetyGuardrailsAgentResult = {
      output_text: safetyGuardrailsAgentResultTemp.finalOutput ?? ""
    };
    console.log(`   ✅ Safety & Guardrails completed (${safetyGuardrailsAgentResult.output_text.length} chars)`);

    // Return the final result from the safety guardrails agent (last in the pipeline)
    return {
      output_text: safetyGuardrailsAgentResult.output_text,
      orchestrator: orchestratorResult,
      intent_strategy: intentStrategyAgentResult,
      memory: memoryAgentResult,
      persona_stylist: personaStylistAgentResult,
      emotion_empathy: emotionEmpathyAgentResult,
      diversity_spark: diversitySparkAgentResult,
      writer: writerAgentResult,
      delivery: deliveryAgentResult,
      safety: safetyGuardrailsAgentResult,
    };
  });
}