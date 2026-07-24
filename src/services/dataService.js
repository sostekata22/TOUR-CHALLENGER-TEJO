import { calculateGroupStructure, generateGroupLabels, generateRoundRobinMatches } from '../utils/tournamentEngine';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'tour_challenger_tejo_db_v1';

// Lista Real del CSV: Lista de Jugadores F y M Salinas 2026 - Hoja 2.csv
export const realSalinasPlayers = [
  { id_numero: 52, nombre: 'HECTOR GONZALEZ', genero: 'M', es_arbitro: true },
  { id_numero: 53, nombre: 'RICHARD RAMIREZ', genero: 'M', es_arbitro: false },
  { id_numero: 54, nombre: 'DANIEL RABOSTO', genero: 'M', es_arbitro: false },
  { id_numero: 55, nombre: 'ARIEL GONZALEZ', genero: 'M', es_arbitro: true },
  { id_numero: 57, nombre: 'WALTER FAJARDO', genero: 'M', es_arbitro: false },
  { id_numero: 59, nombre: 'MIGUEL CASTILLO', genero: 'M', es_arbitro: true },
  { id_numero: 64, nombre: 'FABIAN PEREIRA', genero: 'M', es_arbitro: true },
  { id_numero: 66, nombre: 'MIGUEL CORTALEZZI', genero: 'M', es_arbitro: true },
  { id_numero: 67, nombre: 'WILMAR COSTA', genero: 'M', es_arbitro: true },
  { id_numero: 70, nombre: 'LEONEL SAAVEDRA', genero: 'M', es_arbitro: false },
  { id_numero: 72, nombre: 'LUIS RODRIGUEZ', genero: 'M', es_arbitro: false },
  { id_numero: 77, nombre: 'JESUS PEREZ', genero: 'M', es_arbitro: false },
  { id_numero: 79, nombre: 'ANGEL GALLO', genero: 'M', es_arbitro: false },
  { id_numero: 80, nombre: 'ESTEBAN SELLANES', genero: 'M', es_arbitro: false },
  { id_numero: 81, nombre: 'CARLOS MENDEZ', genero: 'M', es_arbitro: true },
  { id_numero: 83, nombre: 'DANIEL AMADO', genero: 'M', es_arbitro: true },
  { id_numero: 84, nombre: 'MIGUEL RIENZO', genero: 'M', es_arbitro: true },
  { id_numero: 86, nombre: 'RICHAL MILAN', genero: 'M', es_arbitro: false },
  { id_numero: 90, nombre: 'ROQUE BERON', genero: 'M', es_arbitro: false },
  { id_numero: 91, nombre: 'CARLOS ARISTIMUÑO', genero: 'M', es_arbitro: true },
  { id_numero: 92, nombre: 'JUAN ARISTIMUÑO', genero: 'M', es_arbitro: false },
  { id_numero: 93, nombre: 'EMILIANO ARISTIMUÑO', genero: 'M', es_arbitro: false },
  { id_numero: 94, nombre: 'SEBASTIAN ARISTIMUÑO', genero: 'M', es_arbitro: false },
  { id_numero: 95, nombre: 'JUAN JOSE SAYA', genero: 'M', es_arbitro: false },
  { id_numero: 96, nombre: 'LUIS BRAVO', genero: 'M', es_arbitro: true },
  { id_numero: 97, nombre: 'JUAN VIEIRA', genero: 'M', es_arbitro: false },
  { id_numero: 101, nombre: 'CARLOS FALLA', genero: 'M', es_arbitro: true },
  { id_numero: 102, nombre: 'CHRISTIAN CABRERA', genero: 'M', es_arbitro: false },
  { id_numero: 106, nombre: 'CESAR ARANDIGA', genero: 'M', es_arbitro: false },
  { id_numero: 107, nombre: 'ADEMIR', genero: 'M', es_arbitro: false },
  { id_numero: 109, nombre: 'MAURO CASTILLO', genero: 'M', es_arbitro: false },
  { id_numero: 113, nombre: 'RICARDO SANCHEZ', genero: 'M', es_arbitro: true },
  { id_numero: 114, nombre: 'ITAN CUADRO', genero: 'M', es_arbitro: false },
  { id_numero: 116, nombre: 'JUAN GUTIERREZ', genero: 'M', es_arbitro: false },
  { id_numero: 122, nombre: 'ISRAEL ROMERO', genero: 'M', es_arbitro: false },
  { id_numero: 123, nombre: 'JUAN C. PINTOS', genero: 'M', es_arbitro: false },
  { id_numero: 125, nombre: 'NERY HOPPER', genero: 'M', es_arbitro: false },
  { id_numero: 127, nombre: 'CARLOS SOSA', genero: 'M', es_arbitro: false },
  { id_numero: 130, nombre: 'JESUS RUCUMPAJ', genero: 'M', es_arbitro: false },
  { id_numero: 134, nombre: 'MIGUEL LUZ', genero: 'M', es_arbitro: false },
  { id_numero: 135, nombre: 'JAVIER FACHOLA', genero: 'M', es_arbitro: false },
  { id_numero: 136, nombre: 'JORGE SZASZ', genero: 'M', es_arbitro: true },
  { id_numero: 137, nombre: 'PEDRO QUIROGA', genero: 'M', es_arbitro: false },
  { id_numero: 141, nombre: 'RICHARD VIANA', genero: 'M', es_arbitro: false },
  { id_numero: 144, nombre: 'FERNANDO PETRONE', genero: 'M', es_arbitro: true },
  { id_numero: 145, nombre: 'JULIO C. PEREZ', genero: 'M', es_arbitro: false },
  { id_numero: 147, nombre: 'EDUARDO CARLON', genero: 'M', es_arbitro: false },
  { id_numero: 149, nombre: 'CHARLES BERNY', genero: 'M', es_arbitro: false },
  { id_numero: 150, nombre: 'HENRY ROSSANO', genero: 'M', es_arbitro: false },
  { id_numero: 151, nombre: 'ANTONIO DA SILVA', genero: 'M', es_arbitro: false },
  { id_numero: 152, nombre: 'GABRIEL CALDERON', genero: 'M', es_arbitro: false },
  { id_numero: 153, nombre: 'LUCAS MIRANDA', genero: 'M', es_arbitro: false },
  { id_numero: 154, nombre: 'GILBERTO NIEVES', genero: 'M', es_arbitro: false },
  { id_numero: 155, nombre: 'CARLOS RODRIGUEZ', genero: 'M', es_arbitro: false }
].map(p => ({ ...p, sorteado: false, grupo_asignado: null }));

const defaultInitialState = {
  config: {
    nombre_torneo: 'Tour Challenger Tejo 2026',
    canchas_totales: 9,
    puntos_victoria: 12,
    estado_actual: 'registro_inscriptos',
  },
  estado_sorteo: {
    categoria_activa: 'M',
    modo: 'manual',
    velocidad_auto: 2.0,
    reproducing: false,
    paso_revelacion: 0,
    bolilla_actual: null,
    historial_sorteados: []
  },
  jugadores: realSalinasPlayers,
  grupos: {
    F: {},
    M: {}
  },
  partidos: [],
  manualTieBreakers: {}
};

// Cargar estado inicial
export function getInitialState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Si el estado guardado tiene los datos de demostración anteriores, forzar la carga del CSV real
      if (parsed.jugadores && parsed.jugadores.some(p => p.nombre === 'Ana María González' || p.nombre === 'Juan Carlos Pérez')) {
        saveState(defaultInitialState);
        return defaultInitialState;
      }
      return parsed;
    } catch (e) {
      console.error('Error cargando estado de localStorage:', e);
    }
  }
  saveState(defaultInitialState);
  return defaultInitialState;
}

// Guardar estado
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error guardando estado en localStorage:', e);
  }
}

// Limpiar todo y restablecer datos por defecto con la lista del CSV real
export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  saveState(defaultInitialState);
  return defaultInitialState;
}

/**
 * Exporta el estado completo del torneo a un archivo .JSON descargable (Resguardo Antidesastre)
 * @param {Object} state 
 */
export function exportBackupJSON(state) {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BACKUP_TOUR_TEJO_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    console.error('Error exportando backup JSON:', e);
  }
}

/**
 * Exporta los jugadores y partidos a una planilla Excel .XLSX (Resguardo para Imprimir/Excel)
 * @param {Object} state 
 */
export function exportBackupExcel(state) {
  try {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Jugadores
    const playersData = (state.jugadores || []).map(p => ({
      'ID/Número': p.id_numero,
      'Nombre y Apellido': p.nombre,
      'Género': p.genero === 'F' ? 'Femenino' : 'Masculino',
      'Árbitro': p.es_arbitro ? 'SÍ' : 'NO',
      'Sorteado': p.sorteado ? 'SÍ' : 'NO',
      'Grupo Asignado': p.grupo_asignado || 'Pendiente'
    }));
    const wsPlayers = XLSX.utils.json_to_sheet(playersData);
    XLSX.utils.book_append_sheet(wb, wsPlayers, "Jugadores");

    // Hoja 2: Partidos
    if (state.partidos && state.partidos.length > 0) {
      const matchesData = state.partidos.map(m => ({
        'ID Partido': m.id,
        'Categoría': m.category === 'F' ? 'Femenino' : 'Masculino',
        'Grupo': m.group,
        'Jugador A (ID)': m.playerA,
        'Jugador B (ID)': m.playerB,
        'Puntos A': m.scoreA ?? '-',
        'Puntos B': m.scoreB ?? '-',
        'Estado': m.status === 'finished' ? 'Finalizado' : m.status === 'playing' ? 'En Juego' : 'Pendiente',
        'Cancha': m.courtId ? `Cancha ${m.courtId}` : 'Sin asignar'
      }));
      const wsMatches = XLSX.utils.json_to_sheet(matchesData);
      XLSX.utils.book_append_sheet(wb, wsMatches, "Partidos");
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RESPALDO_TEJO_SALINAS_${timestamp}.xlsx`);
  } catch (e) {
    console.error('Error exportando backup Excel:', e);
  }
}

/**
 * Sanitiza y valida una lista de inscriptos
 * @param {Array<Object>} rawList 
 * @returns {{ validPlayers: Array<Object>, errors: Array<string> }}
 */
export function sanitizeAndValidatePlayers(rawList) {
  const validPlayers = [];
  const errors = [];
  const usedIds = new Set();

  rawList.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Normalizar ID
    const rawId = row.id_numero || row.id || row.numero || row.Numero || row.ID || row['N°'] || row['nro'];
    const idNum = parseInt(rawId, 10);
    
    // Normalizar Nombre
    const rawNombre = row.nombre || row.Nombre || row.nombre_apellido || row['Nombre y Apellido'] || row.Jugador;
    const nombre = rawNombre ? String(rawNombre).trim() : '';

    // Normalizar Género
    const rawGenero = row.genero || row.Genero || row.sexo || row.Sexo || row.categoria || row.Categoria;
    let genero = 'M';
    if (rawGenero) {
      const gStr = String(rawGenero).trim().toUpperCase();
      if (gStr.startsWith('F') || gStr.includes('FEM') || gStr.includes('MUJ')) {
        genero = 'F';
      }
    }

    // Normalizar Árbitro
    const rawArbitro = row.es_arbitro || row.esArbitro || row.arbitro || row.Arbitro || row['Es_Arbitro'] || row['Rol'];
    let es_arbitro = false;
    if (rawArbitro !== undefined && rawArbitro !== null) {
      const aStr = String(rawArbitro).trim().toLowerCase();
      if (aStr === 'true' || aStr === '1' || aStr === 'si' || aStr === 'sí' || aStr === 'arbitro' || aStr === 'árbitro') {
        es_arbitro = true;
      }
    }

    // Validaciones
    if (isNaN(idNum) || idNum <= 0) {
      errors.push(`Fila ${rowNum}: Número de ID inválido (${rawId || 'vacío'}).`);
      return;
    }

    if (usedIds.has(idNum)) {
      errors.push(`Fila ${rowNum}: ID ${idNum} duplicado.`);
      return;
    }

    if (!nombre) {
      errors.push(`Fila ${rowNum}: El nombre no puede estar vacío (ID ${idNum}).`);
      return;
    }

    usedIds.add(idNum);
    validPlayers.push({
      id_numero: idNum,
      nombre,
      genero,
      es_arbitro,
      sorteado: false,
      grupo_asignado: null
    });
  });

  return { validPlayers, errors };
}

/**
 * Parsea archivo CSV o Excel
 * @param {File} file 
 * @returns {Promise<{ validPlayers: Array<Object>, errors: Array<string> }>}
 */
export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = sanitizeAndValidatePlayers(results.data);
          resolve(processed);
        },
        error: (err) => reject(err)
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          const processed = sanitizeAndValidatePlayers(json);
          resolve(processed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error('Formato de archivo no soportado. Usa .csv, .xlsx o .xls'));
    }
  });
}

/**
 * Retorna la lista real del archivo CSV
 */
export function generateSampleData() {
  return realSalinasPlayers;
}
