/**
 * Client-side Go-Back-N ARQ Simulation Generator.
 * Provides immediate zero-latency simulation and offline/cold-start fallback
 * matching the backend algorithms/go_back_n.py 100%.
 */

export function simulateGoBackN({
  total_frames = 10,
  window_size = 4,
  timeout_duration = 3.0,
  frame_loss_prob = 0.1,
  ack_loss_prob = 0.05,
  corruption_prob = 0.05,
  random_seed = null,
} = {}) {
  // Simple seeded pseudo-random generator
  let seed = random_seed !== null ? random_seed : Math.floor(Math.random() * 100000);
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const totalFrames = Math.max(1, parseInt(total_frames) || 10);
  const windowSize = Math.max(1, parseInt(window_size) || 4);
  const timeoutDur = Math.max(0.5, parseFloat(timeout_duration) || 3.0);
  const frameLoss = Math.max(0, Math.min(1, parseFloat(frame_loss_prob) || 0));
  const ackLoss = Math.max(0, Math.min(1, parseFloat(ack_loss_prob) || 0));
  const corruptProb = Math.max(0, Math.min(1, parseFloat(corruption_prob) || 0));

  let base = 0;
  let next_seq_num = 0;
  let expected_seq = 0;
  const timers = {};
  let current_time = 0.0;
  const time_step = 0.5;

  let original_transmissions = 0;
  let retransmissions = 0;
  let lost_frames = 0;
  let corrupted_frames = 0;
  let lost_acks = 0;
  let successful_deliveries = 0;

  const events = [];
  const frame_status = {};
  for (let i = 0; i < totalFrames; i++) {
    frame_status[i] = {
      seq: i,
      status: 'pending',
      transmissions: 0,
      retransmissions: 0,
      delivered_at: null,
    };
  }

  const max_steps = 250;
  let step_count = 0;

  while (base < totalFrames && step_count < max_steps) {
    step_count++;
    current_time = Math.round((current_time + time_step) * 100) / 100;

    // Sender sends frames within window [base, base + window_size)
    while (next_seq_num < base + windowSize && next_seq_num < totalFrames) {
      const seq = next_seq_num;
      const is_retrans = frame_status[seq].transmissions > 0;
      frame_status[seq].transmissions += 1;

      let action_type = 'TRANSMISSION';
      let desc = '';

      if (is_retrans) {
        retransmissions++;
        frame_status[seq].retransmissions += 1;
        action_type = 'RETRANSMISSION';
        desc = `Sender retransmitted Frame ${seq} (Window: [${base}, ${Math.min(base + windowSize - 1, totalFrames - 1)}])`;
      } else {
        original_transmissions++;
        action_type = 'TRANSMISSION';
        desc = `Sender transmitted original Frame ${seq} (Window: [${base}, ${Math.min(base + windowSize - 1, totalFrames - 1)}])`;
      }

      if (!(base in timers)) {
        timers[base] = current_time + timeoutDur;
      }

      const lost = rng() < frameLoss;
      const corrupted = !lost && rng() < corruptProb;
      let outcome = '';

      if (lost) {
        lost_frames++;
        outcome = 'LOST_IN_TRANSIT';
        frame_status[seq].status = 'lost';
      } else if (corrupted) {
        corrupted_frames++;
        outcome = 'CORRUPTED_CRC_ERROR';
        frame_status[seq].status = 'corrupted';
      } else {
        if (seq === expected_seq) {
          outcome = 'RECEIVED_OK';
          successful_deliveries++;
          frame_status[seq].status = 'delivered';
          frame_status[seq].delivered_at = current_time;
          expected_seq++;

          const ack_lost = rng() < ackLoss;
          if (ack_lost) {
            lost_acks++;
            outcome += '_ACK_LOST';
          } else {
            outcome += '_ACK_SENT';
            base = seq + 1;
            if (base in timers) {
              delete timers[base - 1];
            }
            if (base < next_seq_num) {
              timers[base] = current_time + timeoutDur;
            } else {
              Object.keys(timers).forEach((k) => delete timers[k]);
            }
          }
        } else {
          outcome = 'DISCARDED_OUT_OF_ORDER';
        }
      }

      events.push({
        time: current_time,
        step: step_count,
        type: action_type,
        frame_seq: seq,
        outcome: outcome,
        sender_window: [base, Math.min(base + windowSize - 1, totalFrames - 1)],
        base: base,
        next_seq_num: next_seq_num + 1,
        expected_seq: expected_seq,
        description: desc,
      });

      next_seq_num++;
    }

    // Check for timer expiration at base
    if (base in timers && current_time >= timers[base]) {
      events.push({
        time: current_time,
        step: step_count,
        type: 'TIMEOUT',
        frame_seq: base,
        outcome: 'TIMEOUT_EXPIRED',
        sender_window: [base, Math.min(base + windowSize - 1, totalFrames - 1)],
        base: base,
        next_seq_num: base,
        expected_seq: expected_seq,
        description: `Timer expired for Frame ${base}. Retransmitting all unacknowledged frames in window.`,
      });
      timers[base] = current_time + timeoutDur;
      next_seq_num = base;
    }
  }

  const total_attempts = original_transmissions + retransmissions;
  const pdr = totalFrames > 0 ? (successful_deliveries / totalFrames) * 100 : 0.0;

  return {
    config: {
      total_frames: totalFrames,
      window_size: windowSize,
      timeout_duration: timeoutDur,
      frame_loss_prob: frameLoss,
      ack_loss_prob: ackLoss,
      corruption_prob: corruptProb,
      random_seed: seed,
    },
    stats: {
      total_frames: totalFrames,
      original_transmissions: original_transmissions,
      retransmissions: retransmissions,
      total_transmission_attempts: total_attempts,
      lost_frames: lost_frames,
      corrupted_frames: corrupted_frames,
      lost_acks: lost_acks,
      successful_deliveries: successful_deliveries,
      packet_delivery_ratio: Math.round(pdr * 100) / 100,
      simulation_steps: step_count,
      total_time: Math.round(current_time * 100) / 100,
    },
    frame_status: frame_status,
    events: events,
  };
}
