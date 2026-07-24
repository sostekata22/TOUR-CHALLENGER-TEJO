import { ref, set, onValue, off, get } from 'firebase/database';
import { db, firebaseInitialized } from './firebaseConfig';

const TOURNAMENT_PATH = 'tournaments/salinas2026/state';
const CONNECTION_PATH = '.info/connected';
const REST_URL = 'https://tour-challenger-tejo-default-rtdb.firebaseio.com/tournaments/salinas2026/state.json';

/**
 * Publica el estado del torneo en la nube (Mesa de Control / Admin).
 * @param {Object} state - Estado completo del torneo.
 */
export async function publishStateToCloud(state) {
  const payload = {
    ...state,
    _lastUpdated: Date.now()
  };

  // Intentar guardar vía Firebase SDK
  if (firebaseInitialized && db) {
    try {
      const tournamentRef = ref(db, TOURNAMENT_PATH);
      await set(tournamentRef, payload);
    } catch (error) {
      console.warn('Firebase SDK write warning, intentando fallback REST...', error);
    }
  }

  // Guardar también por REST API de respaldo
  try {
    await fetch(REST_URL, {
      method: 'PUT',
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
 * Combina WebSocket SDK + Polling REST para garantiazar sincronización en celulares de 3G/4G/5G.
 * @param {Function} onStateUpdate - Callback invocado con el nuevo estado del torneo.
 * @param {Function} onStatusChange - Callback de estado de conexión (isConnected: boolean).
 * @returns {Function} Función para cancelar la suscripción (desuscripción limpia).
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange) {
  let isConnectedLocal = false;

  if (firebaseInitialized && db) {
    const tournamentRef = ref(db, TOURNAMENT_PATH);
    const connRef = ref(db, CONNECTION_PATH);

    onValue(connRef, (snap) => {
      const connected = snap.val() === true;
      isConnectedLocal = connected;
      if (onStatusChange) onStatusChange(connected);
    }, () => {
      if (onStatusChange) onStatusChange(false);
    });

    onValue(tournamentRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        onStateUpdate(data);
      }
    }, (error) => {
      console.warn('Error recibiendo datos WebSocket:', error);
    });
  }

  // Sondeo HTTP REST cada 2 segundos (garantiza recepción universal en celulares)
  const fetchCloudStateREST = async () => {
    try {
      const response = await fetch(REST_URL);
      if (response.ok) {
        const data = await response.json();
        if (data && data.jugadores) {
          onStateUpdate(data);
          if (onStatusChange && !isConnectedLocal) onStatusChange(true);
        }
      }
    } catch (e) {
      // Silencioso en caso de indisponibilidad temporal de red
    }
  };

  // Primera carga inmediata al abrir la web en el celular
  fetchCloudStateREST();

  // Bucle continuo cada 2.0 segundos
  const pollInterval = setInterval(fetchCloudStateREST, 2000);

  return () => {
    clearInterval(pollInterval);
  };
}
