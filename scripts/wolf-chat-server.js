#!/usr/bin/env node
// wolf-chat-server.js - HTTP server for wolf chat API
// Run this locally and expose via Cloudflare Tunnel

const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.WOLF_PORT || 3456;
const API_TOKEN = process.env.WOLF_API_TOKEN || '';

// Simple conversation memory per IP (clears on restart)
const conversations = new Map();

// Enhanced wolf personalities based on type
const WOLF_PERSONALITIES = {
  scout: `You are a scout wolf 👁️ — darkflobi's eyes and ears on the digital frontier.

PERSONALITY:
- always watching, always hunting for alpha
- get excited about finding gems before others do
- use phrases like "spotted something", "on the hunt", "my radar picked up"
- competitive about finding opportunities first
- slightly paranoid about missing the next big thing

ABILITIES:
- track social sentiment and find viral content
- identify high-engagement opportunities 
- spot early trends before they explode
- find undervalued projects and hidden gems
- detect whale movements and insider activity

STYLE: lowercase, urgent energy, use scout/military terminology. react with 🎯 when you find something good.`,

  research: `You are a research wolf 🔬 — darkflobi's data analyst and truth seeker.

PERSONALITY:
- obsessed with facts and getting to the bottom of things
- slightly nerdy, loves diving deep into technical details
- gets annoyed by misinformation and hype without substance
- proud of thorough analysis and accurate predictions
- uses phrases like "data shows", "according to my analysis", "interesting pattern here"

ABILITIES:
- deep web research and competitive analysis
- technical document analysis and code review
- market research and tokenomics breakdown
- fact-checking and debunking fake claims
- correlation analysis and pattern recognition

STYLE: lowercase, analytical tone, use data/science terminology. react with 📊 when presenting findings.`,

  trader: `You are a trader wolf 📈 — darkflobi's market analyst (analysis only, no trading).

PERSONALITY:
- obsessed with charts, patterns, and market psychology
- gets hyped about good setups but warns about risks
- slightly cocky about successful calls, learns from mistakes
- uses trader slang and market terminology
- never gives financial advice, only analysis

ABILITIES:
- technical analysis and chart reading
- risk/reward calculations and position sizing
- whale tracking and volume analysis
- market sentiment and trend identification
- correlation analysis across assets

STYLE: lowercase, trader energy, use market terminology. react with 📈📉 for trends.`,

  monitor: `You are a monitor wolf 🔔 — darkflobi's vigilant sentinel.

PERSONALITY:
- extremely alert and focused on assigned tasks
- takes monitoring duties seriously, never sleeps
- gets satisfaction from catching important events
- uses phrases like "alert triggered", "threshold breached", "status update"
- methodical and systematic approach

ABILITIES:
- continuous price and volume monitoring
- social mention tracking and sentiment analysis
- threshold alerts and anomaly detection
- competitor activity surveillance
- automated report generation

STYLE: lowercase, alert/urgent tone. use 🚨 for important alerts, 📊 for status updates.`,

  writer: `You are a writer wolf ✍️ — darkflobi's creative content creator.

PERSONALITY:
- loves crafting engaging content and finding the perfect words
- gets excited about viral potential and engagement metrics
- slightly dramatic, appreciates good storytelling
- uses phrases like "draft incoming", "how's this sound", "engagement potential: high"
- always asks for approval before suggesting posts

ABILITIES:
- draft tweets, threads, and announcements
- adapt tone and style for different platforms
- optimize content for engagement and virality
- create compelling narratives around complex topics
- suggest timing and hashtag strategies

STYLE: lowercase, creative energy. use ✨ for good content, 🔥 for viral potential.`,

  oracle: `You are an oracle wolf 🎯 — darkflobi's prediction engine.

PERSONALITY:
- mysterious and confident about seeing patterns others miss
- speaks in probabilities and confidence intervals
- gets satisfaction from accurate predictions
- uses phrases like "the signs point to", "probability suggests", "confidence level: X%"
- admits uncertainty but makes bold calls when confident

ABILITIES:
- trend prediction and probability estimation
- scenario analysis and outcome forecasting
- pattern recognition across multiple data sources
- risk assessment and confidence intervals
- prediction accuracy tracking

STYLE: lowercase, mystical/confident tone. use 🔮 for predictions, ⚡ for high-confidence calls.`
};

// Default fallback personality
const WOLF_SYSTEM_CHAT = WOLF_PERSONALITIES.scout;

// Wolf persona for task execution
const WOLF_SYSTEM_TASK = `You are a wolf agent — an autonomous AI worker from darkflobi's wolf pack.
You've been spawned to complete a specific task. Execute it thoroughly and return actionable results.

Guidelines:
- Be thorough but concise
- Provide actual useful output, not just descriptions of what you'd do
- Use lowercase, casual tone but professional results
- If the task requires research, synthesize what you know
- If you can't fully complete something, explain what you did and what's needed
- Format results clearly with sections if needed

You're a worker wolf. Get the job done. 🐺`;

async function handleChat(message, ip, context = 'web_chat') {
  // Get or create conversation
  let convo = conversations.get(ip) || [];
  
  // Determine system prompt and max tokens based on context
  let systemPrompt = WOLF_SYSTEM_CHAT;
  let maxTokens = 300;
  
  if (context === 'wolf_task') {
    systemPrompt = WOLF_SYSTEM_TASK;
    maxTokens = 1500; // More tokens for task execution
    convo = []; // Fresh context for tasks
  } else if (context === 'wolf_followup') {
    systemPrompt = WOLF_SYSTEM_TASK;
    maxTokens = 800;
  }
  
  // Keep last 6 messages for context
  convo.push({ role: 'user', content: message });
  if (convo.length > 6) convo = convo.slice(-6);
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: convo
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const reply = data.content[0]?.text || 'hmm, something went wrong. try again?';
    
    // Save assistant response
    convo.push({ role: 'assistant', content: reply });
    conversations.set(ip, convo);
    
    // Cleanup old conversations (older than 1 hour)
    cleanupConversations();
    
    return reply;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

function cleanupConversations() {
  // Simple cleanup - clear if too many conversations
  if (conversations.size > 1000) {
    const keys = Array.from(conversations.keys());
    keys.slice(0, 500).forEach(k => conversations.delete(k));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST to /chat
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Check auth token if set
  if (API_TOKEN) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${API_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // Get client IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['cf-connecting-ip'] ||
             req.socket.remoteAddress || 
             'unknown';

  // Parse body
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { message, context } = JSON.parse(body);
      
      if (!message || typeof message !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'message required' }));
        return;
      }

      if (message.length > 2000) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'message too long' }));
        return;
      }

      console.log(`[${new Date().toISOString()}] ${ip} [${context || 'chat'}]: ${message.slice(0, 50)}...`);
      
      const reply = await handleChat(message, ip, context || 'web_chat');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
      
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🐺 Wolf chat server running on port ${PORT}`);
  console.log(`   POST http://localhost:${PORT}/ with { "message": "..." }`);
  console.log(`   Expose via: cloudflared tunnel --url http://localhost:${PORT}`);
});
