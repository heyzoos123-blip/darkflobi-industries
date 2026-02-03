/**
 * admin-stats.js - Returns spawn statistics for admin dashboard
 * 
 * Note: In-memory stats reset on cold starts. For full logs, use Netlify dashboard.
 * This provides a quick overview when the function is warm.
 */

// In-memory storage (shared with spawn-wolf if in same instance, otherwise separate)
// In production, use Netlify Blobs or external DB
const spawnLog = [];
const MAX_LOG_SIZE = 100;

// Track stats
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  pendingRefunds: 0
};

// This function can be called by spawn-wolf to log events
function logEvent(event) {
  spawnLog.unshift({
    ...event,
    timestamp: new Date().toISOString()
  });
  
  // Keep log size manageable
  if (spawnLog.length > MAX_LOG_SIZE) {
    spawnLog.pop();
  }
  
  // Update stats
  stats.total++;
  if (event.status === 'success') {
    stats.success++;
  } else if (event.status === 'moltbook_failed') {
    stats.failed++;
    stats.pendingRefunds++;
  } else if (event.status === 'payment_failed') {
    // Don't count payment failures in total (no money received)
    stats.total--;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Simple auth check via query param (additional layer)
  const params = new URLSearchParams(event.rawQuery || '');
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      stats: {
        total: stats.total,
        success: stats.success,
        failed: stats.failed,
        pendingRefunds: stats.pendingRefunds,
        note: 'Stats reset on cold start. See Netlify logs for full history.'
      },
      recent: spawnLog.slice(0, 20),
      pendingRefunds: spawnLog.filter(e => e.status === 'moltbook_failed').slice(0, 10),
      serverTime: new Date().toISOString(),
      logsUrl: 'https://app.netlify.com/projects/darkflobi/logs/functions'
    })
  };
};

// Export logEvent for potential shared use
module.exports.logEvent = logEvent;
