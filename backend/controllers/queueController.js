const PatientVisit = require('../models/PatientVisit');

/**
 * Core queue algorithm:
 * PriorityScore = (severityScore * Ws) + (minutesWaiting * Wt)
 * Ws = 1 (severity is 1-100 scale), Wt = 0.5
 *
 * This prevents starvation: even a low-severity patient will eventually
 * outrank a high-severity patient who has been waiting longer.
 */
const WEIGHT_SEVERITY = 1;
const WEIGHT_TIME = 0.5;

function computePriorityScore(severityScore, checkInTime) {
  const minutesWaiting = Math.floor((Date.now() - new Date(checkInTime).getTime()) / 60000);
  return parseFloat(((severityScore * WEIGHT_SEVERITY) + (minutesWaiting * WEIGHT_TIME)).toFixed(2));
}

/**
 * Fetch all WAITING and IN_CONSULTATION patients,
 * compute their current priority scores,
 * sort descending (highest priority first),
 * and broadcast via Socket.io.
 */
async function recalculateAndBroadcastQueue(io) {
  try {
    const patients = await PatientVisit.find({
      status: { $in: ['WAITING', 'IN_CONSULTATION'] },
    }).lean();

    const queue = patients
      .map((p) => {
        const minutesWaiting = Math.floor((Date.now() - new Date(p.checkInTime).getTime()) / 60000);
        const priorityScore = computePriorityScore(p.severityScore, p.checkInTime);
        return {
          ...p,
          minutesWaiting,
          priorityScore,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

    // Add queue position (rank)
    const rankedQueue = queue.map((p, idx) => ({ ...p, queuePosition: idx + 1 }));

    io.emit('queue:update', rankedQueue);
    return rankedQueue;
  } catch (err) {
    console.error('recalculateAndBroadcastQueue error:', err);
  }
}

/**
 * GET /api/queue
 * HTTP endpoint to fetch current queue snapshot (same logic as above).
 */
async function getQueue(req, res) {
  try {
    const queue = await recalculateAndBroadcastQueue(req.io);
    return res.json(queue || []);
  } catch (err) {
    console.error('getQueue error:', err);
    return res.status(500).json({ error: 'Failed to compute queue.' });
  }
}

module.exports = { recalculateAndBroadcastQueue, getQueue, computePriorityScore };
