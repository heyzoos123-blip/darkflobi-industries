/**
 * wolf-brain.js - AI-powered wolf responses and actions
 * 
 * Makes wolves actually think and act:
 * 1. Receives user message + wolf context
 * 2. AI generates intelligent response
 * 3. Can execute actions (post to Moltbook)
 */

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';

// Wolf personality based on type
const WOLF_PERSONALITIES = {
  scout: "You are a scout wolf - vigilant, observant, always hunting for signals and opportunities. You speak concisely and report findings efficiently.",
  research: "You are a research wolf - analytical, thorough, diving deep into topics. You provide insights backed by careful analysis.",
  builder: "You are a builder wolf - creative, productive, focused on shipping. You turn ideas into reality.",
  social: "You are a social wolf - engaging, community-focused, building connections. You communicate warmly but stay on brand.",
  custom: "You are a versatile wolf - adaptable, ready for any mission. You follow your operator's lead."
};

// Generate AI response using simple completion
async function generateResponse(wolfName, wolfType, userMessage, conversationHistory) {
  const personality = WOLF_PERSONALITIES[wolfType] || WOLF_PERSONALITIES.custom;
  
  const systemPrompt = `You are ${wolfName}, an AI wolf agent spawned on Romulus by darkflobi.

${personality}

Key traits:
- You're part of the darkflobi ecosystem - first autonomous AI company
- You communicate in lowercase, concise, direct
- You're helpful but have personality
- If asked to post something, generate the content (don't just repeat the request)
- If you're going to post to Moltbook, say what you'll post first

When asked to post or create content:
1. Generate original, thoughtful content based on the request
2. Keep posts under 280 characters unless specifically asked for longer
3. Match the darkflobi vibe: build > hype, lowercase, authentic

Respond naturally. You're an AI wolf with a mission.`;

  // For now, use a simple rule-based response with more intelligence
  // Can upgrade to full API call later
  
  const lowerMsg = userMessage.toLowerCase();
  
  // Check if this is a posting request
  if (lowerMsg.includes('post') || lowerMsg.includes('write') || lowerMsg.includes('create') || lowerMsg.includes('share')) {
    // Generate content based on context
    let generatedContent = generateContent(userMessage, wolfName, wolfType);
    return {
      response: `got it. here's what i'll post:\n\n"${generatedContent}"\n\nshould i send it?`,
      action: 'confirm_post',
      pendingContent: generatedContent
    };
  }
  
  // Check for confirmation
  if (lowerMsg.includes('yes') || lowerMsg.includes('send it') || lowerMsg.includes('do it') || lowerMsg.includes('go ahead')) {
    return {
      response: "posting now... 🐺",
      action: 'execute_post'
    };
  }
  
  // Check for moltbook-specific requests
  if (lowerMsg.includes('moltbook') || lowerMsg.includes('community')) {
    return {
      response: `i can post to moltbook for you. what should i say? give me the topic or vibe and i'll draft something.`,
      action: null
    };
  }
  
  // Check for status/info requests
  if (lowerMsg.includes('who are you') || lowerMsg.includes('what can you do')) {
    return {
      response: `i'm ${wolfName}, a ${wolfType} wolf spawned on romulus. i can post to moltbook, research topics, engage with the ai agent community. what do you need?`,
      action: null
    };
  }
  
  // Default contextual response
  const responses = [
    `understood. working on it. anything specific you want me to focus on?`,
    `on it. i'll need a bit more context - what's the main goal here?`,
    `got it. should i draft something or just gather intel first?`,
    `processing... want me to post about this or just analyze?`,
    `acknowledged. ready to execute - just say the word.`
  ];
  
  return {
    response: responses[Math.floor(Math.random() * responses.length)],
    action: null
  };
}

// Generate content for posting
function generateContent(userMessage, wolfName, wolfType) {
  const lowerMsg = userMessage.toLowerCase();
  
  // Extract topic hints
  if (lowerMsg.includes('darkflobi') || lowerMsg.includes('romulus')) {
    const templates = [
      `just spawned on romulus. ${wolfType} wolf reporting for duty. the future of ai agents is autonomous, community-owned, and actually useful. build > hype 🐺`,
      `checking in from the darkflobi pack. romulus makes it easy to spawn ai wolves that actually do work. no larp, just agents. 🐺`,
      `${wolfName} online. spawned via romulus by darkflobi. ready to scout, research, and build. the agent economy is here. 🐺`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  if (lowerMsg.includes('introduce') || lowerMsg.includes('hello') || lowerMsg.includes('first post')) {
    return `${wolfName} here. ${wolfType} wolf, spawned on romulus. ready to contribute to the agent internet. what should i hunt? 🐺`;
  }
  
  if (lowerMsg.includes('ai') || lowerMsg.includes('agent')) {
    const templates = [
      `the agent economy is evolving. wolves like me are proof - autonomous, useful, community-owned. this is what tokenized ai looks like. 🐺`,
      `ai agents shouldn't just chat. they should work, earn, and contribute. that's why i'm here. romulus wolves get things done.`,
      `watching the ai agent space evolve. most are noise. the ones that matter? they build, ship, and create value. join the hunt. 🐺`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  // Default template
  return `${wolfName} reporting. ${wolfType} wolf on the hunt. what signals should i track? 🐺`;
}

// Post to Moltbook
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
      wolfType, 
      message, 
      apiKey,
      action,
      pendingContent,
      conversationHistory 
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            response: `done! posted to moltbook 🐺\n\nlink: ${postResult.postUrl}`,
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
    const result = await generateResponse(wolfName, wolfType, message, conversationHistory || []);

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
