import { ref, set, onValue, off, serverTimestamp } from 'firebase/database';
import { db, firebaseInitialized } from './firebaseConfig';

const TOURNAMENT_PATH = 'tournaments/salinas2026/state';
const CONNECTION_PATH = '.info/connected';

// ntfy.sh como respaldo secundario (por si Firebase falla)
const NTFY_URL = 'https://ntfy.sh/tour_tejo_salinas_2026_live_sync_v3';

/**
 * Extrae del estado completo solo los datos necesarios para sincronización.
 * No envía la lista de jugadores (está hardcodeada en el cliente).
 * Solo envía: quién fue sorteado, su grupo, estado del sorteo, partidos.
 */
function buildSyncPayload(state) {
  const slimPlayers = (state.jugadores || []).map(p => ({
    id: p.id_numero,
    s: p.sorteado ? 1 : 0,
    g: p.grupo_asignado || null
  }));

  return {
    _v: 2,
    _updatedAt: state._updatedAt || Date.now(),
    jugadoresSyncSlim: slimPlayers,
    estado_sorteo: state.estado_sorteo || {},
    grupos: state.grupos || { F: {}, M: {} },
    partidos: (state.partidos || []).map(m => ({
      id: m.id,
      category: m.category,
      group: m.group,
      playerA: m.playerA,
      playerB: m.playerB,
      scoreA: m.scoreA ?? null,
      scoreB: m.scoreB ?? null,
      status: m.status,
      cancha_asignada: m.cancha_asignada ?? null
    })),
    manualTieBreakers: state.manualTieBreakers || {}
  };
}

/**
 * Reconstruye el estado completo desde un payload slim.
 * Fusiona el estado de sorteo con la lista oficial de jugadores.
 */
export function reconstructStateFromSyncPayload(payload, officialPlayers) {
  if (!payload || payload._v !== 2) return null;

  const slimMap = {};
  (payload.jugadoresSyncSlim || []).forEach(p => {
    slimMap[p.id] = p;
  });

  const jugadores = officialPlayers.map(official => {
    const slim = slimMap[official.id_numero];
    return slim
      ? { ...official, sorteado: slim.s === 1, grupo_asignado: slim.g || null }
      : { ...official };
  });

  return {
    jugadores,
    estado_sorteo: payload.estado_sorteo || {},
    grupos: payload.grupos || { F: {}, M: {} },
    partidos: payload.partidos || [],
    manualTieBreakers: payload.manualTieBreakers || {},
    _updatedAt: payload._updatedAt || 0,
    _fromCloud: true
  };
}

/**
 * Publica el estado del torneo en Firebase Realtime Database.
 * Canal principal: Firebase (tiempo real, sin límite de tamaño).
 * Canal respaldo: ntfy.sh (payload slim).
 */
export async function publishStateToCloud(state) {
  const slim = buildSyncPayload(state);

  // ── Canal 1: Firebase Realtime Database (PRINCIPAL) ──────────────────────────
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      await set(tournamentRef, slim);
      console.log('📡 Estado publicado en Firebase');
    } catch (error) {
      console.warn('Firebase write failed, usando ntfy.sh como respaldo', error);
      // Si Firebase falla, intentar ntfy.sh
      await publishToNtfy(slim);
    }
  } else {
    // Firebase no disponible — usar ntfy.sh directamente
    await publishToNtfy(slim);
  }
}

async function publishToNtfy(payload) {
  try {
    const body = JSON.stringify(payload);
    if (new Blob([body]).size > 3800) {
      // Si aún es muy grande, enviar solo el estado del sorteo sin partidos
      payload = { ...payload, partidos: [] };
    }
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    // silencioso
  }
}

/**
 * Suscribe a actualizaciones en tiempo real.
 * Canal principal: Firebase onValue (instantáneo, push real).
 * Canal respaldo: SSE + polling de ntfy.sh.
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange, officialPlayers) {
  let firebaseUnsub = null;
  let eventSource = null;
  let pollInterval = null;
  let reconnectTimer = null;
  let lastProcessedTime = 0;

  const applyPayload = (payload) => {
    if (!payload) return false;
    const payloadTime = payload._updatedAt || 0;
    if (payloadTime <= lastProcessedTime) return false;

    let fullState = null;

    if (payload._v === 2 && officialPlayers) {
      fullState = reconstructStateFromSyncPayload(payload, officialPlayers);
    } else if (payload.jugadores && Array.isArray(payload.jugadores)) {
      // Payload legacy completo
      fullState = payload;
    }

    if (fullState) {
      lastProcessedTime = payloadTime;
      onStateUpdate(fullState);
      if (onStatusChange) onStatusChange(true);
      return true;
    }
    return false;
  };

  // ── Canal 1: Firebase Realtime Database (PRINCIPAL — push instantáneo) ───────
  if (firebaseInitialized && db) {
    try {
      const connRef = ref(db, CONNECTION_PATH);
      onValue(connRef, (snap) => {
        if (onStatusChange) onStatusChange(snap.val() === true);
      });

      const tournamentRef = ref(db, TOURNAMENT_PATH);
      onValue(tournamentRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          applyPayload(data);
        }
      });

      console.log('👂 Suscripto a Firebase Realtime Database');
    } catch (e) {
      console.warn('Firebase subscribe failed:', e);
    }
  }

  // ── Canal 2: SSE de ntfy.sh (respaldo si Firebase no está disponible) ────────
  const connectSSE = () => {
    try {
      if (eventSource) { eventSource.close(); eventSource = null; }

      eventSource = new EventSource(`${NTFY_URL}/json`);
      eventSource.onopen = () => { if (onStatusChange) onStatusChange(true); };
      eventSource.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          const payload = envelope.message
            ? (typeof envelope.message === 'string' ? JSON.parse(envelope.message) : envelope.message)
            : envelope;
          applyPayload(payload);
        } catch (e) {}
      };
      eventSource.onerror = () => {
        if (eventSource) { eventSource.close(); eventSource = null; }
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, 5000);
      };
    } catch (e) {}
  };

  // Solo activar SSE/polling si Firebase no está disponible
  if (!firebaseInitialized || !db) {
    connectSSE();

    const fetchLatest = async () => {
      try {
        const sinceParam = lastProcessedTime > 0 ? `&since=${Math.floor(lastProcessedTime / 1000)}` : '';
        const res = await fetch(`${NTFY_URL}/json?poll=1${sinceParam}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) {
            const lines = text.trim().split('\n').filter(Boolean);
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const envelope = JSON.parse(lines[i]);
                const payload = envelope.message
                  ? (typeof envelope.message === 'string' ? JSON.parse(envelope.message) : envelope.message)
                  : envelope;
                if (applyPayload(payload)) break;
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    fetchLatest();
    pollInterval = setInterval(fetchLatest, 2000);
  }

  // ── Limpieza ──────────────────────────────────────────────────────────────────
  return () => {
    if (pollInterval) clearInterval(pollInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) eventSource.close();

    if (firebaseInitialized && db) {
      try {
        off(ref(db, TOURNAMENT_PATH));
        off(ref(db, CONNECTION_PATH));
      } catch (e) {}
    }
  };
}
