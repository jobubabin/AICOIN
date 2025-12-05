# ChatKit Starter Template

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

This repository is the most customizable way to host a [ChatKit](http://openai.github.io/chatkit-js/) application. It ships with a minimal Next.js UI, the ChatKit web component, and a simple FastAPI server to respond to requests.

## What You Get

- Next.js app with `<openai-chatkit>` web component and theming controls
- Config file for starter prompts, theme, placeholder text, and greeting message
- Minimal FastAPI server to respond to requests

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Copy the example file and fill in the required values:

```bash
cp .env.example .env.local
```

You can get your OpenAI API key from the [OpenAI API Keys](https://platform.openai.com/api-keys) page.

### 3. Configure ChatKit credentials

Update `.env.local` with the variables that match your setup.

- `OPENAI_API_KEY` — If you already have a different `OPENAI_API_KEY` env variable set in your terminal session, that one will take precedence over the key in `.env.local` one (this is how a Next.js app works).
- `NEXT_PUBLIC_CHATKIT_API_URL` — This is the URL ChatKit will use to communicate with your sever.
- `NEXT_PUBLIC_CHATKIT_API_DOMAIN_KEY` — On localhost, this can be any non-empty string. See below for where to get your production domain key.

> Note: if your workflow is using a model requiring organization verification, such as GPT-5, make sure you verify your organization first. Visit your [organization settings](https://platform.openai.com/settings/organization/general) and click on "Verify Organization".

### 4. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000` and start chatting. Use the prompts on the start screen to verify your workflow connection, then customize the UI or prompt list in [`lib/config.ts`](lib/config.ts) and [`components/ChatKitPanel.tsx`](components/ChatKitPanel.tsx).

Before deploying your app, you need to verify the domain by adding it to the [Domain allowlist](https://platform.openai.com/settings/organization/security/domain-allowlist) on your dashboard.

## Customization Tips

- Adjust starter prompts, greeting text, [chatkit theme](https://chatkit.studio/playground), and placeholder copy in [`lib/config.ts`](lib/config.ts).
- Update the event handlers inside [`components/.tsx`](components/ChatKitPanel.tsx) to integrate with your product analytics or storage.

## References

- [ChatKit JavaScript Library](http://openai.github.io/chatkit-js/)
- [Advanced Self-Hosting Examples](https://github.com/openai/openai-chatkit-advanced-samples)
