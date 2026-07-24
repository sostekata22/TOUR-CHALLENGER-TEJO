import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import { calculateGroupStandings } from '../../utils/tournamentEngine';
import confetti from 'canvas-confetti';

export default function PlayoffsBracket({ state, onUpdateState, isAdmin, isReadOnly }) {
  const [selectedPlayoffMatch, setSelectedPlayoffMatch] = useState(null);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Obtener jugador por ID
  const getPlayer = (id) => state.jugadores.find(p => p.id_numero === id) || { nombre: `Jugador ${id}`, id_numero: id };

  // Algoritmo de Consolidación para el Cuadro de 32 (16avos de Final)
  const generatePlayoffsTree = () => {
    if (state.playoffs && state.playoffs.length > 0) return state.playoffs;

    const directQualifiers = [];
    const thirdPlaces = [];

    const matches = state.partidos || [];

    // Extraer 1.º, 2.º y 3.º de cada grupo
    ['F', 'M'].forEach(cat => {
      Object.keys(state.grupos[cat] || {}).forEach(gLabel => {
        const gObj = state.grupos[cat][gLabel];
        const gPlayers = (gObj.miembros || []).map(id => getPlayer(id));
        const gMatches = matches.filter(m => m.category === cat && m.group === gLabel);
        const standings = calculateGroupStandings(gPlayers, gMatches, state.manualTieBreakers);

        if (standings.length > 0) directQualifiers.push(standings[0]); // 1.º
        if (standings.length > 1) directQualifiers.push(standings[1]); // 2.º
        if (standings.length > 2) thirdPlaces.push(standings[2]);      // 3.º
      });
    });

    // Ordenar terceros puestos globalmente por Diferencia de Puntos
    thirdPlaces.sort((a, b) => b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor);

    // Cantidad faltante para llegar a 32
    const neededWildcards = Math.max(0, 32 - directQualifiers.length);
    const wildcards = thirdPlaces.slice(0, neededWildcards);

    const totalQualifiers = [...directQualifiers, ...wildcards];

    while (totalQualifiers.length < 32 && totalQualifiers.length > 0) {
      totalQualifiers.push(null);
    }

    // Seeding: 1 vs 32, 2 vs 31, 3 vs 30...
    const r16avos = [];
    for (let i = 0; i < 16; i++) {
      const top = totalQualifiers[i];
      const bottom = totalQualifiers[31 - i];

      r16avos.push({
        id: `playoff_r32_m${i + 1}`,
        roundName: '16avos de Final',
        matchNum: i + 1,
        playerA: top ? top.id_numero : null,
        playerB: bottom ? bottom.id_numero : null,
        scoreA: null,
        scoreB: null,
        winner: null,
        status: 'pending'
      });
    }

    if (!isReadOnly) {
      onUpdateState({
        ...state,
        playoffs: r16avos
      });
    }

    return r16avos;
  };

  const playoffMatches = state.playoffs || generatePlayoffsTree();

  // Guardar resultado de playoff y avanzar ganador
  const handleSavePlayoffScore = (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    setErrorMsg(null);

    const sA = parseInt(scoreA, 10);
    const sB = parseInt(scoreB, 10);

    if (isNaN(sA) || isNaN(sB)) {
      setErrorMsg('Ingresa números válidos.');
      return;
    }

    if (sA === sB) {
      setErrorMsg('No puede haber empates en eliminación directa.');
      return;
    }

    if (sA !== 12 && sB !== 12) {
      setErrorMsg('El ganador debe llegar a 12 puntos.');
      return;
    }

    const winnerId = sA > sB ? selectedPlayoffMatch.playerA : selectedPlayoffMatch.playerB;

    const updated = playoffMatches.map(m => {
      if (m.id === selectedPlayoffMatch.id) {
        return {
          ...m,
          scoreA: sA,
          scoreB: sB,
          winner: winnerId,
          status: 'completed'
        };
      }
      return m;
    });

    if (selectedPlayoffMatch.roundName === 'Gran Final') {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });
    }

    onUpdateState({
      ...state,
      playoffs: updated
    });

    setSelectedPlayoffMatch(null);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Fase 4 • Playoffs & Eliminación Directa (Domingo 09:00 HS) {isReadOnly && '• En Vivo'}
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            Árbol de Eliminación Directa (32 Clasificados)
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cruces ordenados por Seeding. A 12 puntos sin empate.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Árbol de Cruces */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-lg text-white">Llave de 16avos de Final (32 Jugadores)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {playoffMatches.map((m) => {
            const pA = m.playerA ? getPlayer(m.playerA) : null;
            const pB = m.playerB ? getPlayer(m.playerB) : null;
            const isCompleted = m.status === 'completed';

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-2 mb-3">
                  <span>Cruce #{m.matchNum}</span>
                  <span className="text-amber-400 font-mono">16avos</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className={`flex items-center justify-between p-2 rounded-xl border ${
                    m.winner === m.playerA
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <span>{pA ? `#${pA.id_numero} ${pA.nombre}` : 'BYE / Libre'}</span>
                    <span className="font-mono font-bold">{m.scoreA !== null ? m.scoreA : '-'}</span>
                  </div>

                  <div className={`flex items-center justify-between p-2 rounded-xl border ${
                    m.winner === m.playerB
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}>
                    <span>{pB ? `#${pB.id_numero} ${pB.nombre}` : 'BYE / Libre'}</span>
                    <span className="font-mono font-bold">{m.scoreB !== null ? m.scoreB : '-'}</span>
                  </div>
                </div>

                {!isReadOnly && !isCompleted && pA && pB && (
                  <button
                    onClick={() => {
                      setSelectedPlayoffMatch(m);
                      setScoreA('');
                      setScoreB('');
                      setErrorMsg(null);
                    }}
                    className="w-full mt-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                  >
                    Cargar Resultado
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Resultado para Playoff (Solo Mesa de Control) */}
      {!isReadOnly && selectedPlayoffMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 max-w-sm w-full shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-4 text-center">
              Marcador de Playoff - Cruce #{selectedPlayoffMatch.matchNum}
            </h3>

            <form onSubmit={handleSavePlayoffScore} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    #{getPlayer(selectedPlayoffMatch.playerA).id_numero} {getPlayer(selectedPlayoffMatch.playerA).nombre}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    #{getPlayer(selectedPlayoffMatch.playerB).id_numero} {getPlayer(selectedPlayoffMatch.playerB).nombre}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center font-bold"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 text-center font-semibold">{errorMsg}</p>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlayoffMatch(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
