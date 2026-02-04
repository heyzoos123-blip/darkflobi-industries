/**
 * wolf-assistant.js - Assistant wolf capabilities
 * 
 * Handles:
 * - Reminders (set, list, clear)
 * - Tasks (add, complete, list)
 * - Daily briefings
 * 
 * Uses Netlify Blobs for persistent storage
 */

const { getStore } = require('@netlify/blobs');

// ═══════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════

async function getWolfData(store, wolfId) {
  try {
    const data = await store.get(wolfId, { type: 'json' });
    return data || { reminders: [], tasks: [], settings: {}, createdAt: Date.now() };
  } catch {
    return { reminders: [], tasks: [], settings: {}, createdAt: Date.now() };
  }
}

async function saveWolfData(store, wolfId, data) {
  await store.setJSON(wolfId, data);
}

// ═══════════════════════════════════════════════════════════════════
// REMINDER PARSING
// ═══════════════════════════════════════════════════════════════════

function parseReminder(message) {
  const lowerMsg = message.toLowerCase();
  
  // Pattern: "remind me in X [minutes/hours/days] to [do something]"
  const inPattern = /remind\s+me\s+in\s+(\d+)\s*(min|minute|minutes|hr|hour|hours|h|day|days|d)\s*(?:to\s+)?(.+)/i;
  const inMatch = message.match(inPattern);
  
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    const task = inMatch[3].trim();
    
    let ms = 0;
    if (unit.startsWith('min')) ms = amount * 60 * 1000;
    else if (unit.startsWith('h') || unit.startsWith('hr') || unit.startsWith('hour')) ms = amount * 60 * 60 * 1000;
    else if (unit.startsWith('d')) ms = amount * 24 * 60 * 60 * 1000;
    
    return {
      task,
      dueAt: Date.now() + ms,
      dueIn: `${amount} ${unit}`
    };
  }
  
  // Pattern: "remind me at [time] to [do something]"
  const atPattern = /remind\s+me\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to\s+)?(.+)/i;
  const atMatch = message.match(atPattern);
  
  if (atMatch) {
    let hours = parseInt(atMatch[1]);
    const minutes = atMatch[2] ? parseInt(atMatch[2]) : 0;
    const ampm = atMatch[3]?.toLowerCase();
    const task = atMatch[4].trim();
    
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    const now = new Date();
    const due = new Date(now);
    due.setHours(hours, minutes, 0, 0);
    
    // If time already passed today, set for tomorrow
    if (due <= now) {
      due.setDate(due.getDate() + 1);
    }
    
    return {
      task,
      dueAt: due.getTime(),
      dueIn: `at ${hours}:${minutes.toString().padStart(2, '0')}`
    };
  }
  
  // Pattern: "remind me tomorrow to [do something]"
  const tomorrowPattern = /remind\s+me\s+tomorrow\s*(?:to\s+)?(.+)/i;
  const tomorrowMatch = message.match(tomorrowPattern);
  
  if (tomorrowMatch) {
    const task = tomorrowMatch[1].trim();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default to 9am
    
    return {
      task,
      dueAt: tomorrow.getTime(),
      dueIn: 'tomorrow at 9am'
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// TASK PARSING
// ═══════════════════════════════════════════════════════════════════

function parseTask(message) {
  const lowerMsg = message.toLowerCase();
  
  // Add task patterns
  const addPatterns = [
    /(?:add|create|new)\s+task[:\s]+(.+)/i,
    /task[:\s]+(.+)/i,
    /todo[:\s]+(.+)/i,
    /(?:i need to|i have to|i should)\s+(.+)/i
  ];
  
  for (const pattern of addPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { action: 'add', task: match[1].trim() };
    }
  }
  
  // Complete task patterns
  const completePatterns = [
    /(?:complete|done|finish|check off)\s+(?:task\s+)?[#]?(\d+)/i,
    /(?:mark|set)\s+(?:task\s+)?[#]?(\d+)\s+(?:as\s+)?(?:done|complete)/i
  ];
  
  for (const pattern of completePatterns) {
    const match = message.match(pattern);
    if (match) {
      return { action: 'complete', index: parseInt(match[1]) - 1 };
    }
  }
  
  // List tasks
  if (lowerMsg.includes('list task') || lowerMsg.includes('show task') || 
      lowerMsg.includes('my task') || lowerMsg.includes('what are my task')) {
    return { action: 'list' };
  }
  
  // Clear completed
  if (lowerMsg.includes('clear completed') || lowerMsg.includes('remove completed')) {
    return { action: 'clear_completed' };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BRIEFING GENERATION
// ═══════════════════════════════════════════════════════════════════

function generateBriefing(wolfName, data) {
  const now = Date.now();
  const pendingReminders = data.reminders.filter(r => r.dueAt > now);
  const overdueReminders = data.reminders.filter(r => r.dueAt <= now && !r.dismissed);
  const pendingTasks = data.tasks.filter(t => !t.completed);
  const completedToday = data.tasks.filter(t => {
    if (!t.completed) return false;
    const completedDate = new Date(t.completedAt);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  });
  
  let briefing = `📋 **daily briefing from ${wolfName}**\n\n`;
  
  // Overdue reminders (urgent)
  if (overdueReminders.length > 0) {
    briefing += `⚠️ **overdue:**\n`;
    overdueReminders.forEach(r => {
      briefing += `  • ${r.task}\n`;
    });
    briefing += '\n';
  }
  
  // Upcoming reminders
  if (pendingReminders.length > 0) {
    briefing += `⏰ **upcoming reminders:** ${pendingReminders.length}\n`;
    pendingReminders.slice(0, 3).forEach(r => {
      const timeLeft = formatTimeUntil(r.dueAt);
      briefing += `  • ${r.task} (${timeLeft})\n`;
    });
    if (pendingReminders.length > 3) {
      briefing += `  ... and ${pendingReminders.length - 3} more\n`;
    }
    briefing += '\n';
  }
  
  // Tasks
  if (pendingTasks.length > 0) {
    briefing += `📝 **tasks:** ${pendingTasks.length} pending\n`;
    pendingTasks.slice(0, 5).forEach((t, i) => {
      briefing += `  ${i + 1}. ${t.task}\n`;
    });
    if (pendingTasks.length > 5) {
      briefing += `  ... and ${pendingTasks.length - 5} more\n`;
    }
    briefing += '\n';
  }
  
  // Completed today
  if (completedToday.length > 0) {
    briefing += `✅ **completed today:** ${completedToday.length}\n`;
  }
  
  // If nothing
  if (pendingReminders.length === 0 && pendingTasks.length === 0 && overdueReminders.length === 0) {
    briefing = `📋 **daily briefing from ${wolfName}**\n\nall clear! no reminders or tasks pending. enjoy the calm... or give me something to track 🐺`;
  }
  
  return briefing;
}

function formatTimeUntil(timestamp) {
  const diff = timestamp - Date.now();
  if (diff < 0) return 'overdue';
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return 'soon';
}

// ═══════════════════════════════════════════════════════════════════
// CHECK FOR DUE REMINDERS
// ═══════════════════════════════════════════════════════════════════

function checkDueReminders(data) {
  const now = Date.now();
  const due = data.reminders.filter(r => r.dueAt <= now && !r.notified);
  
  // Mark as notified
  due.forEach(r => r.notified = true);
  
  return due;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
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
    const { wolfId, wolfName, wolfType, action, message } = body;

    if (!wolfId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing wolfId' })
      };
    }

    const store = getStore('wolf-data');
    let data = await getWolfData(store, wolfId);
    let response = null;
    let actionTaken = null;

    // Handle specific actions
    if (action === 'init') {
      // Initialize new wolf as trial
      const TRIAL_DURATION = 24 * 60 * 60 * 1000; // 24 hours
      const TRIAL_MESSAGES = 10;
      
      const newData = {
        reminders: [],
        tasks: [],
        settings: {
          name: wolfName,
          type: wolfType || 'assistant'
        },
        createdAt: Date.now(),
        lastActive: Date.now(),
        // Trial tracking
        trial: {
          active: true,
          expiresAt: Date.now() + TRIAL_DURATION,
          messagesUsed: 0,
          messagesLimit: TRIAL_MESSAGES,
          upgraded: false
        }
      };
      await saveWolfData(store, wolfId, newData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, wolfId, trial: newData.trial })
      };
    }
    
    if (action === 'delete') {
      // Delete wolf data
      try {
        await store.delete(wolfId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, deleted: true })
        };
      } catch (e) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: e.message })
        };
      }
    }
    
    if (action === 'check_trial') {
      // Check trial status
      const trial = data.trial || { active: false, upgraded: true };
      const now = Date.now();
      
      let status = 'active';
      let reason = null;
      
      if (trial.upgraded) {
        status = 'upgraded';
      } else if (trial.active) {
        if (now > trial.expiresAt) {
          status = 'expired';
          reason = 'time';
        } else if (trial.messagesUsed >= trial.messagesLimit) {
          status = 'expired';
          reason = 'messages';
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          trial: {
            ...trial,
            status,
            reason,
            timeLeft: Math.max(0, trial.expiresAt - now),
            messagesLeft: Math.max(0, trial.messagesLimit - trial.messagesUsed)
          }
        })
      };
    }
    
    if (action === 'use_message') {
      // Increment message count for trial
      if (data.trial && data.trial.active && !data.trial.upgraded) {
        data.trial.messagesUsed = (data.trial.messagesUsed || 0) + 1;
        await saveWolfData(store, wolfId, data);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          messagesUsed: data.trial?.messagesUsed || 0,
          messagesLimit: data.trial?.messagesLimit || 10
        })
      };
    }
    
    if (action === 'upgrade') {
      // Upgrade wolf from trial to permanent
      const { txSignature } = body;
      
      if (!txSignature) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Missing transaction signature' })
        };
      }
      
      // Verify payment
      const TREASURY = 'FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD';
      const DARKFLOBI_MINT = '7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump';
      const UPGRADE_PRICE = 10000; // 10,000 $DARKFLOBI
      
      try {
        const rpcResponse = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [txSignature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
          })
        });
        
        const rpcData = await rpcResponse.json();
        
        if (!rpcData.result) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: false, error: 'Transaction not found. Make sure it\'s confirmed.' })
          };
        }
        
        const tx = rpcData.result;
        
        // Check tx success
        if (tx.meta?.err) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: false, error: 'Transaction failed on-chain' })
          };
        }
        
        // Find $DARKFLOBI transfer to treasury
        const postBalances = tx.meta?.postTokenBalances || [];
        const preBalances = tx.meta?.preTokenBalances || [];
        let amount = 0;
        
        for (const post of postBalances) {
          if (post.mint === DARKFLOBI_MINT && post.owner === TREASURY) {
            const pre = preBalances.find(p => p.accountIndex === post.accountIndex && p.mint === DARKFLOBI_MINT);
            const preAmt = pre?.uiTokenAmount?.uiAmount || 0;
            const postAmt = post.uiTokenAmount?.uiAmount || 0;
            amount = postAmt - preAmt;
            break;
          }
        }
        
        if (amount < UPGRADE_PRICE * 0.95) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: `Insufficient payment. Expected ${UPGRADE_PRICE} $DARKFLOBI, got ${amount.toFixed(0)}` 
            })
          };
        }
        
        // Payment verified - upgrade wolf
        data.trial = data.trial || {};
        data.trial.upgraded = true;
        data.trial.active = false;
        data.trial.upgradedAt = Date.now();
        data.trial.upgradeTx = txSignature;
        await saveWolfData(store, wolfId, data);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            upgraded: true,
            message: 'Wolf upgraded! No more limits.'
          })
        };
        
      } catch (e) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: false, error: `Verification failed: ${e.message}` })
        };
      }
    }
    
    if (action === 'heartbeat') {
      // Update lastActive timestamp
      data.lastActive = Date.now();
      await saveWolfData(store, wolfId, data);
      
      // Check if wolf should expire (30 days = 2592000000 ms)
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const isExpired = data.lastActive && (Date.now() - data.lastActive > THIRTY_DAYS);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, isExpired })
      };
    }
    
    if (action === 'get_briefing') {
      response = generateBriefing(wolfName || wolfId, data);
      actionTaken = 'briefing';
    }
    
    else if (action === 'check_reminders') {
      const due = checkDueReminders(data);
      if (due.length > 0) {
        await saveWolfData(store, wolfId, data);
        response = `🔔 **reminder${due.length > 1 ? 's' : ''}!**\n${due.map(r => `• ${r.task}`).join('\n')}`;
        actionTaken = 'reminder_alert';
      } else {
        response = null;
        actionTaken = 'no_reminders';
      }
    }
    
    else if (action === 'get_data') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data })
      };
    }
    
    // Parse message for intents
    else if (message) {
      const lowerMsg = message.toLowerCase();
      
      // Check for reminder
      const reminder = parseReminder(message);
      if (reminder) {
        const newReminder = {
          id: Date.now().toString(),
          task: reminder.task,
          dueAt: reminder.dueAt,
          createdAt: Date.now(),
          notified: false
        };
        data.reminders.push(newReminder);
        await saveWolfData(store, wolfId, data);
        
        response = `⏰ got it. i'll remind you ${reminder.dueIn}: "${reminder.task}"`;
        actionTaken = 'reminder_set';
      }
      
      // Check for task
      else {
        const task = parseTask(message);
        if (task) {
          if (task.action === 'add') {
            data.tasks.push({
              id: Date.now().toString(),
              task: task.task,
              completed: false,
              createdAt: Date.now()
            });
            await saveWolfData(store, wolfId, data);
            response = `📝 added: "${task.task}" (${data.tasks.filter(t => !t.completed).length} tasks pending)`;
            actionTaken = 'task_added';
          }
          
          else if (task.action === 'complete') {
            const pendingTasks = data.tasks.filter(t => !t.completed);
            if (task.index >= 0 && task.index < pendingTasks.length) {
              const taskToComplete = pendingTasks[task.index];
              taskToComplete.completed = true;
              taskToComplete.completedAt = Date.now();
              await saveWolfData(store, wolfId, data);
              response = `✅ done: "${taskToComplete.task}"`;
              actionTaken = 'task_completed';
            } else {
              response = `hmm, can't find task #${task.index + 1}. try "list tasks" to see them.`;
              actionTaken = 'task_not_found';
            }
          }
          
          else if (task.action === 'list') {
            const pending = data.tasks.filter(t => !t.completed);
            if (pending.length === 0) {
              response = `no tasks! either you're crushing it or slacking. give me something to track.`;
            } else {
              response = `📝 **your tasks:**\n${pending.map((t, i) => `${i + 1}. ${t.task}`).join('\n')}\n\nsay "done #" to complete one.`;
            }
            actionTaken = 'task_list';
          }
          
          else if (task.action === 'clear_completed') {
            const before = data.tasks.length;
            data.tasks = data.tasks.filter(t => !t.completed);
            await saveWolfData(store, wolfId, data);
            response = `cleared ${before - data.tasks.length} completed tasks.`;
            actionTaken = 'tasks_cleared';
          }
        }
      }
      
      // Check for briefing request
      if (!response && (lowerMsg.includes('briefing') || lowerMsg.includes('brief me') || 
          lowerMsg.includes("what's up") || lowerMsg.includes('status') || lowerMsg.includes('what do i have'))) {
        response = generateBriefing(wolfName || wolfId, data);
        actionTaken = 'briefing';
      }
      
      // List reminders
      if (!response && (lowerMsg.includes('list reminder') || lowerMsg.includes('my reminder') || lowerMsg.includes('show reminder'))) {
        const pending = data.reminders.filter(r => r.dueAt > Date.now());
        if (pending.length === 0) {
          response = `no active reminders. want me to set one?`;
        } else {
          response = `⏰ **your reminders:**\n${pending.map(r => `• ${r.task} (${formatTimeUntil(r.dueAt)})`).join('\n')}`;
        }
        actionTaken = 'reminder_list';
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        response,
        action: actionTaken,
        hasData: data.reminders.length > 0 || data.tasks.length > 0
      })
    };

  } catch (error) {
    console.error('Wolf assistant error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
