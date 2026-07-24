import React from 'react';

/**
 * TombolaScene v3
 * Layout: MASCOTA (izquierda) | BOLILLERO SVG ANIMADO (derecha)
 * - Solo el TAMBOR (jaula de varillas) gira con CSS
 * - Las BOLILLAS rebotan adentro del tambor
 * - La MANIVELA oscila
 * - Sin mix-blend-mode, layout flex claro y visible
 */
export default function TombolaScene({ eligiblePlayers = [], isSpinningFast = false }) {
  const drumDur  = isSpinningFast ? '0.5s'  : '2.2s';
  const crankDur = isSpinningFast ? '0.5s'  : '2.2s';
  const ballDur  = isSpinningFast ? '0.35s' : '1.1s';

  const balls = [
    { key: 0, cx: 94,  cy: 90,  r: 10, color: '#f59e0b', hi: '#fde68a', delay: '0s'    },
    { key: 1, cx: 118, cy: 75,  r:  9, color: '#3b82f6', hi: '#93c5fd', delay: '0.2s'  },
    { key: 2, cx: 78,  cy: 108, r: 10, color: '#ec4899', hi: '#f9a8d4', delay: '0.35s' },
    { key: 3, cx: 108, cy: 108, r:  9, color: '#10b981', hi: '#6ee7b7', delay: '0.15s' },
    { key: 4, cx: 94,  cy: 118, r:  8, color: '#f97316', hi: '#fdba74', delay: '0.28s' },
  ].slice(0, Math.min(5, eligiblePlayers.length || 5));

  const labels = eligiblePlayers.slice(0, 5).map(p => p.id_numero);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      padding: '8px 0',
    }}>

      {/* ═══════════════════════════════
          CSS ANIMATIONS
      ═══════════════════════════════ */}
      <style>{`
        @keyframes tc-drum {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes tc-crank {
          0%,100% { transform: rotate(-30deg); }
          50%     { transform: rotate(30deg); }
        }
        @keyframes tc-b0 {
          0%,100%{ transform:translate(0,0); }
          25%    { transform:translate(14px,-16px); }
          75%    { transform:translate(-12px,14px); }
        }
        @keyframes tc-b1 {
          0%,100%{ transform:translate(0,0); }
          30%    { transform:translate(-15px,-13px); }
          70%    { transform:translate(11px,17px); }
        }
        @keyframes tc-b2 {
          0%,100%{ transform:translate(0,0); }
          40%    { transform:translate(16px,11px); }
          80%    { transform:translate(-9px,-15px); }
        }
        @keyframes tc-b3 {
          0%,100%{ transform:translate(0,0); }
          20%    { transform:translate(-13px,15px); }
          60%    { transform:translate(13px,-11px); }
        }
        @keyframes tc-b4 {
          0%,100%{ transform:translate(0,0); }
          35%    { transform:translate(10px,-18px); }
          65%    { transform:translate(-15px,9px); }
        }
        @keyframes tc-mascot-bounce {
          0%,100%{ transform: translateY(0px) rotate(-2deg); }
          50%    { transform: translateY(-6px) rotate(2deg); }
        }
      `}</style>

      {/* ═══════════════════════════════
          MASCOTA (izquierda)
      ═══════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        width: '190px',
        height: '190px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '3px solid rgba(245,158,11,0.6)',
        boxShadow: '0 0 32px rgba(245,158,11,0.25), 0 0 0 6px rgba(245,158,11,0.08), 0 4px 20px rgba(0,0,0,0.6)',
        animation: 'tc-mascot-bounce 2.4s ease-in-out infinite',
        background: '#0f172a',
      }}>
        <img
          src="/mascota_logo.jpeg"
          alt="Mascota Tour Challenger Tejo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
          }}
        />
      </div>

      {/* ═══════════════════════════════
          BOLILLERO SVG (derecha)
      ═══════════════════════════════ */}
      <div style={{ flexShrink: 0 }}>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="tc-drum-fill" cx="38%" cy="32%" r="68%">
              <stop offset="0%"   stopColor="#1e3a5f"/>
              <stop offset="100%" stopColor="#0a0f1e"/>
            </radialGradient>
            <linearGradient id="tc-stand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#64748b"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
            <linearGradient id="tc-axle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#334155"/>
            </linearGradient>
            <radialGradient id="tc-knob" cx="30%" cy="28%" r="65%">
              <stop offset="0%"   stopColor="#fde68a"/>
              <stop offset="100%" stopColor="#d97706"/>
            </radialGradient>
            {/* Clip para que las bolillas no salgan del tambor */}
            <clipPath id="tc-drum-clip">
              <circle cx="94" cy="96" r="50"/>
            </clipPath>
          </defs>

          {/* ── SOPORTE ── */}
          {/* Pata izquierda */}
          <rect x="60" y="165" width="10" height="45" rx="5" fill="url(#tc-stand)"/>
          {/* Pata derecha */}
          <rect x="130" y="165" width="10" height="45" rx="5" fill="url(#tc-stand)"/>
          {/* Base horizontal */}
          <rect x="48" y="205" width="104" height="10" rx="5" fill="url(#tc-stand)"/>
          {/* Barra del eje */}
          <rect x="30" y="92" width="150" height="8" rx="4" fill="url(#tc-axle)"/>
          {/* Soporte vertical izquierdo */}
          <rect x="32" y="80" width="10" height="90" rx="5" fill="url(#tc-stand)"/>
          {/* Soporte vertical derecho */}
          <rect x="158" y="80" width="10" height="90" rx="5" fill="url(#tc-stand)"/>
          {/* Barra transversal superior */}
          <rect x="36" y="76" width="148" height="8" rx="4" fill="url(#tc-axle)"/>

          {/* ── TAMBOR — SOLO ESTA PARTE GIRA ── */}
          <g style={{
            transformOrigin: '94px 96px',
            animation: `tc-drum ${drumDur} linear infinite`,
          }}>
            {/* Aro exterior */}
            <circle cx="94" cy="96" r="52"
              fill="none" stroke="#3b82f6" strokeWidth="3.5"
              strokeDasharray="8 6" opacity="0.8"/>
            {/* Varillas (8 barras diametrales) */}
            {[0,22.5,45,67.5,90,112.5,135,157.5].map((deg, i) => {
              const rad = deg * Math.PI / 180;
              return (
                <line key={i}
                  x1={94 + 52 * Math.cos(rad)}
                  y1={96 + 52 * Math.sin(rad)}
                  x2={94 - 52 * Math.cos(rad)}
                  y2={96 - 52 * Math.sin(rad)}
                  stroke="rgba(59,130,246,0.3)" strokeWidth="1.8" strokeLinecap="round"
                />
              );
            })}
            {/* Aro interior decorativo */}
            <circle cx="94" cy="96" r="26"
              fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="2"/>
          </g>

          {/* ── RELLENO INTERIOR (no gira — da profundidad) ── */}
          <circle cx="94" cy="96" r="49" fill="url(#tc-drum-fill)"/>

          {/* Reflejo de luz superior (no gira) */}
          <ellipse cx="80" cy="74" rx="18" ry="11"
            fill="white" opacity="0.07"/>

          {/* Aro frontal visible (no gira — borde brillante) */}
          <circle cx="94" cy="96" r="51"
            fill="none" stroke="#60a5fa" strokeWidth="2.5" opacity="0.6"/>

          {/* ── BOLILLAS (animadas, dentro del tambor) ── */}
          <g clipPath="url(#tc-drum-clip)">
            {balls.map((b, i) => (
              <g key={b.key} style={{
                animation: `tc-b${i} ${ballDur} ${b.delay} ease-in-out infinite`,
              }}>
                {/* Sombra */}
                <circle cx={b.cx} cy={b.cy + 2} r={b.r} fill="black" opacity="0.25"/>
                {/* Cuerpo */}
                <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} stroke={b.hi} strokeWidth="1.5"/>
                {/* Brillo */}
                <circle cx={b.cx - b.r*0.28} cy={b.cy - b.r*0.28} r={b.r*0.3}
                  fill="white" opacity="0.55"/>
                {/* Número */}
                <text x={b.cx} y={b.cy + 3.5}
                  textAnchor="middle"
                  fontSize="7" fontWeight="900" fontFamily="monospace"
                  fill={b.color === '#f59e0b' ? '#1e293b' : 'white'}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {labels[i] ?? i + 1}
                </text>
              </g>
            ))}
          </g>

          {/* ── MANIVELA (eje derecho, oscila) ── */}
          <g style={{
            transformOrigin: '168px 96px',
            animation: `tc-crank ${crankDur} ease-in-out infinite`,
          }}>
            {/* Barra */}
            <rect x="168" y="92" width="28" height="8" rx="4" fill="url(#tc-axle)"/>
            {/* Perilla dorada */}
            <circle cx="200" cy="96" r="10" fill="url(#tc-knob)" stroke="#fbbf24" strokeWidth="1.5"/>
            {/* Brillo perilla */}
            <circle cx="196" cy="92" r="3.5" fill="white" opacity="0.45"/>
          </g>

          {/* ── ETIQUETA ESTADO ── */}
          <rect x="20" y="182" width="180" height="22" rx="11"
            fill="#0f172a" stroke="rgba(245,158,11,0.5)" strokeWidth="1.2"/>
          <text x="110" y="197"
            textAnchor="middle" fontSize="9" fontWeight="800"
            fontFamily="system-ui" fill="#fbbf24"
            style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isSpinningFast ? '⚡ EXTRAYENDO...' : '🎰 BOLILLERO GIRANDO'}
          </text>

        </svg>
      </div>
    </div>
  );
}
