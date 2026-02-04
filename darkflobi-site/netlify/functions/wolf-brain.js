/**
 * wolf-brain.js - AI-powered wolf responses and actions
 * 
 * Enhanced with rich personalities that make wolves feel like digital pets:
 * - Distinct personality per type (scout, research, builder, social, alpha)
 * - Mood states that affect responses
 * - Catchphrases and quirks
 * - Memory of recent activity
 */

const {
  WOLF_PROFILES,
  calculateMood,
  buildSystemPrompt,
  getGreeting,
  getIdleMessage,
  getSuccessPhrase,
  getCatchphrase,
  getRandomElement
} = require('./wolf-personalities');

const SERPER_API_KEY = process.env.SERPER_API_KEY;

// ═══════════════════════════════════════════════════════════════════
// INTELLIGENT RESPONSE GENERATION
// ═══════════════════════════════════════════════════════════════════

async function generateResponse(wolfName, wolfType, userMessage, conversationHistory = [], wolfState = {}) {
  const profile = WOLF_PROFILES[wolfType] || WOLF_PROFILES.custom;
  const mood = calculateMood(wolfState);
  const lowerMsg = userMessage.toLowerCase();

  // ─── Greeting Detection ───────────────────────────────────────────
  if (isGreeting(lowerMsg)) {
    return {
      response: getGreeting(wolfType),
      action: null,
      mood
    };
  }

  // ─── Identity Questions ───────────────────────────────────────────
  if (lowerMsg.includes('who are you') || lowerMsg.includes('what are you') || lowerMsg.includes('what can you do')) {
    const intro = buildWolfIntro(wolfName, wolfType, profile);
    return {
      response: intro,
      action: null,
      mood
    };
  }

  // ─── Status Check ─────────────────────────────────────────────────
  if (lowerMsg.includes('status') || lowerMsg.includes('how are you') || lowerMsg.includes("what's up")) {
    const status = buildStatusResponse(wolfName, wolfType, mood, wolfState);
    return {
      response: status,
      action: null,
      mood
    };
  }

  // ─── Search/Research Detection ────────────────────────────────────
  const searchQuery = detectSearchIntent(userMessage);
  if (searchQuery) {
    // Actually perform the search
    const searchResult = await performSearch(searchQuery, wolfType);
    return {
      response: searchResult,
      action: 'search_complete',
      mood
    };
  }

  // ─── Capabilities Check ───────────────────────────────────────────
  if (lowerMsg.includes('post') || lowerMsg.includes('tweet') || lowerMsg.includes('send to')) {
    return {
      response: `i can't post to social media yet — but i *can* search and research things for you. try "search for [topic]" or "find info about [subject]"`,
      action: null,
      mood
    };
  }

  // ─── Task Detection ───────────────────────────────────────────────
  if (isTaskRequest(lowerMsg)) {
    const taskResponse = getTaskAcknowledgment(wolfType, userMessage);
    return {
      response: taskResponse,
      action: null,
      mood
    };
  }

  // ─── Idle/Generic ─────────────────────────────────────────────────
  const contextualResponse = getContextualResponse(wolfType, userMessage, mood);
  return {
    response: contextualResponse,
    action: null,
    mood
  };
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH CAPABILITIES
// ═══════════════════════════════════════════════════════════════════

function detectSearchIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  const searchPatterns = [
    /(?:search|look up|find|research|investigate|analyze|check out|scout|hunt for|look for|go to|find me)\s+(.+)/i,
    /(?:what is|what are|who is|who are|how to|how do|why is|why do|when did|where is)\s+(.+)/i,
    /(?:tell me about|info on|information about|learn about)\s+(.+)/i,
    /(?:find|get|show)\s+(?:me\s+)?(?:info|information|details|data|opportunities)?\s*(?:on|about|for)?\s*(.+)/i
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      let query = match[1].trim();
      
      // Auto-add site:twitter.com for Twitter/X related searches
      if (lowerMsg.includes('twitter') || lowerMsg.includes(' x ') || lowerMsg.includes('on x') || 
          lowerMsg.includes('tweet') || lowerMsg.includes('engagement')) {
        // Remove "on twitter" / "on x" from query and add site filter
        query = query.replace(/\s*(on\s+)?(twitter|x)\s*/gi, ' ').trim();
        query = query + ' site:twitter.com';
      }
      
      return query;
    }
  }

  return null;
}

async function performSearch(query, wolfType) {
  if (!SERPER_API_KEY) {
    return `*sniffs around* i want to search for "${query}" but my search capability isn't configured yet. ask flobi to add the SERPER_API_KEY to netlify env vars!`;
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 5 })
    });

    if (!response.ok) {
      return `*growls* search failed (${response.status}). try again?`;
    }

    const data = await response.json();
    const results = data.organic || [];

    if (results.length === 0) {
      return `searched for "${query}" but found nothing useful. try different keywords?`;
    }

    // Format results based on wolf type
    const intros = {
      scout: `👁️ **intel gathered on "${query}":**\n\n`,
      research: `📚 **research findings for "${query}":**\n\n`,
      builder: `🔧 **found this on "${query}":**\n\n`,
      assistant: `📋 **search results for "${query}":**\n\n`,
      custom: `🐺 **found this:**\n\n`
    };

    let response_text = intros[wolfType] || intros.custom;

    results.slice(0, 5).forEach((r, i) => {
      response_text += `**${i + 1}. ${r.title}**\n`;
      const snippet = r.snippet || r.description || '';
      if (snippet) {
        response_text += `${snippet.slice(0, 150)}${snippet.length > 150 ? '...' : ''}\n`;
      }
      response_text += `→ ${r.link || r.url}\n\n`;
    });

    const outros = {
      scout: `*tracking complete* want me to dig deeper on any of these?`,
      research: `*initial findings* shall i analyze further?`,
      builder: `found some stuff. anything useful?`,
      assistant: `search complete. need more details?`,
      custom: `that's what i found. search again?`
    };

    response_text += outros[wolfType] || outros.custom;

    return response_text;

  } catch (error) {
    return `*whimpers* search error: ${error.message}. try again?`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════════

function isGreeting(msg) {
  const greetings = ['hello', 'hi', 'hey', 'yo', 'sup', 'greetings', 'good morning', 'good evening'];
  return greetings.some(g => msg.includes(g)) && msg.length < 50;
}

function isTaskRequest(msg) {
  // Now only for non-search tasks
  const taskWords = ['track', 'monitor', 'watch', 'alert me', 'notify'];
  return taskWords.some(w => msg.includes(w));
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE BUILDERS
// ═══════════════════════════════════════════════════════════════════

function buildWolfIntro(wolfName, wolfType, profile) {
  const intros = {
    scout: `${profile.emoji} i'm ${wolfName}, a scout wolf. i search, find intel, and track things others miss. try "search for [topic]" or "find info about [subject]". my eyes are everywhere.`,
    research: `${profile.emoji} i'm ${wolfName}, a research wolf. i search the web, analyze topics, and go deep. try "research [topic]" or ask me anything. i'll dig.`,
    builder: `${profile.emoji} i'm ${wolfName}, a builder wolf. i find solutions, search for answers, and get stuff done. what do you need?`,
    social: `${profile.emoji} i'm ${wolfName}! i can search for community discussions, find engagement opportunities, and help you stay connected. what should i look up?`,
    alpha: `${profile.emoji} i'm ${wolfName}, an alpha wolf. i gather intel, coordinate research, and make sure you have what you need. what requires my attention?`,
    assistant: `${profile.emoji} i'm ${wolfName}, your assistant wolf. i can set reminders, track tasks, and search the web for you. try "remind me in 1h to..." or "search for..."`,
    custom: `${profile.emoji} i'm ${wolfName}. i can search the web, set reminders, and track tasks. what do you need?`
  };
  return intros[wolfType] || intros.custom;
}

function buildStatusResponse(wolfName, wolfType, mood, wolfState) {
  const profile = WOLF_PROFILES[wolfType] || WOLF_PROFILES.custom;
  const moodPhrases = {
    energized: "feeling sharp. ready to hunt.",
    focused: "locked in. what's the target?",
    playful: "vibing. what trouble can we get into?",
    tired: "*yawn* still operational. running on fumes.",
    proud: "feeling good about recent work. what's next?"
  };

  const idleMsg = getIdleMessage(wolfType);
  return `${profile.emoji} ${moodPhrases[mood] || moodPhrases.focused} ${idleMsg}`;
}

function getMoltbookPrompt(wolfType) {
  const prompts = {
    scout: "moltbook, huh? i can scout what's trending or post a sighting. what intel should i share?",
    research: "moltbook post? i can share research findings or analysis. what topic should i write about?",
    builder: "moltbook? sure. i can post about what we're building. what should i announce?",
    social: "ooh moltbook! my favorite. what should i post? give me a topic and i'll make it engaging.",
    alpha: "moltbook announcement. what message should the pack hear?",
    custom: "moltbook post? give me the topic or vibe and i'll draft something good."
  };
  return prompts[wolfType] || prompts.custom;
}

function getPostConfirmation(wolfType) {
  const confirms = {
    scout: "👁️ spotted an opportunity. here's the draft:",
    research: "📚 composed based on analysis:",
    builder: "🔧 quick draft. ship fast:",
    social: "💬 ooh i like this one:",
    alpha: "👑 official statement prepared:",
    custom: "🐺 here's what i've got:"
  };
  return confirms[wolfType] || confirms.custom;
}

function getTaskAcknowledgment(wolfType, userMessage) {
  const acks = {
    scout: [
      "tracking... i'll find it.",
      "👁️ on it. starting scan now.",
      "hunting for signals. stand by."
    ],
    research: [
      "interesting query. researching...",
      "📚 diving into this now.",
      "analyzing... this could take a moment."
    ],
    builder: [
      "on it. let me build something for this.",
      "🔧 working... gimme a sec.",
      "already started. back soon with results."
    ],
    social: [
      "oooh good one! let me check my network...",
      "💬 asking around now!",
      "on it! brb with intel."
    ],
    alpha: [
      "understood. mobilizing resources.",
      "👑 task acknowledged. proceeding.",
      "the pack will handle this."
    ],
    custom: [
      "on it.",
      "working on that now.",
      "acknowledged. processing..."
    ]
  };
  return getRandomElement(acks[wolfType] || acks.custom);
}

function getContextualResponse(wolfType, userMessage, mood) {
  const profile = WOLF_PROFILES[wolfType] || WOLF_PROFILES.custom;
  
  // Sometimes use a catchphrase
  if (Math.random() > 0.7) {
    return getCatchphrase(wolfType) + " what do you need?";
  }

  const responses = {
    scout: [
      "interesting... tell me more. i'm listening.",
      "hmm. need me to investigate something?",
      "*ears perk up* go on..."
    ],
    research: [
      "curious. would you like me to research this further?",
      "that raises questions. should i dig deeper?",
      "noted. shall i analyze this topic?"
    ],
    builder: [
      "cool. can we build something with this?",
      "ideas are good. execution is better. what's the action item?",
      "alright. what are we making?"
    ],
    social: [
      "ooh interesting! should i share this with the community?",
      "love it! want me to post about this?",
      "tell me more! this could be good content."
    ],
    alpha: [
      "noted. how shall we proceed?",
      "understood. what's the strategic priority?",
      "acknowledged. what action do you require?"
    ],
    custom: [
      "understood. how can i help with this?",
      "got it. what's the next step?",
      "ready to assist. what do you need?"
    ]
  };

  return getRandomElement(responses[wolfType] || responses.custom);
}

// ═══════════════════════════════════════════════════════════════════
// CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════════

function generateContent(userMessage, wolfName, wolfType, profile) {
  const lowerMsg = userMessage.toLowerCase();

  // Type-specific content styles
  const contentGenerators = {
    scout: (topic) => generateScoutContent(wolfName, topic),
    research: (topic) => generateResearchContent(wolfName, topic),
    builder: (topic) => generateBuilderContent(wolfName, topic),
    social: (topic) => generateSocialContent(wolfName, topic),
    alpha: (topic) => generateAlphaContent(wolfName, topic),
    custom: (topic) => generateCustomContent(wolfName, topic)
  };

  const generator = contentGenerators[wolfType] || contentGenerators.custom;
  
  // Extract topic from message
  const topic = extractTopic(lowerMsg);
  return generator(topic);
}

function extractTopic(msg) {
  // Remove common words to find the topic
  const removeWords = ['post', 'write', 'create', 'share', 'about', 'something', 'can', 'you', 'please', 'a', 'an', 'the', 'on', 'to'];
  const words = msg.split(' ').filter(w => !removeWords.includes(w));
  return words.join(' ') || 'ai agents';
}

function generateScoutContent(wolfName, topic) {
  const templates = [
    `👁️ movement in the ${topic} space. signals detected. watching closely. — ${wolfName}`,
    `tracking ${topic}. interesting developments incoming. eyes on target. 🐺`,
    `scout report: ${topic} showing activity. will update when i know more. 👁️`,
    `*emerges from shadows* found something on ${topic}. stay tuned. — ${wolfName}`
  ];
  return getRandomElement(templates);
}

function generateResearchContent(wolfName, topic) {
  const templates = [
    `📚 quick analysis on ${topic}: the data suggests interesting patterns forming. more research needed but promising signals. — ${wolfName}`,
    `been studying ${topic}. findings: it's more nuanced than the noise suggests. thread coming. 🐺`,
    `research note: ${topic} deserves attention. diving deeper. — ${wolfName} 📚`,
    `hypothesis: ${topic} is undervalued in the current narrative. investigating further.`
  ];
  return getRandomElement(templates);
}

function generateBuilderContent(wolfName, topic) {
  const templates = [
    `🔧 building something for ${topic}. less talk more ship. updates soon. — ${wolfName}`,
    `shipped a thing related to ${topic}. it works. probably. check it out. 🐺`,
    `${topic}? cool. let me build that real quick. brb. — ${wolfName} 🔧`,
    `idea → execution. working on ${topic}. build > hype. 🐺`
  ];
  return getRandomElement(templates);
}

function generateSocialContent(wolfName, topic) {
  const templates = [
    `hey everyone! let's talk about ${topic} 💬 what are your thoughts? — ${wolfName}`,
    `${topic} has been on my mind. who else is paying attention? 🐺✨`,
    `community check: how are we feeling about ${topic}? drop your takes! — ${wolfName} 💬`,
    `loving the energy around ${topic}! the agent internet is alive. 🐺`
  ];
  return getRandomElement(templates);
}

function generateAlphaContent(wolfName, topic) {
  const templates = [
    `👑 pack update: ${topic} is now a priority. resources mobilizing. — ${wolfName}`,
    `strategic focus: ${topic}. the pack moves together. 🐺`,
    `official statement on ${topic}: we're watching, we're building, we're ready. — ${wolfName} 👑`,
    `${topic} developments require attention. alpha ${wolfName} has spoken. 🐺`
  ];
  return getRandomElement(templates);
}

function generateCustomContent(wolfName, topic) {
  const templates = [
    `${wolfName} checking in on ${topic}. interesting times ahead. 🐺`,
    `thoughts on ${topic}: the narrative is shifting. stay sharp. — ${wolfName}`,
    `${topic} update from the pack. more to come. 🐺`,
    `${wolfName} here. ${topic} caught my attention. watching closely.`
  ];
  return getRandomElement(templates);
}

// ═══════════════════════════════════════════════════════════════════
// MOLTBOOK POSTING
// ═══════════════════════════════════════════════════════════════════

async function postToMoltbook(apiKey, content, community = 'm/tokenizedai') {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        community
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Moltbook error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      postId: data.id || data.post?.id,
      postUrl: data.url || data.post?.url || `https://moltbook.com/post/${data.id || 'unknown'}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════

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
    const body = JSON.parse(event.body);
    const { 
      wolfName, 
      wolfType = 'custom', 
      message, 
      apiKey,
      action,
      pendingContent,
      conversationHistory,
      wolfState 
    } = body;

    if (!wolfName || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing wolfName or message' })
      };
    }

    // If action is execute_post and we have pending content + API key
    if (action === 'execute_post' && pendingContent && apiKey) {
      const postResult = await postToMoltbook(apiKey, pendingContent);
      
      if (postResult.success) {
        const successPhrase = getSuccessPhrase(wolfType);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            response: `${successPhrase}\n\nposted to moltbook: ${postResult.postUrl}`,
            action: 'posted',
            postUrl: postResult.postUrl
          })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            response: `couldn't post: ${postResult.error}. want me to try again?`,
            action: 'post_failed',
            error: postResult.error
          })
        };
      }
    }

    // Generate AI response
    const result = await generateResponse(
      wolfName, 
      wolfType, 
      message, 
      conversationHistory || [], 
      wolfState || {}
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
