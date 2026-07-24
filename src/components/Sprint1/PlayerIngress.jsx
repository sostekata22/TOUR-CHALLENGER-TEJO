import React, { useState } from 'react';
import { Upload, Plus, Users, UserCheck, Shield, AlertCircle, FileSpreadsheet, Search, Trash2, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { parseImportFile, generateSampleData } from '../../services/dataService';
import { calculateGroupStructure } from '../../utils/tournamentEngine';

export default function PlayerIngress({ players, onUpdatePlayers, onProceedToDraw }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'F' | 'M'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [validationMessages, setValidationMessages] = useState([]);

  // Formulario manual
  const [newId, setNewId] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newGenero, setNewGenero] = useState('M');
  const [newArbitro, setNewArbitro] = useState(false);

  // Estadísticas
  const totalCount = players.length;
  const femalePlayers = players.filter(p => p.genero === 'F');
  const malePlayers = players.filter(p => p.genero === 'M');
  const refereeCount = players.filter(p => p.es_arbitro).length;

  const femaleStructure = calculateGroupStructure(femalePlayers.length);
  const maleStructure = calculateGroupStructure(malePlayers.length);

  // Manejador para cargar muestra predeterminada
  const handleLoadSample = () => {
    const sample = generateSampleData();
    onUpdatePlayers(sample);
    const fCount = sample.filter(p => p.genero === 'F').length;
    const mCount = sample.filter(p => p.genero === 'M').length;
    setValidationMessages([`Cargada lista oficial completa (${fCount} Mujeres y ${mCount} Varones - Total ${sample.length}).`]);
  };

  // Manejador para agregar jugador manual
  const handleAddManual = (e) => {
    e.preventDefault();
    setUploadError(null);

    const idNum = parseInt(newId, 10);
    if (isNaN(idNum) || idNum <= 0) {
      setUploadError('El número de ID debe ser un número entero positivo.');
      return;
    }

    if (players.some(p => p.id_numero === idNum)) {
      setUploadError(`El ID ${idNum} ya está registrado.`);
      return;
    }

    if (!newNombre.trim()) {
      setUploadError('El nombre no puede estar vacío.');
      return;
    }

    const newPlayer = {
      id_numero: idNum,
      nombre: newNombre.trim(),
      genero: newGenero,
      es_arbitro: newArbitro,
      sorteado: false,
      grupo_asignado: null
    };

    onUpdatePlayers([...players, newPlayer]);
    setNewId('');
    setNewNombre('');
    setNewArbitro(false);
  };

  // Manejador para eliminar jugador
  const handleDeletePlayer = (id) => {
    onUpdatePlayers(players.filter(p => p.id_numero !== id));
  };

  // Manejador para importar archivo Excel/CSV
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setValidationMessages([]);

    try {
      const { validPlayers, errors } = await parseImportFile(file);
      if (errors.length > 0) {
        setValidationMessages(errors);
      }

      if (validPlayers.length > 0) {
        // Reemplazar o combinar
        onUpdatePlayers(validPlayers);
      } else {
        setUploadError('No se encontraron registros válidos en el archivo.');
      }
    } catch (err) {
      setUploadError(err.message || 'Error al procesar el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filtrado de tabla
  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id_numero.toString().includes(searchTerm);
    const matchesCategory = categoryFilter === 'ALL' || p.genero === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Fase 1 • Ingesta de Datos
            </span>
            <span className="text-xs text-slate-400">Viernes por la Tarde</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            Registro y Validación de Participantes
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Carga la lista de inscriptos desde Excel/CSV o de forma manual. El sistema aislará las ramas Femenina y Masculina y calculará la estructura exacta de grupos.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleLoadSample}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cargar Jugadores</span>
          </button>

          <button
            onClick={onProceedToDraw}
            disabled={totalCount < 5}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              totalCount >= 5
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <span>Ir al Sorteo en Vivo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjetas Estadísticas y Estructura Matemática */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Inscriptos */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inscriptos</p>
            <p className="text-3xl font-black text-white mt-1">{totalCount}</p>
            <p className="text-xs text-slate-400 mt-1">Registrados en sistema</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 text-amber-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Rama Femenina */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Rama Femenina (F)</p>
            <p className="text-3xl font-black text-pink-400 mt-1">{femalePlayers.length}</p>
            <p className="text-xs text-slate-400 mt-1">
              {femaleStructure.totalGroups} Grupos ({femaleStructure.groups5} de 5, {femaleStructure.groups6} de 6)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-950/40 flex items-center justify-center border border-pink-800/50 text-pink-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Rama Masculina */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Rama Masculina (M)</p>
            <p className="text-3xl font-black text-blue-400 mt-1">{malePlayers.length}</p>
            <p className="text-xs text-slate-400 mt-1">
              {maleStructure.totalGroups} Grupos ({maleStructure.groups5} de 5, {maleStructure.groups6} de 6)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-950/40 flex items-center justify-center border border-blue-800/50 text-blue-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Árbitros Colaboradores */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Árbitros Colaboradores</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{refereeCount}</p>
            <p className="text-xs text-slate-400 mt-1">Activa Alerta Sirena</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/40 flex items-center justify-center border border-emerald-800/50 text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Sección Doble: Importación Excel/CSV + Carga Manual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Importador Excel/CSV (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-200 font-bold mb-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3>Importar Lista desde Excel (.xlsx) o CSV</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Sube el archivo de inscriptos. El sistema aceptará columnas de ID/Número, Nombre, Género (F/M) y Árbitro (Sí/No).
            </p>

            {/* Zona Drop/Click */}
            <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl cursor-pointer bg-slate-950/40 hover:bg-slate-900/60 transition-all group">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-slate-500 group-hover:text-amber-400 group-hover:scale-110 transition-all mb-2" />
              <span className="text-xs font-semibold text-slate-300">
                {isUploading ? 'Procesando archivo...' : 'Haz clic para seleccionar o arrastra tu archivo Excel / CSV'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Soporta .xlsx, .xls y .csv</span>
            </label>

            {/* Mensajes de error / aviso */}
            {uploadError && (
              <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {validationMessages.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-1 max-h-28 overflow-y-auto">
                {validationMessages.map((msg, idx) => (
                  <p key={idx} className="text-amber-300 flex items-center space-x-1">
                    <span>• {msg}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carga Manual de Jugador (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center space-x-2 text-slate-200 font-bold mb-4">
            <Plus className="w-5 h-5 text-amber-400" />
            <h3>Agregar Jugador Manualmente</h3>
          </div>

          <form onSubmit={handleAddManual} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">N° ID</label>
                <input
                  type="number"
                  placeholder="Ej: 42"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Género</label>
                <select
                  value={newGenero}
                  onChange={(e) => setNewGenero(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="M">Rama Masculina (M)</option>
                  <option value="F">Rama Femenina (F)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                placeholder="Ej: Juan Carlos Pérez"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="arbitroCheck"
                checked={newArbitro}
                onChange={(e) => setNewArbitro(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="arbitroCheck" className="text-xs text-slate-300 cursor-pointer select-none flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400 inline" />
                <span>Es Árbitro Colaborador (`es_arbitro`)</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              Registrar Jugador
            </button>
          </form>
        </div>

      </div>

      {/* Tabla Interactiva de Jugadores Inscriptos */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        
        {/* Barra Superior de la Tabla */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <h3 className="font-bold text-lg text-white">Lista de Inscriptos Confirmados</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {filteredPlayers.length} / {players.length}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ID o Nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 w-48 sm:w-64"
              />
            </div>

            {/* Filtros de Categoría */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setCategoryFilter('F')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === 'F' ? 'bg-pink-950 text-pink-300 border border-pink-800/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Femenino
              </button>
              <button
                onClick={() => setCategoryFilter('M')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === 'M' ? 'bg-blue-950 text-blue-300 border border-blue-800/50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Masculino
              </button>
            </div>
          </div>
        </div>

        {/* Cuerpo de la Tabla */}
        {filteredPlayers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold">No hay participantes registrados con los criterios seleccionados.</p>
            <p className="text-xs mt-1">Carga una lista mediante Excel/CSV o usa el formulario manual.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">N° ID</th>
                  <th className="py-3 px-4">Nombre y Apellido</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Rol Especial</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlayers.map((player) => (
                  <tr key={player.id_numero} className="hover:bg-slate-800/40 transition-colors">
                    
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      #{player.id_numero.toString().padStart(3, '0')}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {player.nombre}
                    </td>

                    <td className="py-3 px-4">
                      {player.genero === 'F' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950/60 text-pink-400 border border-pink-800/40">
                          Rama Femenina (F)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-800/40">
                          Rama Masculina (M)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {player.es_arbitro ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          <Shield className="w-3 h-3" />
                          <span>Árbitro Colaborador</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeletePlayer(player.id_numero)}
                        title="Eliminar participante"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
