import React from 'react';

export type AcademicSketchSubject = 'all' | 'physics_chem' | 'biology' | 'earth' | 'math';

export function resolveAcademicSketchSubject(subjectName?: string): AcademicSketchSubject {
  const n = (subjectName || '').toLowerCase();
  if (n.includes('生')) return 'biology';
  if (n.includes('地科') || n.includes('地理') || n.includes('地球')) return 'earth';
  if (n.includes('物') || n.includes('化') || n.includes('理化') || n.includes('自然')) return 'physics_chem';
  if (n.includes('數') || n.includes('微積分') || n.includes('幾何')) return 'math';
  return 'all';
}

/**
 * 3. 金色幾何線條 — 頁面與卡片四邊角裝飾 (Gold Art-Deco / Circuit L-Corner Brackets)
 */
export function GoldCornerOrnaments({
  size = 56,
  inset = 10,
  opacity = 0.72,
  color = '#C89A50',
  corners = ['tl', 'tr', 'bl', 'br']
}: {
  size?: number;
  inset?: number;
  opacity?: number;
  color?: string;
  corners?: Array<'tl' | 'tr' | 'bl' | 'br'>;
}) {
  const renderCorner = (pos: 'tl' | 'tr' | 'bl' | 'br') => {
    const posStyle: React.CSSProperties = {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      pointerEvents: 'none',
      opacity,
      color,
      zIndex: 1,
      ...(pos === 'tl' ? { top: `${inset}px`, left: `${inset}px` } : {}),
      ...(pos === 'tr' ? { top: `${inset}px`, right: `${inset}px`, transform: 'scaleX(-1)' } : {}),
      ...(pos === 'bl' ? { bottom: `${inset}px`, left: `${inset}px`, transform: 'scaleY(-1)' } : {}),
      ...(pos === 'br' ? { bottom: `${inset}px`, right: `${inset}px`, transform: 'scale(-1, -1)' } : {})
    };

    return (
      <svg key={pos} aria-hidden="true" viewBox="0 0 80 80" style={posStyle} fill="none">
        {/* Outer stepped frame */}
        <path d="M4 72 V14 L14 4 H72" stroke="currentColor" strokeWidth="1.35" strokeLinecap="square" />
        {/* Inner architectural parallel line */}
        <path d="M10 60 V18 L18 10 H60" stroke="currentColor" strokeWidth="1" opacity="0.85" />
        {/* Third delicate circuit accent */}
        <path d="M16 44 V22 L22 16 H44" stroke="currentColor" strokeWidth="0.9" opacity="0.65" />
        {/* Stepped chevron & diagonal ticks */}
        <path d="M24 10 L30 4 M36 10 L42 4 M10 24 L4 30 M10 36 L4 42" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
        {/* Precision square nodes at line tips */}
        <rect x="72" y="2" width="4" height="4" stroke="currentColor" strokeWidth="1.1" />
        <rect x="2" y="72" width="4" height="4" stroke="currentColor" strokeWidth="1.1" />
        <rect x="59" y="8.2" width="3.5" height="3.5" fill="currentColor" opacity="0.75" />
        <rect x="8.2" y="59" width="3.5" height="3.5" fill="currentColor" opacity="0.75" />
        <rect x="13" y="13" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  };

  return <>{corners.map(renderCorner)}</>;
}

/**
 * 3. 金色幾何線條 — 區塊水平幾何分隔線 (Gold Geometric Section Divider)
 */
export function GoldGeometricDivider({
  style,
  color = '#C89A50',
  className = ''
}: {
  style?: React.CSSProperties;
  color?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        opacity: 0.72,
        color,
        ...style
      }}
    >
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent 0%, ${color} 100%)` }} />
      <svg width="46" height="12" viewBox="0 0 46 12" fill="none">
        <path d="M1 6 H14 L18 2 H28 L32 6 H45" stroke="currentColor" strokeWidth="1.1" />
        <path d="M14 6 L18 10 H28 L32 6" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
        <rect x="21" y="4" width="4" height="4" transform="rotate(45 23 6)" fill="currentColor" />
      </svg>
      <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${color} 0%, transparent 100%)` }} />
    </div>
  );
}

/**
 * 5. 學術手繪線稿 — 理化 / 生物 / 地科 / 綜合科學藍圖線稿背景 (Academic Hand-Drawn Technical Sketches)
 */
export function AcademicHandDrawnBackdrop({
  subject = 'all',
  opacity,
  className = ''
}: {
  subject?: AcademicSketchSubject;
  opacity?: number;
  className?: string;
}) {
  const uid = `pobi-sketch-pat-${subject}`;

  const renderPatternContent = () => {
    if (subject === 'biology') {
      return (
        <>
          {/* DNA double helix */}
          <g transform="translate(24, 24) rotate(-18)">
            <path d="M0,16 Q24,52 48,16 T96,16 T144,16" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M0,52 Q24,16 48,52 T96,52 T144,52" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="12" y1="26" x2="12" y2="42" stroke="currentColor" strokeWidth="0.9" />
            <line x1="36" y1="26" x2="36" y2="42" stroke="currentColor" strokeWidth="0.9" />
            <line x1="60" y1="26" x2="60" y2="42" stroke="currentColor" strokeWidth="0.9" />
            <line x1="84" y1="26" x2="84" y2="42" stroke="currentColor" strokeWidth="0.9" />
            <line x1="108" y1="26" x2="108" y2="42" stroke="currentColor" strokeWidth="0.9" />
            <line x1="132" y1="26" x2="132" y2="42" stroke="currentColor" strokeWidth="0.9" />
          </g>
          {/* Plant / Eukaryotic cell outline */}
          <g transform="translate(220, 40)">
            <polygon points="45,6 84,26 84,72 45,92 6,72 6,26" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <polygon points="45,14 76,30 76,68 45,84 14,68 14,30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2" />
            <circle cx="45" cy="48" r="15" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <circle cx="48" cy="46" r="5" fill="none" stroke="currentColor" strokeWidth="0.9" />
            <ellipse cx="26" cy="62" rx="8" ry="4" transform="rotate(-25 26 62)" fill="none" stroke="currentColor" strokeWidth="0.9" />
          </g>
          {/* Botanical leaf venation */}
          <g transform="translate(90, 170) rotate(12)">
            <path d="M10,70 C20,25 65,5 108,14 C96,55 58,86 10,70 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10,70 Q56,42 108,14" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M35,55 L42,35 M56,43 L62,24 M76,32 L80,19 M44,50 L62,56 M66,37 L82,42" fill="none" stroke="currentColor" strokeWidth="0.85" />
          </g>
          {/* Microscope / petri annotation */}
          <g transform="translate(250, 190)">
            <circle cx="46" cy="46" r="34" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <circle cx="46" cy="46" r="28" fill="none" stroke="currentColor" strokeWidth="0.7" strokeDasharray="4 3" />
            <circle cx="36" cy="38" r="6" fill="none" stroke="currentColor" strokeWidth="0.9" />
            <circle cx="56" cy="52" r="8" fill="none" stroke="currentColor" strokeWidth="0.9" />
            <circle cx="44" cy="60" r="4" fill="none" stroke="currentColor" strokeWidth="0.9" />
          </g>
        </>
      );
    }

    if (subject === 'earth') {
      return (
        <>
          {/* Topographic contour lines */}
          <g transform="translate(20, 26)">
            <path d="M15,72 C22,22 92,8 142,36 C168,52 162,96 116,108 C64,122 10,112 15,72 Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <path d="M34,68 C40,34 88,24 124,44 C144,56 138,84 106,94 C70,104 30,96 34,68 Z" fill="none" stroke="currentColor" strokeWidth="0.95" strokeDasharray="4 2" />
            <path d="M56,64 C60,46 86,40 106,52 C118,60 114,74 96,80 C76,86 52,80 56,64 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
            <text x="76" y="68" fontSize="9" fill="currentColor" fontFamily="monospace">420m</text>
          </g>
          {/* Planetary orbit & Earth axial tilt */}
          <g transform="translate(215, 36)">
            <ellipse cx="64" cy="54" rx="58" ry="22" transform="rotate(-18 64 54)" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx="64" cy="54" r="24" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <ellipse cx="64" cy="54" rx="24" ry="8" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <line x1="52" y1="22" x2="76" y2="86" stroke="currentColor" strokeWidth="1" />
            <circle cx="114" cy="37" r="5" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </g>
          {/* Compass rose & geological strata */}
          <g transform="translate(40, 185)">
            <circle cx="48" cy="48" r="32" fill="none" stroke="currentColor" strokeWidth="1" />
            <polygon points="48,10 54,42 86,48 54,54 48,86 42,54 10,48 42,42" fill="none" stroke="currentColor" strokeWidth="1" />
            <text x="44" y="8" fontSize="9" fill="currentColor" fontFamily="serif">N</text>
          </g>
          <g transform="translate(195, 195)">
            <rect x="6" y="16" width="124" height="68" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M6,38 Q48,26 88,42 T130,36" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M6,58 Q48,46 88,62 T130,56" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
            <line x1="68" y1="16" x2="54" y2="84" stroke="currentColor" strokeWidth="1.1" />
          </g>
        </>
      );
    }

    // Default / physics_chem / math / all: Rich technical hand-drawn blueprint (cube, pulley, circuit, atom, lens, benzene, parabola)
    return (
      <>
        {/* 3D Isometric Geometry Cube with hidden dashed edges */}
        <g transform="translate(22, 20)">
          <polygon points="46,8 84,26 84,68 46,86 8,68 8,26" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <polyline points="8,26 46,44 84,26" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <line x1="46" y1="44" x2="46" y2="86" stroke="currentColor" strokeWidth="1.1" />
          <line x1="46" y1="8" x2="46" y2="50" stroke="currentColor" strokeWidth="0.85" strokeDasharray="3 3" />
          <line x1="8" y1="68" x2="46" y2="50" stroke="currentColor" strokeWidth="0.85" strokeDasharray="3 3" />
          <line x1="84" y1="68" x2="46" y2="50" stroke="currentColor" strokeWidth="0.85" strokeDasharray="3 3" />
        </g>

        {/* Physics Pulley & Hanging Mass */}
        <g transform="translate(148, 18)">
          <line x1="8" y1="6" x2="64" y2="6" stroke="currentColor" strokeWidth="1.3" />
          <line x1="36" y1="6" x2="36" y2="24" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="36" cy="36" r="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="36" cy="36" r="3" fill="currentColor" />
          <line x1="22" y1="36" x2="22" y2="74" stroke="currentColor" strokeWidth="1" />
          <line x1="50" y1="36" x2="50" y2="62" stroke="currentColor" strokeWidth="1" />
          <rect x="12" y="74" width="20" height="18" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <text x="17" y="86" fontSize="9" fill="currentColor" fontFamily="serif">m1</text>
          <rect x="42" y="62" width="16" height="14" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </g>

        {/* Benzene Molecular Ring + Flask */}
        <g transform="translate(248, 22)">
          <polygon points="34,8 56,21 56,47 34,60 12,47 12,21" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <circle cx="34" cy="34" r="13" fill="none" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 2" />
          <line x1="56" y1="21" x2="74" y2="12" stroke="currentColor" strokeWidth="1.1" />
          <line x1="56" y1="47" x2="74" y2="56" stroke="currentColor" strokeWidth="1.1" />
          <text x="76" y="15" fontSize="9" fill="currentColor" fontFamily="monospace">OH</text>
          <text x="76" y="60" fontSize="9" fill="currentColor" fontFamily="monospace">R</text>
        </g>

        {/* Rutherford Atom Orbits */}
        <g transform="translate(125, 134)">
          <ellipse cx="42" cy="42" rx="34" ry="13" transform="rotate(30 42 42)" fill="none" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="42" cy="42" rx="34" ry="13" transform="rotate(-30 42 42)" fill="none" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="42" cy="42" rx="34" ry="13" transform="rotate(90 42 42)" fill="none" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 2" />
          <circle cx="42" cy="42" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </g>

        {/* RLC Electrical Circuit Diagram */}
        <g transform="translate(222, 146) rotate(-14)">
          <polyline points="8,56 8,16 32,16" fill="none" stroke="currentColor" strokeWidth="1.1" />
          {/* Inductor coils */}
          <path d="M32,16 Q37,6 42,16 Q47,6 52,16 Q57,6 62,16 Q67,6 72,16" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <polyline points="72,16 96,16 96,34" fill="none" stroke="currentColor" strokeWidth="1.1" />
          {/* Capacitor plates */}
          <line x1="86" y1="34" x2="106" y2="34" stroke="currentColor" strokeWidth="1.2" />
          <line x1="86" y1="42" x2="106" y2="42" stroke="currentColor" strokeWidth="1.2" />
          <polyline points="96,42 96,56 64,56" fill="none" stroke="currentColor" strokeWidth="1.1" />
          {/* Resistor zigzag */}
          <polyline points="64,56 60,50 54,62 48,50 42,62 36,56 8,56" fill="none" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="8" cy="36" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
          <text x="5" y="39" fontSize="8" fill="currentColor" fontFamily="monospace">V</text>
        </g>

        {/* Coordinate Axes & Parabola Curve */}
        <g transform="translate(18, 172)">
          <line x1="6" y1="86" x2="106" y2="86" stroke="currentColor" strokeWidth="1.1" />
          <line x1="22" y1="14" x2="22" y2="102" stroke="currentColor" strokeWidth="1.1" />
          <path d="M22,82 Q56,12 98,74" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <line x1="22" y1="86" x2="72" y2="34" stroke="currentColor" strokeWidth="0.9" strokeDasharray="3 3" />
          <circle cx="57" cy="46" r="2.5" fill="currentColor" />
          <text x="64" y="30" fontSize="9" fill="currentColor" fontFamily="serif">f(x)</text>
        </g>

        {/* Optical Convex Lens Ray Diagram */}
        <g transform="translate(158, 240)">
          <line x1="4" y1="30" x2="132" y2="30" stroke="currentColor" strokeWidth="0.9" strokeDasharray="4 3" />
          <path d="M68,6 Q78,30 68,54 Q58,30 68,6 Z" fill="none" stroke="currentColor" strokeWidth="1.15" />
          <polyline points="14,16 68,16 120,44" fill="none" stroke="currentColor" strokeWidth="0.95" />
          <line x1="14" y1="16" x2="120" y2="44" stroke="currentColor" strokeWidth="0.85" opacity="0.7" />
          <circle cx="94" cy="30" r="2" fill="currentColor" />
          <text x="92" y="24" fontSize="8" fill="currentColor" fontFamily="serif">F</text>
        </g>
      </>
    );
  };

  return (
    <div
      aria-hidden="true"
      className={`pobi-academic-sketch-layer ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
        ...(opacity !== undefined ? { opacity } : {})
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={uid} width="360" height="320" patternUnits="userSpaceOnUse">
            {renderPatternContent()}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${uid})`} />
      </svg>
    </div>
  );
}
