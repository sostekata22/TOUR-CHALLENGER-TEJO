import React, { useState } from 'react';
import { Trophy, ShieldCheck, RefreshCw, LayoutDashboard, Disc, Calendar, Award, Lock, Unlock, Radio, Share2, Check, X, Download } from 'lucide-react';
import { exportBackupJSON, exportBackupExcel } from '../services/dataService';

export default function Navbar({ state, onReset, activeTab, setActiveTab, isAdmin, onToggleAdmin, isOnline }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isSirenAlert = state.estado_sorteo?.paso_revelacion === 3 && state.estado_sorteo?.bolilla_actual?.es_arbitro;

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === '1234') {
      onToggleAdmin(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <header className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        isSirenAlert 
          ? 'siren-active bg-red-950/90 border-red-500 shadow-lg shadow-red-900/30' 
          : 'glass-panel bg-slate-900/90 backdrop-blur-md border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/30 shrink-0">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                    TOUR CHALLENGER TEJO
                  </h1>
                  <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    2026
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="hidden sm:inline">Centro Militar Salinas</span>
                  
                  {/* Badge de Conexión en Tiempo Real */}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isOnline 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    <Radio className={`w-2.5 h-2.5 mr-1 ${isOnline ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
                    {isOnline ? 'EN VIVO' : 'LOCAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Escritorio) */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('ingesta')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'ingesta'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>1. Inscriptos</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('sorteo')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'sorteo'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Disc className="w-4 h-4" />
                <span>2. Sorteo en Vivo</span>
              </button>

              <button
                onClick={() => setActiveTab('fixture')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'fixture'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>3. Canchas (Sábado)</span>
              </button>

              <button
                onClick={() => setActiveTab('playoffs')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'playoffs'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>4. Playoffs (Domingo)</span>
              </button>
            </nav>

            {/* Acciones Rápidas & Roles */}
            <div className="flex items-center space-x-2">
              
              {/* Botón Compartir Enlace */}
              <button
                onClick={handleShare}
                title="Copiar enlace para compartir en el celular"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
              </button>

              {/* Conmutador Modo Admin / Espectador */}
              {isAdmin ? (
                <div className="flex items-center space-x-1">
                  <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-3 h-3 mr-1 text-amber-400" />
                    Mesa de Control
                  </span>
                  <button
                    onClick={() => onToggleAdmin(false)}
                    title="Cerrar sesión de Mesa de Control (Volver a Modo Espectador)"
                    className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>

                  {/* Descargar Resguardo Antidesastre (JSON/Excel) */}
                  <button
                    onClick={() => exportBackupJSON(state)}
                    title="Descargar copia de resguardo de emergencia (JSON)"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden lg:inline text-[10px] font-bold">Backup</span>
                  </button>

                  {/* Restablecer Torneo (Solo Admin) */}
                  <button
                    onClick={onReset}
                    title="Restablecer datos oficiales del torneo"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPinModal(true)}
                  title="Acceso Mesa de Control (Ingresar PIN)"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-all"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Modo Espectador</span>
                  <span className="sm:hidden">PIN</span>
                </button>
              )}

            </div>

          </div>

          {/* Menú de Navegación Móvil (Abajo del Header) */}
          <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 gap-1">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('ingesta')}
                className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-md text-center transition-all ${
                  activeTab === 'ingesta' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inscriptos
              </button>
            )}
            <button
              onClick={() => setActiveTab('sorteo')}
              className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-md text-center transition-all ${
                activeTab === 'sorteo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sorteo
            </button>
            <button
              onClick={() => setActiveTab('fixture')}
              className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-md text-center transition-all ${
                activeTab === 'fixture' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Canchas
            </button>
            <button
              onClick={() => setActiveTab('playoffs')}
              className={`flex-1 py-1.5 px-1 text-[11px] font-semibold rounded-md text-center transition-all ${
                activeTab === 'playoffs' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Playoffs
            </button>
          </div>

        </div>
      </header>

      {/* Modal de PIN para Mesa de Control */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm glass-panel bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-center text-white mb-1">
              Acceso Mesa de Control
            </h3>
            <p className="text-xs text-center text-slate-400 mb-6">
              Ingresa el PIN numérico de los organizadores para operar el torneo.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN de acceso"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xl font-bold tracking-widest text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal"
                  autoFocus
                />
                {pinError && (
                  <p className="text-xs text-red-400 text-center mt-2 font-medium">
                    PIN incorrecto. Intenta de nuevo.
                  </p>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-800 text-slate-400 text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-amber-500/20"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
