import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Tell me about Bloom Energy",
    prompt: "What is Bloom Energy and what solutions do you offer?",
    icon: "circle-question",
  },
  {
    label: "Power solutions for my business",
    prompt: "I'm interested in learning about power solutions for my business",
    icon: "lightbulb",
  },
  {
    label: "Cost and savings",
    prompt: "How can Bloom Energy help reduce my energy costs?",
    icon: "chart",
  },
  {
    label: "Help with case BE-005",
    prompt: "Help me with case BE-005",
    icon: "lifesaver",
  },
];

export const PLACEHOLDER_INPUT = "Ask about Bloom Energy solutions...";

export const GREETING = "Power you can count on, at any scale. How can I assist you with your energy needs today?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 140, // Green hue to match Bloom Energy branding
      tint: 6,
      shade: theme === "dark" ? -1 : -4,
    },
    accent: {
      primary: theme === "dark" ? "#6DBE45" : "#6DBE45", // Bloom Energy green
      level: 1,
    },
  },
  radius: "round",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
