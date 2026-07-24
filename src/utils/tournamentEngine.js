/**
 * MOTOR LÓGICO Y MATEMÁTICO DEL TORNEO DE TEJO
 * Implementa las reglas estrictas de la Asociación Internacional de Tejo (AIT)
 * y el reglamento del Tour Challenger Tejo.
 */

/**
 * Calcula la estructura de grupos según el número de inscriptos N.
 * Objetivo: 5 jugadores por grupo.
 * Sobrantes: Se distribuyen creando grupos de 6 jugadores.
 * @param {number} totalPlayers 
 * @returns {{ totalGroups: number, groups5: number, groups6: number, error: string|null }}
 */
export function calculateGroupStructure(totalPlayers) {
  if (!totalPlayers || totalPlayers < 5) {
    return {
      totalGroups: 0,
      groups5: 0,
      groups6: 0,
      error: 'Se necesitan al menos 5 participantes para formar la estructura de grupos.'
    };
  }

  const baseGroups = Math.floor(totalPlayers / 5);
  const remainder = totalPlayers % 5;

  const groups6 = remainder;
  const groups5 = baseGroups - remainder;

  if (groups5 < 0) {
    return {
      totalGroups: 1,
      groups5: 0,
      groups6: 1,
      error: null
    };
  }

  return {
    totalGroups: baseGroups,
    groups5,
    groups6,
    error: null
  };
}

/**
 * Asigna los nombres de los grupos (A, B, C, ... Z, AA, AB...)
 * @param {number} totalGroups 
 * @returns {string[]}
 */
export function generateGroupLabels(totalGroups) {
  const labels = [];
  for (let i = 0; i < totalGroups; i++) {
    let label = '';
    let num = i;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    labels.push(`Grupo ${label}`);
  }
  return labels;
}

/**
 * Genera el Fixture Round Robin (Tablas de Berger) para un grupo de IDs de jugadores.
 * @param {number[]} playerIds Lista de IDs de jugadores en el grupo
 * @param {string} category 'M' | 'F'
 * @param {string} groupName Nombre del grupo (ej: 'Grupo A')
 * @returns {Array<{ id: string, category: string, group: string, playerA: number, playerB: number, scoreA: number|null, scoreB: number|null, status: string, isWO: boolean }>}
 */
export function generateRoundRobinMatches(playerIds, category, groupName) {
  const matches = [];
  const n = playerIds.length;
  const list = [...playerIds];

  // Si impar (ej: 5), agregamos un descansador dummy
  if (n % 2 !== 0) {
    list.push(null);
  }

  const numRounds = list.length - 1;
  const half = list.length / 2;

  let matchIndex = 1;

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const p1 = list[i];
      const p2 = list[list.length - 1 - i];

      if (p1 !== null && p2 !== null) {
        matches.push({
          id: `match_${category.toLowerCase()}_${groupName.replace(/\s+/g, '_')}_r${round + 1}_m${matchIndex++}`,
          category,
          group: groupName,
          round: round + 1,
          playerA: p1,
          playerB: p2,
          scoreA: null,
          scoreB: null,
          status: 'pending', // 'pending' | 'in_progress' | 'completed'
          isWO: false,
          court: null,
          startedAt: null,
          completedAt: null
        });
      }
    }

    // Rotación de Berger (mantener el primero fijo)
    list.splice(1, 0, list.pop());
  }

  return matches;
}

/**
 * Ordena las posiciones de un grupo con la jerarquía estricta:
 * 1. Partidos Ganados
 * 2. Diferencia de Puntos (Favor - Contra)
 * 3. Desempate Manual (si existe)
 * 
 * @param {Array<{ id_numero: number, nombre: string, es_arbitro: boolean }>} groupPlayers 
 * @param {Array<Object>} groupMatches Partidos finalizados del grupo
 * @param {Object} manualTieBreakers Mapa de desempates manuales { [key]: winnerId }
 * @returns {Array<Object>} Tabla ordenada de posiciones
 */
export function calculateGroupStandings(groupPlayers, groupMatches, manualTieBreakers = {}) {
  const statsMap = {};

  (groupPlayers || []).forEach(player => {
    if (!player || player.id_numero === undefined || player.id_numero === null) return;
    statsMap[player.id_numero] = {
      id_numero: player.id_numero,
      nombre: player.nombre || `Jugador ${player.id_numero}`,
      es_arbitro: player.es_arbitro || false,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      manualWinner: false
    };
  });

  groupMatches.forEach(match => {
    if (match.status === 'completed' && match.scoreA !== null && match.scoreB !== null) {
      const pA = statsMap[match.playerA];
      const pB = statsMap[match.playerB];

      if (pA && pB) {
        pA.matchesPlayed += 1;
        pB.matchesPlayed += 1;

        pA.pointsFor += match.scoreA;
        pA.pointsAgainst += match.scoreB;

        pB.pointsFor += match.scoreB;
        pB.pointsAgainst += match.scoreA;

        if (match.scoreA > match.scoreB) {
          pA.matchesWon += 1;
          pB.matchesLost += 1;
        } else if (match.scoreB > match.scoreA) {
          pB.matchesWon += 1;
          pA.matchesLost += 1;
        }
      }
    }
  });

  // Calcular diferencia de puntos
  Object.values(statsMap).forEach(stat => {
    stat.pointDiff = stat.pointsFor - stat.pointsAgainst;
  });

  // Convertir a lista y ordenar
  const standings = Object.values(statsMap);

  standings.sort((a, b) => {
    // 1. Partidos Ganados
    if (b.matchesWon !== a.matchesWon) {
      return b.matchesWon - a.matchesWon;
    }
    // 2. Diferencia de Puntos
    if (b.pointDiff !== a.pointDiff) {
      return b.pointDiff - a.pointDiff;
    }
    // 3. Puntos a favor totales
    if (b.pointsFor !== a.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
    // 4. Desempate manual si se especificó
    const tieKey = `tie_${Math.min(a.id_numero, b.id_numero)}_${Math.max(a.id_numero, b.id_numero)}`;
    if (manualTieBreakers[tieKey]) {
      return manualTieBreakers[tieKey] === a.id_numero ? -1 : 1;
    }
    return 0;
  });

  return standings;
}
