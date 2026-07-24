import { ref, set, onValue, off } from 'firebase/database';
import { db, firebaseInitialized } from './firebaseConfig';

const TOURNAMENT_PATH = 'tournaments/salinas2026/state';
const CONNECTION_PATH = '.info/connected';

/**
 * Publica el estado del torneo en la nube (Mesa de Control / Admin).
 * @param {Object} state - Estado completo del torneo.
 */
export async function publishStateToCloud(state) {
  if (!firebaseInitialized || !db) return false;
  try {
    const tournamentRef = ref(db, TOURNAMENT_PATH);
    const payload = {
      ...state,
      _lastUpdated: Date.now()
    };
    await set(tournamentRef, payload);
    return true;
  } catch (error) {
    console.error('Error al publicar estado en la nube:', error);
    return false;
  }
}

/**
 * Suscribe a los celulares espectadores y dispositivos a las actualizaciones en tiempo real.
 * @param {Function} onStateUpdate - Callback invocado con el nuevo estado del torneo.
 * @param {Function} onStatusChange - Callback de estado de conexión (isConnected: boolean).
 * @returns {Function} Función para cancelar la suscripción (desuscripción limpia).
 */
export function subscribeToCloudState(onStateUpdate, onStatusChange) {
  if (!firebaseInitialized || !db) {
    if (onStatusChange) onStatusChange(false);
    return () => {};
  }

  const tournamentRef = ref(db, TOURNAMENT_PATH);
  const connRef = ref(db, CONNECTION_PATH);

  // Escuchar estado de conexión con Firebase
  const connListener = onValue(connRef, (snap) => {
    const connected = snap.val() === true;
    if (onStatusChange) onStatusChange(connected);
  }, (err) => {
    if (onStatusChange) onStatusChange(false);
  });

  // Escuchar cambios del torneo
  const tournamentListener = onValue(tournamentRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      onStateUpdate(data);
    }
  }, (error) => {
    console.warn('Error recibiendo datos en tiempo real:', error);
  });

  // Retornar función de limpieza
  return () => {
    off(tournamentRef, 'value', tournamentListener);
    off(connRef, 'value', connListener);
  };
}
