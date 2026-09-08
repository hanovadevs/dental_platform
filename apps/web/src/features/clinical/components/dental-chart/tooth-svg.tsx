'use client';

import React from 'react';
import { ToothDefinition, ToothSurface, TOOTH_CONDITIONS_CATALOG } from '../../domain/teeth';

export interface ActiveConditionSummary {
  id: string;
  conditionType: string;
  surface?: string | null;
  status: string;
  active: boolean;
}

interface ToothSvgProps {
  tooth: ToothDefinition;
  displayNumber: string;
  conditions: ActiveConditionSummary[];
  isSelected?: boolean;
  onSelect: (tooth: ToothDefinition) => void;
}

export function ToothSvg({
  tooth,
  displayNumber,
  conditions,
  isSelected,
  onSelect,
}: ToothSvgProps) {
  const isUpper = tooth.arch === 'maxillary';
  const isRightOfMidline = tooth.quadrant === 1 || tooth.quadrant === 4;

  // Midline orientation:
  // For Right quadrants (1 & 4), right side is Mesial (towards midline), left is Distal.
  // For Left quadrants (2 & 3), left side is Mesial (towards midline), right is Distal.
  const leftSurface: ToothSurface = isRightOfMidline ? 'D' : 'M';
  const rightSurface: ToothSurface = isRightOfMidline ? 'M' : 'D';

  // Arch orientation:
  // Upper arch: top is Buccal/Facial, bottom is Lingual/Palatal.
  // Lower arch: top is Lingual, bottom is Buccal/Facial.
  const topSurface: ToothSurface = isUpper ? (tooth.type === 'incisor' || tooth.type === 'canine' ? 'F' : 'B') : 'L';
  const bottomSurface: ToothSurface = isUpper ? 'L' : (tooth.type === 'incisor' || tooth.type === 'canine' ? 'F' : 'B');
  const centerSurface: ToothSurface = tooth.type === 'incisor' || tooth.type === 'canine' ? 'I' : 'O';

  // Find active conditions
  const activeConditions = conditions.filter((c) => c.active);
  const isMissing = activeConditions.some((c) => c.conditionType === 'missing');
  const hasCrown = activeConditions.some((c) => c.conditionType === 'crown');
  const hasRootCanal = activeConditions.some((c) => c.conditionType === 'root_canal');
  const hasImplant = activeConditions.some((c) => c.conditionType === 'implant');
  const hasExtraction = activeConditions.some((c) => c.conditionType === 'extraction_recommended');
  const hasFracture = activeConditions.some((c) => c.conditionType === 'fracture');

  // Helper to find surface condition color
  const getSurfaceColor = (surfaceCode: ToothSurface): string => {
    if (isMissing) return 'rgba(148, 163, 184, 0.2)';
    const cond = activeConditions.find((c) => {
      if (!c.surface) return false;
      const upper = c.surface.toUpperCase();
      return upper.includes(surfaceCode);
    });

    if (cond) {
      const meta = TOOTH_CONDITIONS_CATALOG[cond.conditionType];
      return meta ? meta.color : '#dc2626';
    }

    if (hasCrown) return 'rgba(217, 119, 6, 0.4)';
    return '#f8fafc'; // Neutral healthy surface
  };

  // Border and accent styling
  let containerBorder = isSelected ? 'var(--primary-600, #0284c7)' : 'rgba(203, 213, 225, 0.7)';
  if (isSelected) containerBorder = '#0284c7';

  return (
    <div
      onClick={() => onSelect(tooth)}
      role="button"
      tabIndex={0}
      aria-label={`Tooth ${displayNumber} (${tooth.name})`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(tooth);
        }
      }}
      style={{
        display: 'flex',
        flexDirection: isUpper ? 'column' : 'column-reverse',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '6px 4px',
        borderRadius: '8px',
        transition: 'all 0.15s ease',
        backgroundColor: isSelected ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
        border: isSelected ? '2px solid #0284c7' : '1px solid transparent',
        outline: 'none',
        minWidth: '46px',
        userSelect: 'none',
      }}
    >
      {/* Tooth Number Label */}
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: isSelected ? 700 : 600,
          color: isSelected ? '#0284c7' : '#475569',
          marginBottom: isUpper ? '4px' : '0',
          marginTop: isUpper ? '0' : '4px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayNumber}
      </span>

      {/* Anatomical SVG Graphic */}
      <svg
        width="42"
        height="56"
        viewBox="0 0 42 56"
        style={{
          overflow: 'visible',
          opacity: isMissing ? 0.45 : 1,
          filter: isSelected ? 'drop-shadow(0 2px 4px rgba(2, 132, 199, 0.25))' : 'none',
        }}
      >
        {/* Roots Graphic (Upper arch points up, Lower arch points down) */}
        {isUpper ? (
          // Upper Roots
          <g transform="translate(0, 0)">
            {hasImplant ? (
              // Implant Screw Graphic
              <g stroke="#0891b2" strokeWidth="1.5" fill="none">
                <line x1="21" y1="2" x2="21" y2="18" />
                <line x1="16" y1="6" x2="26" y2="6" />
                <line x1="17" y1="10" x2="25" y2="10" />
                <line x1="18" y1="14" x2="24" y2="14" />
                <circle cx="21" cy="2" r="2.5" fill="#0891b2" />
              </g>
            ) : tooth.type === 'molar' ? (
              // Multi-rooted upper molar
              <path
                d="M13 18 C11 10, 10 3, 12 2 C15 2, 17 9, 19 18 M23 18 C25 9, 27 2, 30 2 C32 3, 31 10, 29 18"
                fill="none"
                stroke={hasRootCanal ? '#7c3aed' : '#cbd5e1'}
                strokeWidth={hasRootCanal ? '2.5' : '1.5'}
                strokeLinecap="round"
              />
            ) : (
              // Single / double rooted anterior / premolar
              <path
                d="M17 18 C18 9, 19 2, 21 2 C23 2, 24 9, 25 18"
                fill="none"
                stroke={hasRootCanal ? '#7c3aed' : '#cbd5e1'}
                strokeWidth={hasRootCanal ? '2.5' : '1.5'}
                strokeLinecap="round"
              />
            )}
          </g>
        ) : (
          // Lower Roots
          <g transform="translate(0, 36)">
            {hasImplant ? (
              // Implant Screw Graphic
              <g stroke="#0891b2" strokeWidth="1.5" fill="none">
                <line x1="21" y1="2" x2="21" y2="18" />
                <line x1="16" y1="6" x2="26" y2="6" />
                <line x1="17" y1="10" x2="25" y2="10" />
                <line x1="18" y1="14" x2="24" y2="14" />
                <circle cx="21" cy="18" r="2.5" fill="#0891b2" />
              </g>
            ) : tooth.type === 'molar' ? (
              // Multi-rooted lower molar
              <path
                d="M13 2 C11 10, 10 17, 12 18 C15 18, 17 11, 19 2 M23 2 C25 11, 27 18, 30 18 C32 17, 31 10, 29 2"
                fill="none"
                stroke={hasRootCanal ? '#7c3aed' : '#cbd5e1'}
                strokeWidth={hasRootCanal ? '2.5' : '1.5'}
                strokeLinecap="round"
              />
            ) : (
              // Single rooted lower tooth
              <path
                d="M17 2 C18 11, 19 18, 21 18 C23 18, 24 11, 25 2"
                fill="none"
                stroke={hasRootCanal ? '#7c3aed' : '#cbd5e1'}
                strokeWidth={hasRootCanal ? '2.5' : '1.5'}
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {/* Crown 5-Surface Diagram (Y: 18 to 38) */}
        <g transform="translate(6, 17)">
          {/* Outer Crown Border / Background */}
          <rect
            x="0"
            y="0"
            width="30"
            height="22"
            rx="4"
            fill="#ffffff"
            stroke={hasCrown ? '#d97706' : hasFracture ? '#ea580c' : containerBorder}
            strokeWidth={hasCrown ? '2.5' : '1.2'}
            strokeDasharray={hasFracture ? '3,2' : undefined}
          />

          {/* Top Surface */}
          <polygon
            points="0,0 30,0 23,6 7,6"
            fill={getSurfaceColor(topSurface)}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />

          {/* Bottom Surface */}
          <polygon
            points="0,22 30,22 23,16 7,16"
            fill={getSurfaceColor(bottomSurface)}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />

          {/* Left Surface */}
          <polygon
            points="0,0 7,6 7,16 0,22"
            fill={getSurfaceColor(leftSurface)}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />

          {/* Right Surface */}
          <polygon
            points="30,0 23,6 23,16 30,22"
            fill={getSurfaceColor(rightSurface)}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />

          {/* Center Occlusal / Incisal Surface */}
          <rect
            x="7"
            y="6"
            width="16"
            height="10"
            rx="1.5"
            fill={getSurfaceColor(centerSurface)}
            stroke="#94a3b8"
            strokeWidth="0.75"
          />

          {/* Missing Tooth Strike Indicator */}
          {isMissing && (
            <line
              x1="2"
              y1="2"
              x2="28"
              y2="20"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Extraction Recommended Red Cross */}
          {hasExtraction && (
            <g stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="26" y2="18" />
              <line x1="26" y1="4" x2="4" y2="18" />
            </g>
          )}
        </g>
      </svg>

      {/* Condition Badges / Dots underneath */}
      <div style={{ display: 'flex', gap: '2px', height: '6px', marginTop: '2px' }}>
        {activeConditions.slice(0, 3).map((c) => {
          const meta = TOOTH_CONDITIONS_CATALOG[c.conditionType];
          return (
            <span
              key={c.id}
              title={`${meta?.label || c.conditionType} (${c.surface || 'Tooth'})`}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: meta ? meta.color : '#dc2626',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
