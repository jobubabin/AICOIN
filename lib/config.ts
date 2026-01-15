import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

 export const CREATE_SESSION_ENDPOINT =
  process.env.NEXT_PUBLIC_CHATKIT_SESSION_ENDPOINT ?? "/api/create-session";

// export const STARTER_PROMPTS: StartScreenPrompt[] = [
//   {
//     label: "What can you do?",
//     prompt: "What can you do?",
//     icon: "circle-question",
//   },
// ];

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "What can you do?",
    prompt: "What can you do?",
    icon: "circle-question",
  },
  {
    label: "Help me start",
    prompt: "Help me start my statement.",
    icon: "circle-question",
  },
  {
    label: "Edit my statement",
    prompt: "Edit a statement I started for clarity, tone, and structure.",
    icon: "circle-question",
  },
  {
    label: "Finish my statement",
    prompt: "Help me finish and polish the ending of a statement I started.",
    icon: "circle-question",
  },
];

export const PLACEHOLDER_INPUT = "Ask anything...";

export const GREETING = "How can I help you today?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: theme === "dark" ? "#f1f5f9" : "#0f172a",
      level: 1,
    },
  },
  radius: "round",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
