import { ref, set, onValue, off, get } from 'firebase/database';
import { db, firebaseInitialized } from './firebaseConfig';

const TOURNAMENT_PATH = 'tournaments/salinas2026/state';
const CONNECTION_PATH = '.info/connected';
const NTFY_URL = 'https://ntfy.sh/tour_tejo_salinas_2026_live_sync';

/**
 * Publica el estado del torneo en la nube (Mesa de Control / Admin).
 * Transmite tanto a Firebase como al canal en vivo directo para celulares espectadores.
 * @param {Object} state - Estado completo del torneo.
 */
export async function publishStateToCloud(state) {
  const payload = {
    ...state,
    _lastUpdated: Date.now()
  };

  // 1. Guardar en Firebase SDK si está disponible
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      await set(tournamentRef, payload);
    } catch (error) {}
  }

  // 2. Transmitir inmediatamente al canal en vivo para celulares móviles de espectadores
  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Suscribe a los celulares espectadores a las actualizaciones en tiempo real.
 * Transmite de forma continua desde la nube a cualquier navegador móvil.
 * @param {Function} onStateUpdate - Callback invocado con el nuevo estado del torneo.
 * @param {Function} onStatusChange - Callback de estado de conexión (isConnected: boolean).
 * @returns {Function} Función para cancelar la suscripción (desuscripción limpia).
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange) {
  let eventSource = null;
  let pollInterval = null;

  // 1. Suscripción por Firebase SDK (si está activo)
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      const connRef = ref(db, CONNECTION_PATH);

      onValue(connRef, (snap) => {
        if (snap.val() === true && onStatusChange) onStatusChange(true);
      });

      onValue(tournamentRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.jugadores) {
          onStateUpdate(data);
          if (onStatusChange) onStatusChange(true);
        }
      });
    } catch (e) {}
  }

  // Helper para procesar sobres de mensajes de la nube
  const processEnvelope = (rawText) => {
    try {
      const envelope = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
      const payload = envelope.message ? (typeof envelope.message === 'string' ? JSON.parse(envelope.message) : envelope.message) : envelope;
      if (payload && payload.jugadores) {
        onStateUpdate(payload);
        if (onStatusChange) onStatusChange(true);
        return true;
      }
    } catch (e) {}
    return false;
  };

  // 2. Transmisión continua SSE (Server-Sent Events) en vivo para celulares
  try {
    eventSource = new EventSource(`${NTFY_URL}/json`);
    eventSource.onmessage = (event) => {
      processEnvelope(event.data);
    };
    eventSource.onerror = () => {};
  } catch (e) {}

  // 3. Sondeo activo de respaldo NDJSON cada 1.5 segundos
  const fetchCloudState = async () => {
    try {
      const res = await fetch(`${NTFY_URL}/json?poll=1`);
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const lines = text.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line) {
              const success = processEnvelope(line);
              if (success) break;
            }
          }
        }
      }
    } catch (e) {}
  };

  fetchCloudState();
  pollInterval = setInterval(fetchCloudState, 1500);

  return () => {
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) eventSource.close();
  };
}
