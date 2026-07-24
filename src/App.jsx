import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PlayerIngress from './components/Sprint1/PlayerIngress';
import DrawShow from './components/Sprint2/DrawShow';
import MatchesAndCourts from './components/Sprint3/MatchesAndCourts';
import PlayoffsBracket from './components/Sprint4/PlayoffsBracket';
import { getInitialState, saveState, resetState, generateSampleData } from './services/dataService';
import { subscribeToCloudState, publishStateToCloud } from './services/firebaseService';

export default function App() {
  const [state, setState] = useState(() => getInitialState());
  const [activeTab, setActiveTab] = useState('sorteo'); // Default para espectadores es 'sorteo'
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('tour_tejo_is_admin') === 'true';
  });
  const [isOnline, setIsOnline] = useState(false);
  // Flag para ignorar el eco de Firebase cuando nosotros mismos publicamos
  const isPublishing = React.useRef(false);

  // Guardar rol admin en sessionStorage
  const handleToggleAdmin = (adminState) => {
    setIsAdmin(adminState);
    sessionStorage.setItem('tour_tejo_is_admin', adminState ? 'true' : 'false');
    if (!adminState && activeTab === 'ingesta') {
      setActiveTab('sorteo');
    }
  };

  // Cargar datos iniciales de la muestra si está vacío o desactualizado (< 86 jugadores)
  useEffect(() => {
    if (!state.jugadores || state.jugadores.length < 86) {
      const sample = generateSampleData();
      const updated = {
        ...state,
        jugadores: sample,
        _updatedAt: Date.now()
      };
      setState(updated);
      saveState(updated);
      publishStateToCloud(updated);
    }
  }, []);

  const stateRef = React.useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Canal de sincronización en tiempo real entre pestañas/ventanas navegadoras
  useEffect(() => {
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('tour_tejo_sync_channel');
      bc.onmessage = (event) => {
        if (event.data && event.data.jugadores && !isPublishing.current) {
          const incomingTime = event.data._updatedAt || 0;
          const localTime = stateRef.current._updatedAt || 0;
          if (incomingTime >= localTime) {
            setState(event.data);
            saveState(event.data);
          }
        }
      };
    }

    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('tour_challenger_tejo_db_') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.jugadores && !isPublishing.current) {
            setState(parsed);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Suscribirse a los cambios en vivo en la nube (Firebase) para TODOS (Admins y Espectadores)
  useEffect(() => {
    const unsubscribe = subscribeToCloudState(
      (cloudState) => {
        if (cloudState && cloudState.jugadores) {
          const cloudTime = cloudState._updatedAt || cloudState._lastUpdated || 0;
          const localTime = stateRef.current._updatedAt || 0;

          if (!isPublishing.current || cloudTime > localTime) {
            setState(cloudState);
            saveState(cloudState);
          }
        }
      },
      (onlineStatus) => {
        setIsOnline(onlineStatus);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Redirigir a sorteo si se pierde el rol admin estando en la pestaña de ingesta
  useEffect(() => {
    if (!isAdmin && activeTab === 'ingesta') {
      setActiveTab('sorteo');
    }
  }, [isAdmin, activeTab]);

  const handleUpdateState = (newState) => {
    const timestampedState = {
      ...newState,
      _updatedAt: Date.now()
    };
    setState(timestampedState);
    saveState(timestampedState);

    // Emitir a otras pestañas/ventanas abiertas en la misma laptop
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('tour_tejo_sync_channel');
        bc.postMessage(timestampedState);
        bc.close();
      }
    } catch (e) {}

    if (isAdmin) {
      isPublishing.current = true;
      publishStateToCloud(timestampedState).finally(() => {
        setTimeout(() => {
          isPublishing.current = false;
        }, 300);
      });
    }
  };

  const handleUpdatePlayers = (players) => {
    handleUpdateState({
      ...state,
      jugadores: players
    });
  };

  const handleReset = () => {
    if (!isAdmin) return;
    if (window.confirm('¿Restablecer todos los datos del torneo? Se recargarán los participantes oficiales.')) {
      const reset = resetState();
      setState(reset);
      saveState(reset);
      publishStateToCloud(reset);
      setActiveTab('ingesta');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-white">
      
      {/* Navbar Superior */}
      <Navbar
        state={state}
        onReset={handleReset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
        isOnline={isOnline}
      />

      {/* Contenido Principal por Pestañas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'ingesta' && isAdmin && (
          <PlayerIngress
            players={state.jugadores || []}
            onUpdatePlayers={handleUpdatePlayers}
            onProceedToDraw={() => setActiveTab('sorteo')}
          />
        )}

        {activeTab === 'sorteo' && (
          <DrawShow
            state={state}
            onUpdateState={handleUpdateState}
            onProceedToMatches={() => setActiveTab('fixture')}
            isAdmin={isAdmin}
            isReadOnly={!isAdmin}
          />
        )}

        {activeTab === 'fixture' && (
          <MatchesAndCourts
            state={state}
            onUpdateState={handleUpdateState}
            onProceedToPlayoffs={() => setActiveTab('playoffs')}
            onGoToDraw={() => setActiveTab('sorteo')}
            isAdmin={isAdmin}
            isReadOnly={!isAdmin}
          />
        )}

        {activeTab === 'playoffs' && (
          <PlayoffsBracket
            state={state}
            onUpdateState={handleUpdateState}
            isAdmin={isAdmin}
            isReadOnly={!isAdmin}
          />
        )}
      </main>

      {/* Footer Oficial */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Tour Challenger Tejo 2026 • Transmisión en Tiempo Real • Avalado por AIT</p>
      </footer>

    </div>
  );
}
