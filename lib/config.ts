import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Tell me all in-process opportunities for Sanofi (with probability ≥50%).",
    prompt: "Tell me all in-process opportunities for Sanofi (with probability ≥50%).",
  },
  {
    label: "Show all account running clinical trials for cystic fibrosis",
    prompt: "Show all account running clinical trials for cystic fibrosis",
  },
  {
    label: "Show me the clinical trials Clario is running",
    prompt: "Show me the clinical trials Clario is running",
  },
  {
    label: "Show me the competitive CROs running trials for Takeda",
    prompt: "Show me the competitive CROs running trials for Takeda",
  },
  {
    label: "Show me all my colleagues for Pfizer in the UK",
    prompt: "Show me all my colleagues for Pfizer in the UK",
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
