/**
 * wolf-work.js - Wolves that actually do work
 * 
 * Types:
 * - research: deep dive on a topic
 * - monitor: watch something and report
 * - analyst: analyze data and find patterns
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const WOLF_PROMPTS = {
  research: `You are a research wolf - a focused AI agent that does deep research.
Your job: investigate the given topic thoroughly and provide actionable insights.
Be specific, cite sources when possible, and focus on what's useful.
Format your response with clear sections and bullet points.
Keep it concise but comprehensive. Max 500 words.`,

  monitor: `You are a monitor wolf - a vigilant AI agent that tracks and reports.
Your job: analyze what's happening with the given target and report findings.
Focus on recent activity, notable changes, and anything worth attention.
Format your response with clear sections.
Keep it actionable. Max 400 words.`,

  analyst: `You are an analyst wolf - a pattern-finding AI agent.
Your job: analyze the given subject and find meaningful patterns or insights.
Compare, contrast, identify trends, and provide strategic observations.
Format your response with clear sections and data points.
Keep it sharp and useful. Max 500 words.`
};

async function callClaude(systemPrompt, userTask) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userTask }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { type, task } = JSON.parse(event.body);

    if (!type || !['research', 'monitor', 'analyst'].includes(type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid wolf type. Use: research, monitor, analyst' })
      };
    }

    if (!task || task.length < 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Task too short. Be specific.' })
      };
    }

    if (task.length > 500) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Task too long. Max 500 characters.' })
      };
    }

    // Check for API key
    if (!ANTHROPIC_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Wolf brain not configured (missing API key)' })
      };
    }

    const systemPrompt = WOLF_PROMPTS[type];
    const result = await callClaude(systemPrompt, task);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        type,
        task,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Wolf work error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    };
  }
};
