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

  // 2. Transmitir inmediatamente al canal en vivo de alta velocidad para celulares
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
 * Usa transmisión continua SSE + polling de ultra velocidad para celulares móviles (3G/4G/5G).
 * @param {Function} onStateUpdate - Callback invocado con el nuevo estado del torneo.
 * @param {Function} onStatusChange - Callback de estado de conexión (isConnected: boolean).
 * @returns {Function} Función para cancelar la suscripción (desuscripción limpia).
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange) {
  let eventSource = null;
  let pollInterval = null;

  // 1. Suscripción por Firebase SDK (si está configurado)
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

  // 2. Transmisión continua SSE (Server-Sent Events) en vivo para celulares
  try {
    eventSource = new EventSource(`${NTFY_URL}/sse`);
    eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        if (raw && raw.message) {
          const stateData = JSON.parse(raw.message);
          if (stateData && stateData.jugadores) {
            onStateUpdate(stateData);
            if (onStatusChange) onStatusChange(true);
          }
        }
      } catch (e) {}
    };
    eventSource.onerror = () => {};
  } catch (e) {}

  // 3. Carga inicial e inspección de respaldo (cada 1.8 segundos)
  const fetchCloudState = async () => {
    try {
      const res = await fetch(`${NTFY_URL}/raw?poll=1`);
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const lines = text.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            const data = JSON.parse(lastLine);
            if (data && data.jugadores) {
              onStateUpdate(data);
              if (onStatusChange) onStatusChange(true);
            }
          }
        }
      }
    } catch (e) {}
  };

  fetchCloudState();
  pollInterval = setInterval(fetchCloudState, 1800);

  return () => {
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) eventSource.close();
  };
}
