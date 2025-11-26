import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const WORKFLOW_ID =
  process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID?.trim() ?? "";

export const CREATE_SESSION_ENDPOINT = "/api/create-session";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    icon: "circle-question",
    label: "What is ChatKit?",
    prompt: "What is ChatKit and what does it do?",
  },
  // ...and 7 more prompts
];

export const PLACEHOLDER_INPUT = "Ask anything...";

export const GREETING = "Plastic Bank brand voice, ready to go. What message are you crafting?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 220,
      tint: 6,
      shade: -4,
    },
    accent: {
      primary: "#37A450",
      level: 3,
    },
    surface: {
      background: "#FAFAFA",
      foreground: "#EEEEEE",
    },
  },
  radius: "round",
  density: "normal",
  typography: {
    baseSize: 16,
    fontFamily: "Inter, sans-serif",
    fontSources: [
      {
        family: "Inter",
        src: "https://rsms.me/inter/font-files/Inter-Regular.woff2",
        weight: 400,
        style: "normal",
      },
      // ...and 3 more font sources
    ],
  },
  // chatkit.studio/playground to explore config options
});
