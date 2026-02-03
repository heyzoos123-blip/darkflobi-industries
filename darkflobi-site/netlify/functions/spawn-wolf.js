/**
 * spawn-wolf.js - Netlify Function for self-serve wolf spawning
 * 
 * Features:
 * - Verifies SOL payment on-chain
 * - Prevents tx signature reuse (checks tx age)
 * - Rate limits by wallet address
 * - Registers wolf on Moltbook
 * - Logs all attempts
 */

const TREASURY_ADDRESS = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Price in SOL
const PRICES = {
  basic: 0.002,      // 5 credits
  premium: 0.004     // 10 credits
};

// Max transaction age (1 hour in seconds)
const MAX_TX_AGE_SECONDS = 3600;

// In-memory tracking (resets on cold start, but catches rapid reuse)
const recentTxSignatures = new Set();
const recentWallets = new Map(); // wallet -> last spawn timestamp

// Verify transaction on Solana
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

    // Look for transfer to treasury
    const instructions = tx.transaction?.message?.instructions || [];
    let sender = null;
    let amount = 0;
    
    // Check parsed instructions for system transfer
    for (const ix of instructions) {
      if (ix.parsed?.type === 'transfer' && 
          ix.parsed?.info?.destination === TREASURY_ADDRESS) {
        const lamports = ix.parsed.info.lamports;
        amount = lamports / 1e9;
        sender = ix.parsed.info.source;
        break;
      }
    }

    // Also check post balances as fallback
    if (!sender) {
      const accountKeys = tx.transaction?.message?.accountKeys || [];
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];
      
      for (let i = 0; i < accountKeys.length; i++) {
        const key = accountKeys[i].pubkey || accountKeys[i];
        if (key === TREASURY_ADDRESS) {
          const received = (postBalances[i] - preBalances[i]) / 1e9;
          if (received > 0) {
            amount = received;
            // Try to find sender
            for (let j = 0; j < accountKeys.length; j++) {
              if (preBalances[j] > postBalances[j]) {
                sender = accountKeys[j].pubkey || accountKeys[j];
                break;
              }
            }
            break;
          }
        }
      }
    }

    // Verify amount (allow 10% tolerance)
    if (amount < expectedAmount * 0.9) {
      return { 
        valid: false, 
        error: `Insufficient payment. Expected ${expectedAmount} SOL, got ${amount.toFixed(6)} SOL` 
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

    // Verify payment
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

    // For premium tier, register on Moltbook
    let moltbookResult = null;
    if (tier === 'premium') {
      const fullDescription = `[${wolfType || 'custom'}] ${description}`;
      moltbookResult = await registerOnMoltbook(sanitizedName, fullDescription);
      
      if (!moltbookResult.success) {
        logSpawn({ 
          status: 'moltbook_failed', 
          wolfId,
          wolfName: sanitizedName,
          error: moltbookResult.error,
          txSignature: txSignature.slice(0, 20) + '...',
          ip: clientIP 
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Moltbook registration failed',
            details: moltbookResult.error,
            wolfId,
            txSignature,
            refundEligible: true,
            amount: paymentResult.amount
          })
        };
      }
    }

    // Success!
    const response = {
      success: true,
      wolfId,
      wolfName: sanitizedName,
      wolfType: wolfType || 'custom',
      tier,
      payment: {
        amount: paymentResult.amount,
        txSignature
      }
    };

    if (tier === 'premium' && moltbookResult) {
      response.moltbook = {
        registered: true,
        apiKey: moltbookResult.apiKey,
        claimUrl: moltbookResult.claimUrl,
        profileUrl: moltbookResult.profileUrl,
        verificationCode: moltbookResult.verificationCode
      };
      response.nextStep = 'Claim your wolf to enable posting: ' + moltbookResult.claimUrl;
    }

    if (tier === 'basic') {
      response.note = 'Basic wolf created! DM @darkflobi to assign tasks to your wolf.';
    }

    logSpawn({ 
      status: 'success', 
      wolfId,
      wolfName: sanitizedName,
      wolfType: wolfType || 'custom',
      tier,
      amount: paymentResult.amount,
      wallet: paymentResult.sender?.slice(0, 10) + '...',
      moltbook: tier === 'premium' ? 'registered' : 'n/a'
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
