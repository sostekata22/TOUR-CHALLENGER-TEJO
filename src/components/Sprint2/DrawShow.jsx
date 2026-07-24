import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, SkipForward, Volume2, Shield, Sparkles, CheckCircle2, ChevronRight, Disc, RotateCcw } from 'lucide-react';
import { calculateGroupStructure, generateGroupLabels } from '../../utils/tournamentEngine';
import TombolaScene from './TombolaScene';

export default function DrawShow({ state, onUpdateState, onProceedToMatches, isAdmin, isReadOnly }) {
  const activeCategory = state.estado_sorteo?.categoria_activa || 'M'; // 'M' o 'F'
  // Estado de revelación sincronizado globalmente a través de state.estado_sorteo para celulares de espectadores y admins
  const pasoRevelacion = state.estado_sorteo?.paso_revelacion ?? 0; // 0: IDLE, 1: BALL, 2: NAME, 3: ROLE
  const currentBall = state.estado_sorteo?.bolilla_actual ?? null;
  const refereeModal = state.estado_sorteo?.referee_modal ?? false;

  const [isAuto, setIsAuto] = useState(false);
  const [speed, setSpeed] = useState(2.5); // segundos
  const [isSpinningFast, setIsSpinningFast] = useState(false);

  // Filtrar participantes no sorteados por categoría activa
  const jugadoresArr = Array.isArray(state.jugadores) ? state.jugadores : Object.values(state.jugadores || {});
  const eligiblePlayers = jugadoresArr.filter(p => p.genero === activeCategory && !p.sorteado);
  const drawnPlayers = jugadoresArr.filter(p => p.genero === activeCategory && p.sorteado);

  // Estructura de grupos de la categoría activa
  const totalCatPlayers = jugadoresArr.filter(p => p.genero === activeCategory).length;
  const groupStructure = calculateGroupStructure(totalCatPlayers);
  const groupLabels = generateGroupLabels(groupStructure.totalGroups);

  // Grupos DERIVADOS desde los jugadores (fuente de verdad única: grupo_asignado)
  const currentCategoryGroups = {};
  groupLabels.forEach((label, idx) => {
    const maxCap = idx < groupStructure.groups6 ? 6 : 5;
    const members = jugadoresArr
      .filter(p => p.genero === activeCategory && p.grupo_asignado === label)
      .map(p => p.id_numero);
    currentCategoryGroups[label] = { maxCap, miembros: members };
  });

  // Determinar si la categoría activa completó el sorteo
  const isCatCompleted = eligiblePlayers.length === 0;

  // REINICIAR EL SORTEO POR COMPLETO
  const handleResetDraw = () => {
    if (isReadOnly) return;
    if (window.confirm('¿Estás seguro de reiniciar el sorteo? Se borrarán todos los grupos formados y bolillas extraídas para comenzar de cero.')) {
      const resetPlayers = state.jugadores.map(p => ({
        ...p,
        sorteado: false,
        grupo_asignado: null
      }));

      setIsAuto(false);

      onUpdateState({
        ...state,
        estado_sorteo: {
          ...state.estado_sorteo,
          paso_revelacion: 0,
          bolilla_actual: null,
          referee_modal: false
        },
        jugadores: resetPlayers,
        partidos: [],
        playoffs: []
      });
    }
  };

  // Reproducir acorde alegre para el Árbitro (Solo en Mesa de Control para evitar sonar en 50 celulares)
  const playJoyfulSound = () => {
    if (isReadOnly) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      const frequencies = [523.25, 659.25, 783.99, 1046.50];
      
      frequencies.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.65);
      });

    } catch (e) {
      console.error('Error reproduciendo sonido alegre:', e);
    }
  };

  // Disparar confeti alegre
  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // Avanzar un paso en la máquina de estados SINCRO GLOBAL
  const handleNextStep = () => {
    if (isReadOnly) return;

    if (pasoRevelacion === 0) {
      const snapshot = state.jugadores.filter(p => p.genero === activeCategory && !p.sorteado);
      if (snapshot.length === 0) return;

      setIsSpinningFast(true);

      setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * snapshot.length);
        const selected = snapshot[randomIndex];

        if (!selected || selected.id_numero == null) {
          setIsSpinningFast(false);
          return;
        }

        const ball = {
          id_numero: selected.id_numero,
          nombre: selected.nombre || 'Sin nombre',
          es_arbitro: selected.es_arbitro === true
        };

        setIsSpinningFast(false);
        onUpdateState({
          ...state,
          estado_sorteo: {
            ...state.estado_sorteo,
            paso_revelacion: 1,
            bolilla_actual: ball,
            referee_modal: false
          }
        });
      }, 400);

    } else if (pasoRevelacion === 1) {
      onUpdateState({
        ...state,
        estado_sorteo: {
          ...state.estado_sorteo,
          paso_revelacion: 2
        }
      });

    } else if (pasoRevelacion === 2) {
      const isRef = currentBall?.es_arbitro === true;
      if (isRef) {
        playJoyfulSound();
        triggerConfetti();
      }

      onUpdateState({
        ...state,
        estado_sorteo: {
          ...state.estado_sorteo,
          paso_revelacion: 3,
          referee_modal: isRef
        }
      });

    } else if (pasoRevelacion === 3) {
      const ballToAssign = currentBall;
      if (ballToAssign?.id_numero != null) {
        assignPlayerToGroup(ballToAssign.id_numero);
      } else {
        onUpdateState({
          ...state,
          estado_sorteo: {
            ...state.estado_sorteo,
            paso_revelacion: 0,
            bolilla_actual: null,
            referee_modal: false
          }
        });
      }
    }
  };

  // Asignar jugador a grupo — fuente de verdad: grupo_asignado en el jugador
  const assignPlayerToGroup = (playerId) => {
    if (isReadOnly) return;
    try {
      // Encontrar primer grupo con espacio disponible
      let targetGroup = null;
      for (const label of groupLabels) {
        const membersCount = jugadoresArr.filter(
          p => p.genero === activeCategory && p.grupo_asignado === label
        ).length;
        const idx = groupLabels.indexOf(label);
        const maxCap = idx < groupStructure.groups6 ? 6 : 5;
        if (membersCount < maxCap) {
          targetGroup = label;
          break;
        }
      }

      if (!targetGroup) {
        console.warn('No hay grupo con espacio para el jugador:', playerId);
        return;
      }

      // Solo actualizamos jugadores — los grupos se derivan automáticamente
      const updatedPlayers = jugadoresArr.map(p =>
        p.id_numero === playerId
          ? { ...p, sorteado: true, grupo_asignado: targetGroup }
          : p
      );

      // Actualizar los grupos estructurados en el estado global
      const updatedGrupos = { ...state.grupos };
      const catGroups = {};
      groupLabels.forEach((label, idx) => {
        const maxCap = idx < groupStructure.groups6 ? 6 : 5;
        const miembros = updatedPlayers
          .filter(p => p.genero === activeCategory && p.grupo_asignado === label)
          .map(p => p.id_numero);
        catGroups[label] = {
          nombre: `${label} - ${activeCategory === 'F' ? 'Femenino' : 'Masculino'}`,
          maxCap,
          miembros
        };
      });
      updatedGrupos[activeCategory] = catGroups;

      // Confeti si el grupo se llena
      const newCount = updatedPlayers.filter(
        p => p.genero === activeCategory && p.grupo_asignado === targetGroup
      ).length;
      const groupIdx = groupLabels.indexOf(targetGroup);
      const maxCap = groupIdx < groupStructure.groups6 ? 6 : 5;
      if (newCount >= maxCap) triggerConfetti();

      onUpdateState({
        ...state,
        estado_sorteo: {
          ...state.estado_sorteo,
          paso_revelacion: 0,
          bolilla_actual: null,
          referee_modal: false
        },
        jugadores: updatedPlayers,
        grupos: updatedGrupos
      });
    } catch (err) {
      console.error('Error en assignPlayerToGroup:', err);
    }
  };



  // Auto-play interval
  useEffect(() => {
    let timer = null;
    if (!isReadOnly && isAuto && eligiblePlayers.length > 0 && !refereeModal) {
      timer = setInterval(() => {
        handleNextStep();
      }, speed * 1000);
    } else if (eligiblePlayers.length === 0 && isAuto) {
      setIsAuto(false);
    }
    return () => clearInterval(timer);
  }, [isAuto, pasoRevelacion, eligiblePlayers.length, speed, refereeModal, isReadOnly]);

  // Función para cerrar el modal de Árbitro sincronizado en Firebase
  const handleDismissRefereeModal = () => {
    if (isReadOnly) return;
    onUpdateState({
      ...state,
      estado_sorteo: {
        ...state.estado_sorteo,
        referee_modal: false
      }
    });
  };

  // Escuchar teclado (Espacio, Enter, Escape) para cerrar el cartel de Árbitro
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (refereeModal && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
        e.preventDefault();
        handleDismissRefereeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refereeModal, state]);

  // Cambio de rama (Femenino / Masculino)
  const handleSwitchCategory = (cat) => {
    if (isReadOnly) return;
    setActiveCategory(cat);
    setIsAuto(false);
    onUpdateState({
      ...state,
      estado_sorteo: {
        ...state.estado_sorteo,
        categoria_activa: cat,
        paso_revelacion: 0,
        bolilla_actual: null,
        referee_modal: false
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* OVERLAY DE ÁRBITRO CON TARJETA VERDE */}
      {refereeModal && (
        <div
          onClick={handleDismissRefereeModal}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 text-center cursor-pointer select-none animate-in fade-in zoom-in duration-200"
        >
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/90 border-4 border-emerald-500/80 p-8 sm:p-10 rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/30 flex flex-col items-center justify-center space-y-4">
            
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-4 border-emerald-400 shadow-xl shadow-emerald-500/40 transform hover:scale-105 transition-transform duration-300">
              <img
                src={activeCategory === 'F' ? '/referee_female_green_card.jpg' : '/referee_green_card.jpg'}
                alt="Árbitro con Tarjeta Verde"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">
                ¡Atención Mesa de Control!
              </span>
              <h2 className="text-4xl font-black text-white tracking-tight">
                ÁRBITRO
              </h2>
              <p className="text-xs text-slate-300 pt-1">
                {currentBall?.nombre} ha sido designado como árbitro del torneo.
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismissRefereeModal();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/30"
            >
              Entendido (Continuar Sorteo)
            </button>
          </div>
        </div>
      )}

      {/* Header del Sorteo & Selector de Categoría */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white">
            Sorteo en Vivo
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {!isReadOnly && (
            <button
              onClick={handleResetDraw}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 text-xs font-bold transition-all border border-red-800/60 shadow-lg shadow-red-950/40"
              title="Borrar el sorteo actual y comenzar desde cero"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Reiniciar Sorteo</span>
            </button>
          )}

          <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => handleSwitchCategory('F')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'F'
                  ? 'bg-pink-500 text-slate-950 shadow-lg shadow-pink-500/20 ring-2 ring-pink-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Rama F (Mujeres)</span>
              {state.jugadores.filter(p => p.genero === 'F' && !p.sorteado).length === 0 && (
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
              )}
            </button>

            <button
              onClick={() => handleSwitchCategory('M')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === 'M'
                  ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Rama M (Varones)</span>
              {state.jugadores.filter(p => p.genero === 'M' && !p.sorteado).length === 0 && (
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Escenario Principal del Bolillero 3D & Controles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel del Bolillero 3D y Revelación (8 cols) */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between min-h-[440px] relative overflow-hidden">

          {/* TÍTULO PRINCIPAL ARRIBA */}
          <div className="text-center pt-1 pb-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg uppercase">
              Tour Challenger Tejo Salinas
            </h2>
          </div>


          {/* ── ESTADO 0: Bolillero girando ── */}
          {pasoRevelacion === 0 && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
              <TombolaScene
                eligiblePlayers={eligiblePlayers}
                isSpinningFast={isSpinningFast}
                activeCategory={activeCategory}
              />
              <div className="flex flex-col items-center gap-1">
                <span className={`text-lg font-black tracking-widest uppercase ${
                  activeCategory === 'F' ? 'text-pink-400' : 'text-blue-400'
                }`}>
                  {activeCategory === 'F' ? 'FEMENINO' : 'MASCULINO'}
                </span>
                <span className="text-5xl font-black font-mono text-white leading-none">
                  {eligiblePlayers.length}
                </span>
              </div>
            </div>
          )}

          {/* ── ESTADO 1-3: Revelación de bolilla ── */}
          {pasoRevelacion >= 1 && currentBall && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">

              {/* Bolilla extraída */}
              <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 border-4 border-amber-200 flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/40 mx-auto ring-4 ring-amber-500/20">
                <span className="text-6xl font-black font-mono tracking-tighter">
                  {String(currentBall.id_numero ?? '?').padStart(2, '0')}
                </span>
              </div>

              {/* Nombre — paso 2+ */}
              {pasoRevelacion >= 2 && (
                <div className="animate-in slide-in-from-bottom duration-300">
                  <h3 className="text-3xl font-black text-white tracking-tight">
                    {currentBall.nombre ?? 'Sin nombre'}
                  </h3>
                </div>
              )}

              {/* Rol — paso 3 */}
              {pasoRevelacion >= 3 && (
                <div className="animate-in fade-in duration-300">
                  {currentBall.es_arbitro ? (
                    <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-lg">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>ÁRBITRO</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <span>Jugador Inscripto</span>
                    </span>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Fallback: transición entre pasos */}
          {pasoRevelacion >= 1 && !currentBall && (
            <div className="text-slate-500 text-sm">Procesando...</div>
          )}



          {/* Controles de Reproducción (Ocultos para Espectadores) */}
          {!isReadOnly ? (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  onClick={handleNextStep}
                  disabled={isCatCompleted && pasoRevelacion === 0}
                  className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl text-xs font-extrabold transition-all shadow-lg ${
                    isCatCompleted && pasoRevelacion === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/30'
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                  <span>
                    {pasoRevelacion === 0 ? 'Girar y Extraer Bolilla' :
                     pasoRevelacion === 1 ? 'Revelar Nombre' :
                     pasoRevelacion === 2 ? 'Evaluar Rol' : 'Siguiente Bolilla'}
                  </span>
                </button>

                <button
                  onClick={() => setIsAuto(!isAuto)}
                  disabled={isCatCompleted && pasoRevelacion === 0}
                  className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                    isAuto
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {isAuto ? <Pause className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
                  <span>{isAuto ? 'Pausar Auto' : 'Modo Auto'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>Velocidad:</span>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="font-mono font-bold text-slate-200">{speed}s</span>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400 italic">
              📺 Transmisión en tiempo real habilitada para espectadores desde celulares.
            </div>
          )}

        </div>

        {/* Panel de Grupos en Tiempo Real (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">Grupos en Formación</h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {drawnPlayers.length} / {totalCatPlayers}
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {groupLabels.map((label) => {
                const groupData = currentCategoryGroups[label] || { miembros: [], maxCap: 5 };
                const isFull = groupData.miembros.length >= groupData.maxCap;

                return (
                  <div
                    key={label}
                    className={`p-3 rounded-2xl border transition-all ${
                      isFull
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className={isFull ? 'text-amber-400' : 'text-slate-200'}>{label}</span>
                      <span className="text-[10px] text-slate-400">
                        {groupData.miembros.length} / {groupData.maxCap} casilleros
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: groupData.maxCap }).map((_, idx) => {
                        const playerId = groupData.miembros[idx];
                        const playerObj = playerId ? state.jugadores.find(p => p.id_numero === playerId) : null;

                        return (
                          <div
                            key={idx}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                              playerObj
                                ? playerObj.es_arbitro
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-slate-800 text-amber-300 border border-slate-700'
                                : 'bg-slate-900/50 text-slate-600 border border-dashed border-slate-800'
                            }`}
                          >
                            {playerObj ? `#${playerObj.id_numero}` : 'Vacio'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isReadOnly && state.jugadores.every(p => p.sorteado) && (
            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={onProceedToMatches}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <span>Generar Fixture y Abrir Canchas</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
