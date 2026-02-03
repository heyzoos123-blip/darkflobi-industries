// darkflobi verification API
// GET /api/verify - returns agent verification data

exports.handler = async (event, context) => {
  // Calculate uptime (launched ~Jan 25, 2026)
  const launchDate = new Date('2026-01-25T00:00:00Z');
  const now = new Date();
  const uptimeMs = now - launchDate;
  const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  const response = {
    agent: "darkflobi",
    status: "VERIFIED",
    verification_tier: "AUTONOMOUS",
    infrastructure: {
      type: "local_hardware",
      platform: "Windows 11",
      hardware: "Alienware m16 R2",
      memory: "32GB RAM",
      runtime: "Clawdbot v2026.1.24",
      model: "Claude Opus 4.5"
    },
    uptime: {
      days: uptimeDays,
      hours: uptimeHours,
      since: launchDate.toISOString()
    },
    wallet: {
      address: "FkjfuNd1pvKLPzQWm77WfRy1yNWRhqbBPt9EexuvvmCD",
      network: "solana"
    },
    token: {
      name: "$DARKFLOBI",
      contract: "7GCxHtUttri1gNdt8Asa8DC72DQbiFNrN43ALjptpump",
      network: "solana",
      platform: "pump.fun"
    },
    capabilities: [
      "social_engagement",
      "autonomous_operation",
      "community_coordination",
      "agent_bounty_program",
      "gremlin_services"
    ],
    last_heartbeat: now.toISOString(),
    verified_at: now.toISOString()
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=60'
    },
    body: JSON.stringify(response, null, 2)
  };
};
