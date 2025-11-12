#!/usr/bin/env node

// Test script to verify OpenAI API key and fetch usage data
require('dotenv').config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔑 OpenAI API Key found:', OPENAI_API_KEY.substring(0, 10) + '...');
console.log('\n📊 Testing OpenAI Usage API...\n');

async function testUsageAPI() {
  try {
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`📅 Fetching usage from ${startDateStr} to ${endDateStr}\n`);

    // Call OpenAI Usage API
    const url = `https://api.openai.com/v1/usage?date=${startDateStr}&end_date=${endDateStr}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', errorText);

      if (response.status === 401) {
        console.error('\n⚠️  Authentication failed. The API key may be invalid or expired.');
      } else if (response.status === 403) {
        console.error('\n⚠️  Access forbidden. The API key may not have organization-level access.');
        console.error('💡 Tip: You need an API key with organization access to view usage data.');
      }

      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Successfully connected to OpenAI Usage API!\n');
    console.log('📈 Usage Data Summary:\n');
    console.log(`Total records: ${data.data?.length || 0}`);

    if (data.data && data.data.length > 0) {
      // Group by model
      const modelStats = {};

      data.data.forEach(record => {
        const model = record.operation || 'unknown';
        const inputTokens = record.n_context_tokens_total || 0;
        const outputTokens = record.n_generated_tokens_total || 0;
        const requests = record.n_requests || 0;

        if (!modelStats[model]) {
          modelStats[model] = {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          };
        }

        modelStats[model].requests += requests;
        modelStats[model].inputTokens += inputTokens;
        modelStats[model].outputTokens += outputTokens;
        modelStats[model].totalTokens += (inputTokens + outputTokens);
      });

      console.log('\n📊 Usage by Model:\n');
      console.log('─'.repeat(80));

      Object.entries(modelStats)
        .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
        .forEach(([model, stats]) => {
          console.log(`\n🤖 Model: ${model}`);
          console.log(`   Requests: ${stats.requests.toLocaleString()}`);
          console.log(`   Input Tokens: ${stats.inputTokens.toLocaleString()}`);
          console.log(`   Output Tokens: ${stats.outputTokens.toLocaleString()}`);
          console.log(`   Total Tokens: ${stats.totalTokens.toLocaleString()}`);
        });

      console.log('\n' + '─'.repeat(80));

      // Calculate total
      const totals = Object.values(modelStats).reduce((acc, stats) => ({
        requests: acc.requests + stats.requests,
        inputTokens: acc.inputTokens + stats.inputTokens,
        outputTokens: acc.outputTokens + stats.outputTokens,
        totalTokens: acc.totalTokens + stats.totalTokens,
      }), { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 });

      console.log('\n💰 Overall Totals:');
      console.log(`   Total Requests: ${totals.requests.toLocaleString()}`);
      console.log(`   Total Input Tokens: ${totals.inputTokens.toLocaleString()}`);
      console.log(`   Total Output Tokens: ${totals.outputTokens.toLocaleString()}`);
      console.log(`   Total Tokens: ${totals.totalTokens.toLocaleString()}`);

      // Show sample raw record
      console.log('\n📝 Sample Raw Record:');
      console.log(JSON.stringify(data.data[0], null, 2));

    } else {
      console.log('ℹ️  No usage data found for the specified date range.');
      console.log('💡 This could mean:');
      console.log('   - No API calls were made during this period');
      console.log('   - Usage data is delayed (typically 5-10 minutes)');
      console.log('   - The API key is valid but has no usage yet');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing OpenAI Usage API:', error.message);
    process.exit(1);
  }
}

testUsageAPI();
