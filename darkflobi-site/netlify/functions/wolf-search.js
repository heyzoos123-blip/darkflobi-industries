/**
 * wolf-search.js - Real web search capabilities for wolves
 * 
 * Uses Brave Search API for real web results
 * Falls back to basic search if no API key
 */

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

// ═══════════════════════════════════════════════════════════════════
// BRAVE SEARCH
// ═══════════════════════════════════════════════════════════════════

async function braveSearch(query, count = 5) {
  if (!BRAVE_API_KEY) {
    return { success: false, error: 'No search API configured' };
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      return { success: false, error: `Search failed: ${response.status}` };
    }

    const data = await response.json();
    
    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));

    return { success: true, results, query };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH INTENT DETECTION
// ═══════════════════════════════════════════════════════════════════

function detectSearchIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  const searchPatterns = [
    /(?:search|look up|find|research|investigate|analyze|check|scout|hunt for|look for)\s+(.+)/i,
    /(?:what is|what are|who is|who are|how to|how do|why is|why do|when did|where is)\s+(.+)/i,
    /(?:tell me about|info on|information about|learn about)\s+(.+)/i,
    /(?:find me|get me|show me)\s+(?:info|information|details|data)?\s*(?:on|about)?\s*(.+)/i
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Check for keywords that suggest research
  const researchKeywords = ['research', 'search', 'find', 'look up', 'investigate', 'analyze', 'scout'];
  if (researchKeywords.some(k => lowerMsg.includes(k))) {
    // Extract what comes after the keyword
    for (const keyword of researchKeywords) {
      const idx = lowerMsg.indexOf(keyword);
      if (idx !== -1) {
        const afterKeyword = message.slice(idx + keyword.length).trim();
        if (afterKeyword.length > 3) {
          return afterKeyword.replace(/^(for|about|on)\s+/i, '').trim();
        }
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// FORMAT RESULTS FOR WOLF RESPONSE
// ═══════════════════════════════════════════════════════════════════

function formatSearchResults(results, query, wolfType = 'scout') {
  if (!results || results.length === 0) {
    return `searched for "${query}" but found nothing useful. try different keywords?`;
  }

  const intros = {
    scout: `👁️ **intel gathered on "${query}":**\n\n`,
    research: `📚 **research findings for "${query}":**\n\n`,
    builder: `🔧 **found this on "${query}":**\n\n`,
    assistant: `📋 **search results for "${query}":**\n\n`,
    custom: `🐺 **found this on "${query}":**\n\n`
  };

  let response = intros[wolfType] || intros.custom;

  results.slice(0, 5).forEach((r, i) => {
    response += `**${i + 1}. ${r.title}**\n`;
    response += `${r.description}\n`;
    response += `→ ${r.url}\n\n`;
  });

  const outros = {
    scout: `*tracking complete. want me to dig deeper on any of these?*`,
    research: `*initial findings compiled. shall i analyze any of these further?*`,
    builder: `*found some stuff. anything useful here?*`,
    assistant: `*search complete. need more details on any result?*`,
    custom: `*that's what i found. want me to search for something else?*`
  };

  response += outros[wolfType] || outros.custom;

  return response;
}

// ═══════════════════════════════════════════════════════════════════
// TWITTER/X SPECIFIC SEARCH
// ═══════════════════════════════════════════════════════════════════

async function searchTwitterContext(query) {
  // Search for Twitter/X related content
  const twitterQuery = `${query} site:twitter.com OR site:x.com`;
  return await braveSearch(twitterQuery, 5);
}

async function searchCommunities(topic) {
  // Search for communities and engagement opportunities
  const communityQuery = `${topic} community discussion engagement Twitter Reddit`;
  return await braveSearch(communityQuery, 5);
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
    const { query, wolfType, searchType } = body;

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing query' })
      };
    }

    let searchResult;
    
    if (searchType === 'twitter') {
      searchResult = await searchTwitterContext(query);
    } else if (searchType === 'communities') {
      searchResult = await searchCommunities(query);
    } else {
      searchResult = await braveSearch(query);
    }

    if (!searchResult.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          response: `*sniffs around* couldn't search right now: ${searchResult.error}. try again later?`,
          error: searchResult.error
        })
      };
    }

    const formattedResponse = formatSearchResults(searchResult.results, query, wolfType);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: formattedResponse,
        results: searchResult.results,
        query: query
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Export helpers for use in wolf-brain
module.exports.detectSearchIntent = detectSearchIntent;
module.exports.braveSearch = braveSearch;
module.exports.formatSearchResults = formatSearchResults;
