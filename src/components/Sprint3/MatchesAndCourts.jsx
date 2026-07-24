import React, { useState, useEffect } from 'react';
import { Clock, Trophy, AlertTriangle, Disc } from 'lucide-react';
import { calculateGroupStandings, generateRoundRobinMatches } from '../../utils/tournamentEngine';

export default function MatchesAndCourts({ state, onUpdateState, onProceedToPlayoffs, onGoToDraw, isAdmin, isReadOnly }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [isWO, setIsWO] = useState(false);
  const [scoreError, setScoreError] = useState(null);

  // EFECTO PARA GENERAR PARTIDOS SI AÚN NO EXISTEN
  useEffect(() => {
    if (!state.partidos || state.partidos.length === 0) {
      let allMatches = [];

      // Femenino
      Object.keys(state.grupos.F || {}).forEach(gLabel => {
        const g = state.grupos.F[gLabel];
        if (g && g.miembros && g.miembros.length > 0) {
          const mList = generateRoundRobinMatches(g.miembros, 'F', gLabel);
          allMatches = [...allMatches, ...mList];
        }
      });

      // Masculino
      Object.keys(state.grupos.M || {}).forEach(gLabel => {
        const g = state.grupos.M[gLabel];
        if (g && g.miembros && g.miembros.length > 0) {
          const mList = generateRoundRobinMatches(g.miembros, 'M', gLabel);
          allMatches = [...allMatches, ...mList];
        }
      });

      if (allMatches.length > 0) {
        // Asignar los primeros 9 partidos a las 9 Canchas
        for (let c = 1; c <= 9; c++) {
          if (allMatches[c - 1]) {
            allMatches[c - 1].status = 'in_progress';
            allMatches[c - 1].cancha_asignada = c;
            allMatches[c - 1].startedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }

        if (!isReadOnly) {
          onUpdateState({
            ...state,
            partidos: allMatches
          });
        }
      }
    }
  }, [state.grupos]);

  const matches = state.partidos || [];

  // Obtener jugador por ID
  const getPlayer = (id) => {
    if (id === null || id === undefined) return { nombre: 'Jugador Desconocido', id_numero: 0 };
    return (state.jugadores || []).find(p => p.id_numero === id) || { nombre: `Jugador ${id}`, id_numero: id };
  };

  // Si no hay partidos generados porque no se hizo el sorteo
  if (matches.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Disc className="w-8 h-8 animate-spin-slow" />
        </div>
        <h3 className="text-xl font-black text-white">El Sorteo Aún No Ha Finalizado</h3>
        <p className="text-xs text-slate-400">
          Para habilitar el fixture y las 9 canchas de arena, la Mesa de Control primero debe finalizar el sorteo.
        </p>
        <button
          onClick={onGoToDraw}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 inline-flex items-center space-x-2"
        >
          <span>Ir al Sorteo en Vivo</span>
        </button>
      </div>
    );
  }

  // Canchas activas (1 a 9)
  const courts = Array.from({ length: 9 }, (_, idx) => {
    const courtNum = idx + 1;
    const activeMatch = matches.find(m => m.cancha_asignada === courtNum && m.status === 'in_progress');
    return {
      number: courtNum,
      match: activeMatch
    };
  });

  const completedMatches = matches.filter(m => m.status === 'completed');

  // Abrir modal de carga de resultados
  const handleOpenScoreModal = (match) => {
    if (isReadOnly) return;
    setSelectedMatch(match);
    setScoreA('');
    setScoreB('');
    setIsWO(false);
    setScoreError(null);
  };

  // Carga de W.O. rápido (12 - 0)
  const handleSetWO = () => {
    setIsWO(true);
    setScoreA(12);
    setScoreB(0);
  };

  // Guardar resultado (Mesa de Control)
  const handleSaveScore = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setScoreError(null);

    const sA = parseInt(scoreA, 10);
    const sB = parseInt(scoreB, 10);

    if (isNaN(sA) || isNaN(sB)) {
      setScoreError('Ambos puntajes deben ser números válidos.');
      return;
    }

    if (sA < 0 || sB < 0) {
      setScoreError('Los puntajes no pueden ser negativos.');
      return;
    }

    if (sA === sB) {
      setScoreError('No se permiten empates según el reglamento AIT (Art. 3.1). Un jugador debe llegar a 12 puntos.');
      return;
    }

    if (sA !== 12 && sB !== 12) {
      setScoreError('El ganador del partido debe alcanzar exactamente los 12 puntos de victoria.');
      return;
    }

    const courtToFree = selectedMatch.cancha_asignada;

    const updatedMatches = matches.map(m => {
      if (m.id === selectedMatch.id) {
        return {
          ...m,
          scoreA: sA,
          scoreB: sB,
          isWO,
          status: 'completed',
          cancha_asignada: null,
          completedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return m;
    });

    // Despachar el siguiente partido disponible en la cola FIFO a la cancha liberada
    if (courtToFree) {
      const nextPendingIndex = updatedMatches.findIndex(m => m.status === 'pending');
      if (nextPendingIndex !== -1) {
        updatedMatches[nextPendingIndex] = {
          ...updatedMatches[nextPendingIndex],
          status: 'in_progress',
          cancha_asignada: courtToFree,
          startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
    }

    onUpdateState({
      ...state,
      partidos: updatedMatches
    });

    setSelectedMatch(null);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Fase 3 • Orquestador de Canchas (Sábado) {isReadOnly && '• Modo Consulta en Vivo'}
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            Gestión de Canchas FIFO y Carga de Marcadores
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cola global unificada de partidos. Los marcadores se actualizan en vivo al momento de ser confirmados.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Progreso de la Jornada</span>
            <span className="text-lg font-black text-amber-400 font-mono">
              {completedMatches.length} / {matches.length} Partidos
            </span>
          </div>

          {!isReadOnly && completedMatches.length === matches.length && (
            <button
              onClick={onProceedToPlayoffs}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
            >
              <span>Generar Playoffs (Domingo)</span>
              <Trophy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Orquestador de Canchas (Canchas 1 a 9) */}
      <div className="space-y-3">
        <h3 className="font-bold text-base text-white flex items-center space-x-2">
          <span>Canchas de Arena Activas (1 a 9)</span>
          <span className="text-xs font-normal text-slate-400">• Actualización en tiempo real</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map(({ number, match }) => {
            const playerA = match ? getPlayer(match.playerA) : null;
            const playerB = match ? getPlayer(match.playerB) : null;

            return (
              <div
                key={number}
                className={`p-4 rounded-2xl border transition-all ${
                  match
                    ? 'glass-panel border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Cancha {number}
                  </span>
                  {match ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      <Clock className="w-3 h-3 animate-spin" />
                      <span>{match.startedAt || 'En Juego'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500">Disponible</span>
                  )}
                </div>

                {match ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">#{playerA.id_numero} {playerA.nombre}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">VS</span>
                      <span className="font-bold text-white">#{playerB.id_numero} {playerB.nombre}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{match.group} ({match.category})</span>
                      {!isReadOnly ? (
                        <button
                          onClick={() => handleOpenScoreModal(match)}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md"
                        >
                          Cargar Marcador
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Jugándose ahora
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-600">
                    Esperando siguiente partido de la cola FIFO...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Carga de Resultado (Solo Mesa de Control) */}
      {!isReadOnly && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-white">Ingreso de Marcador (Mesa de Control)</h3>
              <span className="text-xs font-bold text-amber-400">Cancha {selectedMatch.cancha_asignada}</span>
            </div>

            <form onSubmit={handleSaveScore} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Jugador A</span>
                  <span className="text-xs font-bold text-white block mt-1">
                    #{getPlayer(selectedMatch.playerA).id_numero} {getPlayer(selectedMatch.playerA).nombre}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    placeholder="Puntos"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="w-full text-center text-2xl font-black font-mono py-2 mt-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Jugador B</span>
                  <span className="text-xs font-bold text-white block mt-1">
                    #{getPlayer(selectedMatch.playerB).id_numero} {getPlayer(selectedMatch.playerB).nombre}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    placeholder="Puntos"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="w-full text-center text-2xl font-black font-mono py-2 mt-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSetWO}
                  className="text-xs text-red-400 hover:text-red-300 underline font-semibold"
                >
                  Declarar W.O. (12 - 0 por inasistencia)
                </button>
              </div>

              {scoreError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{scoreError}</span>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20"
                >
                  Confirmar y Liberar Cancha
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Tablas de Posiciones de Grupos en Tiempo Real */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-lg text-white">Tablas de Posiciones de Grupos</h3>
        <p className="text-xs text-slate-400">
          Clasificación priorizada: (1) Partidos Ganados $\rightarrow$ (2) Diferencia de Puntos ($\text{Favor} - \text{Contra}$). Los 1.ºs y 2.ºs avanzan directo.
        </p>

        {['F', 'M'].map((cat) => {
          const catGroupsObj = state.grupos[cat] || {};
          const hasGroups = Object.keys(catGroupsObj).length > 0;

          if (!hasGroups) return null;

          return (
            <div key={cat} className="space-y-4 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                Rama {cat === 'F' ? 'Femenina' : 'Masculina'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(catGroupsObj).map((gLabel) => {
                  const gObj = catGroupsObj[gLabel];
                  const gPlayers = (gObj.miembros || []).map(id => getPlayer(id));
                  const gMatches = matches.filter(m => m.category === cat && m.group === gLabel);
                  const standings = calculateGroupStandings(gPlayers, gMatches, state.manualTieBreakers);

                  return (
                    <div key={gLabel} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                      <h5 className="font-bold text-xs text-slate-200 mb-2">{gLabel}</h5>

                      <table className="w-full text-left text-[11px]">
                        <thead className="text-[9px] uppercase text-slate-500 font-bold border-b border-slate-800">
                          <tr>
                            <th className="pb-1">Jugador</th>
                            <th className="pb-1 text-center">PJ</th>
                            <th className="pb-1 text-center">PG</th>
                            <th className="pb-1 text-center">PP</th>
                            <th className="pb-1 text-center">PF</th>
                            <th className="pb-1 text-center">PC</th>
                            <th className="pb-1 text-right">DIF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {standings.map((pos, idx) => (
                            <tr key={pos.id_numero} className={idx < 2 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                              <td className="py-1">
                                #{pos.id_numero} {pos.nombre} {idx < 2 && '⭐'}
                              </td>
                              <td className="text-center">{pos.matchesPlayed}</td>
                              <td className="text-center font-bold text-emerald-400">{pos.matchesWon}</td>
                              <td className="text-center text-slate-500">{pos.matchesLost}</td>
                              <td className="text-center">{pos.pointsFor}</td>
                              <td className="text-center">{pos.pointsAgainst}</td>
                              <td className="text-right font-mono font-bold">{pos.pointDiff > 0 ? `+${pos.pointDiff}` : pos.pointDiff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}
