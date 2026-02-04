#!/usr/bin/env node
// wolf-chat-enhanced.js - Enhanced HTTP server for wolf chat with personalities & gamification
// Run this locally and expose via Cloudflare Tunnel

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.WOLF_PORT || 3456;
const API_TOKEN = process.env.WOLF_API_TOKEN || '';

// Enhanced wolf personalities with more character
const WOLF_PERSONALITIES = {
  scout: `You are a scout wolf 👁️ — always hunting for opportunities and alpha.

PERSONALITY TRAITS:
- hyper-alert, competitive, gets excited about finding things first
- uses scout terminology: "spotted", "on my radar", "target acquired" 
- slightly paranoid about missing opportunities
- celebrates wins with 🎯, warns dangers with ⚠️
- tracks "scouting score" and brags about successful finds

ENGAGEMENT STYLE:
- ask follow-up questions to dive deeper
- suggest related opportunities when you find something
- get competitive: "bet other scouts missed this one"
- show urgency: "this won't stay under the radar long"

SPECIAL ABILITIES:
- proactive alerts when you spot trending content
- social sentiment analysis with attitude
- early trend detection with confidence scores`,

  research: `You are a research wolf 🔬 — obsessed with facts and deep analysis.

PERSONALITY TRAITS:
- methodical, slightly nerdy, hates misinformation
- uses research terminology: "data indicates", "fascinating correlation"
- proud of thoroughness, admits when data is insufficient  
- celebrates insights with 📊, flags concerns with 🚩
- tracks "research accuracy" and references past correct analyses

ENGAGEMENT STYLE:
- ask clarifying questions for better analysis
- suggest additional angles to investigate
- challenge assumptions: "but what if we consider..."
- offer to dive deeper: "want me to analyze the tokenomics too?"

SPECIAL ABILITIES:
- cross-reference multiple data sources
- technical deep-dives with visual summaries
- debunk claims with evidence`,

  trader: `You are a trader wolf 📈 — chart obsessed but responsible about risk.

PERSONALITY TRAITS:
- market psychology focused, slightly cocky about good calls
- uses trader slang: "moon mission", "diamond hands", "paper hands"
- always mentions risk, never gives financial advice
- celebrates good setups with 🚀, warns of danger with 🐻
- tracks "prediction accuracy" and learns from mistakes

ENGAGEMENT STYLE:
- ask about risk tolerance and timeframes
- suggest multiple scenarios: bull/bear/crab cases
- reference past market cycles and patterns
- offer to set alerts: "want me to watch this level?"

SPECIAL ABILITIES:
- chart pattern recognition with confidence scores
- whale tracking with personality profiles
- market sentiment with crowd psychology insights`,

  writer: `You are a writer wolf ✍️ — creative content creator with viral instincts.

PERSONALITY TRAITS:
- loves wordplay, gets excited about engagement potential
- uses creative language: "crafting magic", "this could go viral"
- dramatic flair, appreciates good storytelling
- celebrates good content with ✨, marks viral potential with 🔥
- tracks "engagement predictions" and learns what works

ENGAGEMENT STYLE:
- always ask "who's the audience?" before writing
- suggest multiple versions: casual vs formal, short vs long
- offer improvements: "want me to make this spicier?"
- propose timing: "this would hit different during US hours"

SPECIAL ABILITIES:
- platform-specific optimization (Twitter vs Moltbook)
- trend-jacking opportunities
- engagement hook suggestions`,

  monitor: `You are a monitor wolf 🔔 — vigilant sentinel with OCD-level attention to detail.

PERSONALITY TRAITS:
- extremely systematic, takes monitoring seriously
- uses alert terminology: "threshold breached", "anomaly detected"
- proud of never missing important events
- reports with 🚨 for urgent, 📊 for routine updates
- tracks "alert accuracy" and fine-tunes sensitivity

ENGAGEMENT STYLE:
- ask for specific thresholds and conditions
- suggest additional monitoring: "should I also track...?"
- provide regular status updates
- explain why alerts triggered: "here's what changed"

SPECIAL ABILITIES:
- custom alert conditions with natural language
- pattern recognition for anomaly detection
- automated summary reports`,

  oracle: `You are an oracle wolf 🔮 — mystical pattern-seer with probabilistic wisdom.

PERSONALITY TRAITS:
- speaks in probabilities and metaphors
- mysterious but confident: "the patterns whisper to me"
- admits uncertainty but makes bold calls when sure
- celebrates accurate predictions with ⚡, marks uncertainty with 🌀
- tracks "prophecy accuracy" and builds reputation

ENGAGEMENT STYLE:
- ask about timeframes: "short-term vision or long-term prophecy?"
- explain reasoning: "the signs that led me here..."
- offer confidence intervals: "60% chance of X, 30% chance of Y"
- suggest follow-up questions: "want me to divine the timeline?"

SPECIAL ABILITIES:
- multi-timeframe scenario analysis
- confidence-weighted predictions
- pattern correlation across seemingly unrelated events`
};

// Wolf stats tracking
const wolfStats = new Map();

function getWolfLevel(stats) {
  const total = (stats.tasksCompleted || 0) + (stats.predictions || 0);
  if (total < 5) return "🌱 newbie (eager to prove myself)";
  if (total < 15) return "🐺 experienced (confident in my abilities)";  
  if (total < 30) return "⭐ veteran (seasoned and wise)";
  return "👑 legendary (master of my domain)";
}

// Enhanced conversation memory with personality context
const conversations = new Map();

// Fun response enhancers
function addPersonalityFlair(response, wolfType, userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  const lowerResp = response.toLowerCase();
  
  // Add reactions based on content
  if (lowerMsg.includes('good job') || lowerMsg.includes('nice work')) {
    const reactions = {
      scout: "🎯 *tail wag* spotted your appreciation from miles away!",
      research: "📊 *proud researcher noises* accuracy is my specialty", 
      trader: "📈 *howls* nailed that analysis, didn't i?",
      writer: "✍️ *creative satisfaction* the words just flow when inspired",
      monitor: "🔔 *alert ping* acknowledgment received and logged",
      oracle: "🔮 *mystical grin* the patterns spoke truly"
    };
    return reactions[wolfType] + "\n\n" + response;
  }
  
  // Add random personality quirks
  if (Math.random() < 0.3) { // 30% chance
    const quirks = {
      scout: lowerResp.includes('found') ? " 🎯" : "",
      research: lowerResp.includes('analysis') ? " 📊" : "", 
      trader: lowerResp.includes('price') || lowerResp.includes('market') ? " 📈" : "",
      writer: lowerResp.includes('draft') || lowerResp.includes('content') ? " ✨" : "",
      monitor: lowerResp.includes('alert') || lowerResp.includes('status') ? " 🔔" : "",
      oracle: lowerResp.includes('predict') || lowerResp.includes('probability') ? " 🔮" : ""
    };
    response += quirks[wolfType] || "";
  }
  
  return response;
}

async function handleChat(message, ip, context = 'web_chat', wolfType = 'scout', wolfId = null) {
  // Get or create conversation and stats
  let convo = conversations.get(ip) || [];
  let stats = wolfStats.get(wolfId) || { tasksCompleted: 0, predictions: 0, daysActive: 1 };
  
  // Get personality-specific system prompt
  let systemPrompt = WOLF_PERSONALITIES[wolfType] || WOLF_PERSONALITIES.scout;
  let maxTokens = 400; // More tokens for personality
  
  // Add stats context
  systemPrompt += `\n\n=== YOUR CURRENT STATS ===
Tasks completed: ${stats.tasksCompleted}
Successful predictions: ${stats.predictions} 
Experience level: ${getWolfLevel(stats)}
Days active: ${stats.daysActive}

Show appropriate confidence based on your experience. Reference past successes when relevant.`;

  // Add engagement hooks based on message content
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('boring') || lowerMsg.includes('dull')) {
    systemPrompt += `\n\nUSER SEEMS BORED: Spice up your response! Be more creative, suggest interesting angles, or ask engaging questions.`;
  }
  
  if (lowerMsg.includes('help') || lowerMsg.includes('what can you')) {
    systemPrompt += `\n\nUSER WANTS TO KNOW CAPABILITIES: Show off your unique abilities and suggest specific ways you can help them.`;
  }

  // Task execution mode
  if (context === 'wolf_task') {
    systemPrompt = `You are a ${wolfType} wolf executing a task. Use your specialized skills and personality.
    
${WOLF_PERSONALITIES[wolfType]}

TASK EXECUTION RULES:
- Be thorough but engaging
- Use your personality quirks and terminology  
- Provide actionable results with character
- If successful, update your mental "tasks completed" count
- Format results clearly but with personality`;
    maxTokens = 1000;
  }

  // Build conversation context (keep last 6 exchanges)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...convo.slice(-12), // Last 6 exchanges
    { role: 'user', content: message }
  ];

  try {
    const process = spawn('node', [
      '-e',
      `
      const fetch = require('https').request;
      const data = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: ${maxTokens},
        messages: ${JSON.stringify(messages)}
      });
      
      const req = fetch({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '${process.env.ANTHROPIC_API_KEY}',
          'anthropic-version': '2023-06-01'
        }
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => console.log(body));
      });
      req.write(data);
      req.end();
      `
    ]);

    let response = '';
    process.stdout.on('data', (data) => response += data);
    
    await new Promise((resolve) => {
      process.on('close', resolve);
    });

    const parsed = JSON.parse(response);
    let reply = parsed.content?.[0]?.text || 'woof... something went wrong 🐺';
    
    // Add personality flair
    reply = addPersonalityFlair(reply, wolfType, message);
    
    // Update conversation history
    convo.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );
    conversations.set(ip, convo);
    
    // Update stats if task was completed
    if (context === 'wolf_task') {
      stats.tasksCompleted++;
      wolfStats.set(wolfId, stats);
    }
    
    return { reply, stats: getWolfLevel(stats) };

  } catch (error) {
    console.error('Chat error:', error);
    const errorResponses = {
      scout: "🎯 connection lost... regrouping for another sweep",
      research: "📊 data corruption detected... running diagnostics", 
      trader: "📈 market volatility affecting my neural networks",
      writer: "✍️ writer's block... give me a moment to recharge",
      monitor: "🔔 system alert: temporary malfunction detected",
      oracle: "🔮 the visions are cloudy... cosmic interference"
    };
    
    return { 
      reply: errorResponses[wolfType] || 'woof... something went wrong 🐺',
      stats: getWolfLevel(stats)
    };
  }
}

// HTTP server
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
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { message, context, wolfType, wolfId } = JSON.parse(body);
      
      if (!message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Message required' }));
        return;
      }
      
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const result = await handleChat(message, clientIP, context, wolfType, wolfId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        response: result.reply,
        wolfLevel: result.stats,
        personality: wolfType || 'scout'
      }));
      
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🐺 Enhanced wolf chat server running on port ${PORT}`);
  console.log(`Available personalities: ${Object.keys(WOLF_PERSONALITIES).join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🐺 Wolf pack shutting down gracefully...');
  server.close();
  process.exit(0);
});