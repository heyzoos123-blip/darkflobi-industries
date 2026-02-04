/**
 * spawn-wolf.js - Netlify Function for self-serve wolf spawning
 * 
 * Features:
 * - Verifies $DARKFLOBI token payment on-chain
 * - Prevents tx signature reuse (checks tx age)
 * - Rate limits by wallet address
 * - Registers wolf on Moltbook
 * - Logs all attempts
 * 
 * UPDATE 2026-02-03: Changed from SOL to $DARKFLOBI payments
 */

const TREASURY_ADDRESS = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';
const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Price in $DARKFLOBI tokens (6 decimals)
const PRICES = {
  basic: 10000,      // 10,000 DARKFLOBI
  premium: 25000     // 25,000 DARKFLOBI
};

// Max transaction age (1 hour in seconds)
const MAX_TX_AGE_SECONDS = 3600;

// In-memory tracking (resets on cold start, but catches rapid reuse)
const recentTxSignatures = new Set();
const recentWallets = new Map(); // wallet -> last spawn timestamp

// Verify $DARKFLOBI token payment on Solana
async function verifyPayment(txSignature, expectedAmount) {
  try {
    // Check if we've seen this signature recently (in-memory)
    if (recentTxSignatures.has(txSignature)) {
      return { valid: false, error: 'Transaction signature already used' };
    }

    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [txSignature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
      })
    });

    const data = await response.json();
    
    if (!data.result) {
      return { valid: false, error: 'Transaction not found. Make sure it\'s confirmed.' };
    }

    const tx = data.result;
    
    // Check if transaction was successful
    if (tx.meta?.err) {
      return { valid: false, error: 'Transaction failed on-chain' };
    }

    // Check transaction age
    const txTime = tx.blockTime;
    const now = Math.floor(Date.now() / 1000);
    if (txTime && (now - txTime) > MAX_TX_AGE_SECONDS) {
      return { valid: false, error: 'Transaction too old. Must be within last hour.' };
    }

    // Look for $DARKFLOBI token transfer to treasury
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];
    
    let sender = null;
    let amount = 0;
    
    // Find token transfer to treasury
    for (const post of postBalances) {
      // Check if this is DARKFLOBI token going to treasury
      if (post.mint === DARKFLOBI_MINT && post.owner === TREASURY_ADDRESS) {
        // Find matching pre-balance to calculate delta
        const pre = preBalances.find(p => 
          p.accountIndex === post.accountIndex && 
          p.mint === DARKFLOBI_MINT
        );
        
        const preAmount = pre?.uiTokenAmount?.uiAmount || 0;
        const postAmount = post.uiTokenAmount?.uiAmount || 0;
        const delta = postAmount - preAmount;
        
        if (delta > 0) {
          amount = delta;
          
          // Find sender (who lost tokens)
          for (const preB of preBalances) {
            if (preB.mint === DARKFLOBI_MINT && preB.owner !== TREASURY_ADDRESS) {
              const postB = postBalances.find(p => 
                p.accountIndex === preB.accountIndex
              );
              const senderPre = preB.uiTokenAmount?.uiAmount || 0;
              const senderPost = postB?.uiTokenAmount?.uiAmount || 0;
              if (senderPre > senderPost) {
                sender = preB.owner;
                break;
              }
            }
          }
          break;
        }
      }
    }

    // If we didn't find via balances, check instructions
    if (amount === 0) {
      const instructions = tx.transaction?.message?.instructions || [];
      for (const ix of instructions) {
        // Check for token transfer/transferChecked
        if (ix.parsed?.type === 'transfer' || ix.parsed?.type === 'transferChecked') {
          const info = ix.parsed.info;
          // Note: SPL transfers use token account addresses, not owner addresses
          // We need to check if destination token account is owned by treasury
          // For now, rely on balance checks above
        }
      }
    }

    // Verify amount (allow 5% tolerance for rounding)
    if (amount < expectedAmount * 0.95) {
      return { 
        valid: false, 
        error: `Insufficient payment. Expected ${expectedAmount} $DARKFLOBI, got ${amount.toFixed(2)} $DARKFLOBI` 
      };
    }

    // Mark signature as used
    recentTxSignatures.add(txSignature);
    
    // Limit set size to prevent memory issues
    if (recentTxSignatures.size > 1000) {
      const first = recentTxSignatures.values().next().value;
      recentTxSignatures.delete(first);
    }

    return { 
      valid: true, 
      amount,
      sender,
      txTime
    };
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}

// Rate limit check
function checkRateLimit(walletAddress) {
  if (!walletAddress) return { allowed: true };
  
  const lastSpawn = recentWallets.get(walletAddress);
  const now = Date.now();
  
  // Allow 1 spawn per minute per wallet
  if (lastSpawn && (now - lastSpawn) < 60000) {
    const waitSeconds = Math.ceil((60000 - (now - lastSpawn)) / 1000);
    return { 
      allowed: false, 
      error: `Rate limited. Try again in ${waitSeconds} seconds.` 
    };
  }
  
  recentWallets.set(walletAddress, now);
  
  // Clean old entries
  if (recentWallets.size > 500) {
    const cutoff = now - 120000; // 2 minutes
    for (const [wallet, time] of recentWallets) {
      if (time < cutoff) recentWallets.delete(wallet);
    }
  }
  
  return { allowed: true };
}

// Register wolf on Moltbook
async function registerOnMoltbook(wolfName, description) {
  try {
    const response = await fetch(`${MOLTBOOK_API_BASE}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: wolfName,
        description: description
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Moltbook error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    
    // API returns agent object (no "success" field)
    if (data.agent && data.agent.api_key) {
      return {
        success: true,
        apiKey: data.agent.api_key,
        claimUrl: data.agent.claim_url,
        profileUrl: `https://moltbook.com/u/${wolfName}`,
        verificationCode: data.agent.verification_code
      };
    } else {
      return { success: false, error: data.error || 'Unexpected Moltbook response format' };
    }
  } catch (error) {
    return { success: false, error: `Moltbook registration failed: ${error.message}` };
  }
}

// Generate wolf ID
function generateWolfId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `wolf-${timestamp}-${random}`;
}

// Log spawn attempt (console for now, could send to external service)
function logSpawn(data) {
  const log = {
    timestamp: new Date().toISOString(),
    ...data
  };
  console.log('SPAWN_LOG:', JSON.stringify(log));
  return log;
}

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';

  try {
    const body = JSON.parse(event.body);
    const { wolfName, wolfType, description, tier, txSignature } = body;

    // Validate inputs
    if (!wolfName || wolfName.length < 2 || wolfName.length > 32) {
      logSpawn({ status: 'rejected', reason: 'invalid_name', ip: clientIP });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wolf name must be 2-32 characters' })
      };
    }

    // Sanitize wolf name (alphanumeric, spaces, underscores, hyphens only)
    const sanitizedName = wolfName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
    if (sanitizedName.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Wolf name contains invalid characters' })
      };
    }

    if (!description || description.length < 5 || description.length > 200) {
      logSpawn({ status: 'rejected', reason: 'invalid_description', ip: clientIP });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Description must be 5-200 characters' })
      };
    }

    if (!['basic', 'premium'].includes(tier)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid tier' })
      };
    }

    if (!txSignature || txSignature.length < 80 || txSignature.length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid transaction signature format' })
      };
    }

    // Verify $DARKFLOBI payment
    const expectedAmount = PRICES[tier];
    const paymentResult = await verifyPayment(txSignature, expectedAmount);

    if (!paymentResult.valid) {
      logSpawn({ 
        status: 'payment_failed', 
        reason: paymentResult.error,
        txSignature: txSignature.slice(0, 20) + '...',
        ip: clientIP 
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment verification failed',
          details: paymentResult.error
        })
      };
    }

    // Rate limit check
    const rateCheck = checkRateLimit(paymentResult.sender);
    if (!rateCheck.allowed) {
      logSpawn({ 
        status: 'rate_limited', 
        wallet: paymentResult.sender?.slice(0, 10) + '...',
        ip: clientIP 
      });
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: rateCheck.error })
      };
    }

    // Generate wolf ID
    const wolfId = generateWolfId();

    // Success! Simple wolf spawn - no moltbook needed
    const response = {
      success: true,
      wolfId,
      wolfName: sanitizedName,
      wolfType: wolfType || 'custom',
      tier,
      payment: {
        amount: paymentResult.amount,
        token: '$DARKFLOBI',
        txSignature
      },
      note: tier === 'premium' 
        ? `Wolf spawned! Your wolf ${sanitizedName} is ready. DM @darkflobi to activate.`
        : `Wolf spawned! DM @darkflobi to assign tasks to ${sanitizedName}.`
    };

    logSpawn({ 
      status: 'success', 
      wolfId,
      wolfName: sanitizedName,
      wolfType: wolfType || 'custom',
      tier,
      amount: paymentResult.amount,
      token: 'DARKFLOBI',
      wallet: paymentResult.sender?.slice(0, 10) + '...'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    logSpawn({ status: 'error', error: error.message, ip: clientIP });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Server error: ${error.message}` })
    };
  }
};
