# Token Usage Tracking Setup

This guide explains how to set up the token usage tracking feature for your OpenAI ChatKit application.

## Overview

The usage tracking feature provides:
- **Real-time session tracking**: View token usage and costs for your current chat session
- **Historical data**: See usage trends over 7 or 30 days with charts
- **Session history**: Browse past chat sessions with detailed breakdowns
- **Cost calculation**: Automatic cost calculation based on current OpenAI pricing
- **OpenAI Usage API integration**: Fetch actual usage data from your OpenAI account

## Prerequisites

1. **Vercel Account**: You'll need a Vercel account for Vercel Postgres
2. **OpenAI API Key**: With organization-level access to view usage data

## Setup Instructions

### 1. Set Up Vercel Postgres Database

1. Go to your Vercel Dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** and select **Postgres**
4. Follow the prompts to create your database
5. Once created, go to the **.env.local** tab in your database settings
6. Copy the `DATABASE_URL` connection string

### 2. Configure Environment Variables

Create a `.env.local` file in the project root (if it doesn't exist):

```bash
cp .env.local.example .env.local
```

Update the following variables in `.env.local`:

```bash
# Your OpenAI API key (must have organization access)
OPENAI_API_KEY=sk-...

# Your ChatKit workflow ID
NEXT_PUBLIC_CHATKIT_WORKFLOW_ID=...

# Vercel Postgres connection string (from Step 1)
DATABASE_URL=postgres://...
```

### 3. Run Database Migrations

Generate the Prisma client and create database tables:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate deploy
```

Or if you're developing locally and want to create a migration:

```bash
npx prisma migrate dev --name init
```

### 4. Deploy to Vercel

1. Push your code to your Git repository
2. In Vercel Dashboard, go to your project
3. Navigate to **Settings** > **Environment Variables**
4. Add the same environment variables from `.env.local`:
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID`
   - `DATABASE_URL`
5. Redeploy your application

## Using the Usage Tracking Feature

### Accessing the Usage Sidebar

1. Click the **"Token-Nutzung"** button in the top-left corner of the chat interface
2. The sidebar will slide in from the left, showing:
   - **Current session stats** (if active)
   - **Usage trends chart** (7 or 30 days)
   - **Total usage statistics**
   - **Recent session history**

### Syncing with OpenAI Usage API

To fetch actual usage data from OpenAI (recommended to run daily):

```bash
# Fetch usage for a specific date range
curl "https://your-app.vercel.app/api/usage/fetch-openai?start_date=2025-01-01&end_date=2025-01-31"
```

You can set up a cron job or use Vercel Cron Jobs to automate this:

Create `app/api/cron/sync-usage/route.ts`:

```typescript
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startDate = yesterday.toISOString().split("T")[0];

  const response = await fetch(
    `${process.env.VERCEL_URL}/api/usage/fetch-openai?start_date=${startDate}`
  );

  return NextResponse.json({ success: response.ok });
}
```

Then configure a Vercel Cron Job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-usage",
      "schedule": "0 1 * * *"
    }
  ]
}
```

## API Endpoints

### `POST /api/usage/log`

Logs usage for a specific session (called automatically by the chat interface).

**Request body:**
```json
{
  "sessionId": "uuid",
  "model": "gpt-4o",
  "tokensInput": 150,
  "tokensOutput": 500,
  "userId": "optional-user-id"
}
```

### `GET /api/usage/stats`

Get aggregated usage statistics.

**Query parameters:**
- `period`: Number of days (default: 7)
- `sessionId`: Optional, to include current session stats

**Response:**
```json
{
  "success": true,
  "period": 7,
  "dailyStats": [...],
  "totals": {
    "totalRequests": 150,
    "tokensInput": 50000,
    "tokensOutput": 75000,
    "tokensTotal": 125000,
    "totalCost": 0.52
  },
  "currentSession": null
}
```

### `GET /api/usage/history`

Get paginated session history.

**Query parameters:**
- `limit`: Number of sessions (default: 10)
- `offset`: Pagination offset (default: 0)

### `GET /api/usage/fetch-openai`

Fetch actual usage data from OpenAI and store in database.

**Query parameters:**
- `start_date`: Format YYYY-MM-DD
- `end_date`: Format YYYY-MM-DD (optional)

## Database Schema

The feature uses three tables:

### `UsageSession`
Tracks individual chat sessions.

### `UsageLog`
Stores detailed usage per API call within a session.

### `DailyAggregate`
Pre-computed daily summaries for faster queries.

## Pricing

Token costs are calculated using the pricing configuration in `lib/pricing.ts`. Update this file if OpenAI changes their pricing.

Current models supported:
- GPT-4o and variants
- GPT-4 Turbo
- GPT-4 and GPT-4-32k
- GPT-3.5 Turbo
- o1 models

## Troubleshooting

### Database Connection Issues

If you see "Can't reach database server" errors:

1. Verify your `DATABASE_URL` is correct in `.env.local`
2. Make sure your Vercel Postgres database is active
3. Check that your IP is whitelisted (Vercel Postgres allows all by default)

### Missing Usage Data

If the sidebar shows no data:

1. Make sure you've run migrations: `npx prisma migrate deploy`
2. Check that sessions are being created (check your database)
3. Verify the OpenAI API key has organization access
4. Try manually fetching data: `curl /api/usage/fetch-openai`

### Sidebar Not Showing

1. Clear your browser cache and localStorage
2. Check browser console for JavaScript errors
3. Verify all components are imported correctly in `App.tsx`

## Notes

- **Privacy**: Session IDs are based on cookies and stored for 30 days
- **Real-time tracking**: Current session stats update after each chat response
- **OpenAI Usage API**: Has a delay (typically 5-10 minutes) before usage data is available
- **Cost estimates**: Based on publicly available OpenAI pricing, may not match your actual bill exactly
