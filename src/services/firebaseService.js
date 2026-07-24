import { ref, set, onValue, off } from 'firebase/database';
import { db, firebaseInitialized } from './firebaseConfig';

const TOURNAMENT_PATH = 'tournaments/salinas2026/state';
const CONNECTION_PATH = '.info/connected';

// ntfy.sh — canal principal de sincronización en tiempo real para celulares
const NTFY_TOPIC = 'tour_tejo_salinas_2026_live_sync_v3';
const NTFY_BASE  = 'https://ntfy.sh';
const NTFY_URL   = `${NTFY_BASE}/${NTFY_TOPIC}`;

// Tamaño máximo seguro de ntfy.sh (4096 bytes ~ 4KB)
const NTFY_MAX_BYTES = 3800;

/**
 * Extrae del estado completo solo los datos necesarios para sincronización.
 * Los jugadores (lista oficial) ya están hardcodeados en el cliente → no los enviamos.
 * Solo enviamos el ESTADO DEL SORTEO: quién fue sorteado, qué grupo, paso actual.
 */
function buildSyncPayload(state) {
  // Estado mínimo para reconstruir la vista en el celular
  const slimPlayers = (state.jugadores || []).map(p => ({
    id: p.id_numero,
    s: p.sorteado ? 1 : 0,           // sorteado
    g: p.grupo_asignado || null       // grupo_asignado
  }));

  const payload = {
    _v: 2,                             // versión del protocolo
    _t: Date.now(),                    // timestamp
    _updatedAt: state._updatedAt || Date.now(),
    jugadoresSyncSlim: slimPlayers,    // estado slim de jugadores
    estado_sorteo: state.estado_sorteo || {},
    grupos: state.grupos || { F: {}, M: {} },
    partidos: (state.partidos || []).map(m => ({
      id: m.id,
      category: m.category,
      group: m.group,
      playerA: m.playerA,
      playerB: m.playerB,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      status: m.status,
      cancha_asignada: m.cancha_asignada
    })),
    manualTieBreakers: state.manualTieBreakers || {}
  };

  return payload;
}

/**
 * Reconstruye el estado completo desde un payload slim recibido de la nube.
 * Fusiona el estado del sorteo con la lista oficial de jugadores.
 */
export function reconstructStateFromSyncPayload(payload, officialPlayers) {
  if (!payload || payload._v !== 2) return null;

  // Reconstruir jugadores usando la lista oficial como base + estado sincronizado
  const slimMap = {};
  (payload.jugadoresSyncSlim || []).forEach(p => {
    slimMap[p.id] = p;
  });

  const jugadores = officialPlayers.map(official => {
    const slim = slimMap[official.id_numero];
    if (slim) {
      return {
        ...official,
        sorteado: slim.s === 1,
        grupo_asignado: slim.g || null
      };
    }
    return { ...official };
  });

  return {
    jugadores,
    estado_sorteo: payload.estado_sorteo || {},
    grupos: payload.grupos || { F: {}, M: {} },
    partidos: payload.partidos || [],
    manualTieBreakers: payload.manualTieBreakers || {},
    _updatedAt: payload._updatedAt || payload._t || 0,
    _fromCloud: true
  };
}

/**
 * Publica el estado del torneo en la nube (Mesa de Control / Admin).
 * Envía payload comprimido a ntfy.sh + estado completo a Firebase si está disponible.
 */
export async function publishStateToCloud(state) {
  const slim = buildSyncPayload(state);
  const body = JSON.stringify(slim);

  // Verificar tamaño antes de enviar
  const byteSize = new Blob([body]).size;

  // 1. ntfy.sh — principal (payload slim garantiza < 4KB)
  try {
    const res = await fetch(NTFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Priority': '5',
        'Title': 'TourTejo_Sync'
      },
      body: byteSize <= NTFY_MAX_BYTES ? body : JSON.stringify({
        _v: 2,
        _t: Date.now(),
        _updatedAt: state._updatedAt || Date.now(),
        // Si aun es muy grande, mandar solo el estado del sorteo sin partidos
        jugadoresSyncSlim: slim.jugadoresSyncSlim,
        estado_sorteo: slim.estado_sorteo,
        grupos: slim.grupos,
        partidos: [],
        manualTieBreakers: {}
      })
    });
    if (res.ok) {
      // marcar online
    }
  } catch (err) {
    // silencioso — firebase como respaldo
  }

  // 2. Firebase Realtime Database (si está configurado con credenciales reales)
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      // A Firebase mandamos el estado completo (sin límite de tamaño)
      await set(tournamentRef, {
        ...state,
        _lastUpdated: Date.now()
      });
    } catch (error) {
      // silencioso
    }
  }
}

/**
 * Suscribe a actualizaciones en tiempo real de la nube.
 * Usa Firebase SDK como canal primario si está disponible,
 * con SSE + polling de ntfy.sh como respaldo universal para celulares.
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange, officialPlayers) {
  let eventSource = null;
  let pollInterval = null;
  let reconnectTimer = null;
  let lastProcessedTime = 0;

  // Procesar un payload recibido de ntfy.sh
  const processRaw = (rawText) => {
    try {
      const envelope = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;

      // Extraer el payload real — ntfy.sh envuelve el mensaje en un sobre
      let payload = null;
      if (envelope.message) {
        payload = typeof envelope.message === 'string'
          ? JSON.parse(envelope.message)
          : envelope.message;
      } else {
        payload = envelope;
      }

      // Ignorar si es un payload viejo
      const payloadTime = payload._updatedAt || payload._t || 0;
      if (payloadTime <= lastProcessedTime) return false;

      // Protocolo v2: payload slim — necesita reconstrucción
      if (payload._v === 2 && officialPlayers) {
        const fullState = reconstructStateFromSyncPayload(payload, officialPlayers);
        if (fullState) {
          lastProcessedTime = payloadTime;
          onStateUpdate(fullState);
          if (onStatusChange) onStatusChange(true);
          return true;
        }
      }

      // Protocolo legacy v1: payload completo con jugadores
      if (payload.jugadores && Array.isArray(payload.jugadores)) {
        lastProcessedTime = payloadTime;
        onStateUpdate(payload);
        if (onStatusChange) onStatusChange(true);
        return true;
      }

    } catch (e) {}
    return false;
  };

  // ─── Canal 1: Firebase Realtime Database (si hay credenciales reales) ─────────
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      const connRef = ref(db, CONNECTION_PATH);

      onValue(connRef, (snap) => {
        if (snap.val() === true && onStatusChange) onStatusChange(true);
      });

      onValue(tournamentRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const dataTime = data._updatedAt || data._lastUpdated || 0;
          if (dataTime > lastProcessedTime) {
            // Firebase manda el estado completo
            if (data.jugadores && data.jugadores.length > 0) {
              lastProcessedTime = dataTime;
              onStateUpdate(data);
              if (onStatusChange) onStatusChange(true);
            }
          }
        }
      });
    } catch (e) {}
  }

  // ─── Canal 2: SSE (Server-Sent Events) — conexión persistente en tiempo real ──
  const connectSSE = () => {
    try {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      eventSource = new EventSource(`${NTFY_URL}/json`);

      eventSource.onopen = () => {
        if (onStatusChange) onStatusChange(true);
      };

      eventSource.onmessage = (event) => {
        processRaw(event.data);
      };

      eventSource.onerror = () => {
        // Reconectar después de 3 segundos si se cae la conexión SSE
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectSSE, 3000);
      };
    } catch (e) {}
  };

  connectSSE();

  // ─── Canal 3: Polling de respaldo cada 2 segundos ─────────────────────────────
  // Obtiene el último mensaje publicado incluso si SSE falló
  const fetchLatest = async () => {
    try {
      // ntfy.sh permite obtener los últimos N mensajes via /json?poll=1&since=<time>
      const sinceParam = lastProcessedTime > 0
        ? `&since=${Math.floor(lastProcessedTime / 1000)}`
        : '';
      const res = await fetch(`${NTFY_URL}/json?poll=1${sinceParam}`, {
        signal: AbortSignal.timeout(3000) // timeout de 3s para no bloquear en móvil
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          // ntfy devuelve NDJSON (múltiples líneas JSON)
          const lines = text.trim().split('\n').filter(Boolean);
          // Procesar del más reciente al más antiguo, parar al primero exitoso
          for (let i = lines.length - 1; i >= 0; i--) {
            const ok = processRaw(lines[i].trim());
            if (ok) break;
          }
        }
      }
    } catch (e) {
      // timeout o red caída — silencioso
    }
  };

  // Hacer el primer fetch inmediatamente
  fetchLatest();

  // Luego cada 2 segundos como respaldo al SSE
  pollInterval = setInterval(fetchLatest, 2000);

  // ─── Función de limpieza ──────────────────────────────────────────────────────
  return () => {
    if (pollInterval) clearInterval(pollInterval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (eventSource) eventSource.close();

    // Desuscribir Firebase
    if (firebaseInitialized && db) {
      try {
        const tournamentRef = ref(db, TOURNAMENT_PATH);
        off(tournamentRef);
      } catch (e) {}
    }
  };
}
