import React, { useMemo, useState } from 'react';
import { GamePort, Player } from '../types.ts';
import { FlagSymbol } from './FlagSymbol.tsx';
import { Anchor, ShieldAlert, Users, Compass, Swords } from 'lucide-react';

interface HexMapProps {
  ports: Record<string, GamePort>;
  players: Record<string, Player>;
  currentPlayerId: string | null;
  selectedPortId: string | null;
  onSelectPort: (portId: string) => void;
  activeCampaigns: any[];
}

export const HexMap: React.FC<HexMapProps> = ({
  ports,
  players,
  currentPlayerId,
  selectedPortId,
  onSelectPort,
  activeCampaigns,
}) => {
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);

  // SVG dimensions
  const width = 850;
  const height = 650;
  const hexRadius = 42; // Radius of a single hexagon

  // Convert axial coordinates (q, r) to 2D pixel coordinates (x, y) relative to center of SVG
  const hexToPixel = (q: number, r: number) => {
    const x = hexRadius * Math.sqrt(3) * (q + r / 2) + width / 2;
    const y = hexRadius * 1.5 * r + height / 2;
    return { x, y };
  };

  // Generate background ocean grids and port coordinates
  const mapObjects = useMemo(() => {
    const list: { key: string; q: number; r: number; x: number; y: number; port?: GamePort }[] = [];
    
    // We render hex grid elements within radius 4
    for (let q = -4; q <= 4; q++) {
      for (let r = -4; r <= 4; r++) {
        if (Math.abs(q + r) <= 4) {
          const { x, y } = hexToPixel(q, r);
          
          // Check if there is a port at this location
          const port = (Object.values(ports) as GamePort[]).find(p => p.q === q && p.r === r);
          
          list.push({
            key: `${q}_${r}`,
            q,
            r,
            x,
            y,
            port,
          });
        }
      }
    }
    return list;
  }, [ports]);

  // Points for drawing a flat-topped hexagon path centered at (x, y)
  const getHexPoints = (x: number, y: number, r: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (60 * i - 30); // Pointy-topped
      const px = x + r * Math.cos(angleRad);
      const py = y + r * Math.sin(angleRad);
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  };

  // Find the coordinates of campaigns in flight to draw arrows
  const flightPaths = useMemo(() => {
    return activeCampaigns.map(camp => {
      const originPort = ports[camp.originPortId];
      const targetPort = ports[camp.targetPortId];
      if (!originPort || !targetPort) return null;

      const originCoords = hexToPixel(originPort.q, originPort.r);
      const targetCoords = hexToPixel(targetPort.q, targetPort.r);

      // Interpolate current position based on ticksRemaining
      // totalDuration = 18. Ticks left: 18 (just left origin) down to 0 (returned).
      // If moving (ticks 18 to 12): progress goes from 0% (at 18) to 100% (at 12)
      // If battling (ticks 12 to 6): progress is 100% (at target)
      // If returning (ticks 6 to 0): progress goes from 100% (at 6) to 0% (at 0)
      let t = 1.0; // default at target
      if (camp.ticksRemaining > 12) {
        // Moving to target: (18 - ticksRemaining) / 6
        t = (18 - camp.ticksRemaining) / 6;
      } else if (camp.ticksRemaining < 6) {
        // Returning: ticksRemaining / 6
        t = camp.ticksRemaining / 6;
      }

      const currX = originCoords.x + t * (targetCoords.x - originCoords.x);
      const currY = originCoords.y + t * (targetCoords.y - originCoords.y);

      return {
        id: camp.id,
        type: camp.type,
        status: camp.status,
        color: camp.senderFlagColor,
        sender: camp.senderName,
        originName: originPort.name,
        targetName: targetPort.name,
        originX: originCoords.x,
        originY: originCoords.y,
        targetX: targetCoords.x,
        targetY: targetCoords.y,
        currentX: currX,
        currentY: currY,
      };
    }).filter(p => p !== null);
  }, [activeCampaigns, ports]);

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
      
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-800/80 pb-3 gap-2">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-rose-500 animate-spin-slow" />
            The Caribbean Archipelago
          </h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Axial Hex Coordinates Range [-4, +4]</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Active Fleets</span>
          </div>
          <div className="text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
            Click port to command
          </div>
        </div>
      </div>

      {/* Main Map SVG Grid */}
      <div className="w-full flex justify-center overflow-x-auto select-none">
        <div className="relative min-w-[850px] min-h-[650px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
          
          {/* Subtle grid lines background overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />

          <svg width={width} height={height} className="overflow-visible">
            {/* Draw Sea Grid background tiles */}
            <g id="sea-tiles">
              {mapObjects.map(obj => {
                const isSelected = selectedPortId && obj.port && obj.port.id === selectedPortId;
                const isHovered = hoveredPortId && obj.port && obj.port.id === hoveredPortId;
                const isPlayerOwned = obj.port && currentPlayerId && obj.port.ownerId === currentPlayerId;
                
                // Color configuration
                let fill = 'rgba(15, 23, 42, 0.45)'; // Slate sea
                let stroke = 'rgba(75, 85, 99, 0.15)'; // Slate grid
                let strokeWidth = '1';

                if (obj.port) {
                  if (obj.port.type === 'npc') {
                    fill = 'rgba(30, 41, 59, 0.7)'; // NPC Slate
                    stroke = 'rgba(148, 163, 184, 0.4)';
                  } else if (isPlayerOwned) {
                    fill = 'rgba(225, 29, 72, 0.12)'; // Hearty red tint for own ports
                    stroke = '#f43f5e';
                    strokeWidth = '1.5';
                  } else if (obj.port.ownerId) {
                    fill = 'rgba(30, 58, 138, 0.15)'; // Rival navy tint
                    stroke = '#2563eb';
                  } else {
                    fill = 'rgba(20, 20, 20, 0.8)'; // Independent ports
                    stroke = 'rgba(100, 116, 139, 0.5)';
                  }
                }

                if (isSelected) {
                  stroke = '#fbbf24';
                  strokeWidth = '2.5';
                } else if (isHovered) {
                  stroke = '#ffffff';
                  strokeWidth = '2';
                }

                return (
                  <polygon
                    key={obj.key}
                    points={getHexPoints(obj.x, obj.y, hexRadius - 1.5)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className={`transition-colors duration-200 ${obj.port ? 'cursor-pointer' : ''}`}
                    onClick={() => obj.port && onSelectPort(obj.port.id)}
                    onMouseEnter={() => obj.port && setHoveredPortId(obj.port.id)}
                    onMouseLeave={() => obj.port && setHoveredPortId(null)}
                  />
                );
              })}
            </g>

            {/* Draw Flight Paths for Fleets in flight */}
            <g id="campaign-paths" className="pointer-events-none">
              {flightPaths.map(path => {
                if (!path) return null;
                const isAttacking = path.type !== 'scout';
                
                return (
                  <g key={path.id}>
                    {/* Path Line */}
                    <line
                      x1={path.originX}
                      y1={path.originY}
                      x2={path.targetX}
                      y2={path.targetY}
                      stroke={path.color}
                      strokeWidth={isAttacking ? '2' : '1.5'}
                      strokeDasharray={isAttacking ? '4,4' : '6,3'}
                      opacity={path.status === 'returning' ? 0.4 : 0.85}
                      className="animate-pulse"
                    />

                    {/* Fleet visual marker */}
                    <circle
                      cx={path.currentX}
                      cy={path.currentY}
                      r={isAttacking ? 5 : 4}
                      fill={path.color}
                      stroke="#000"
                      strokeWidth="1"
                    />
                    
                    {/* Little combat crossed swords at combat locations */}
                    {path.status === 'battling' && isAttacking && (
                      <g transform={`translate(${path.targetX - 10}, ${path.targetY - 10})`}>
                        <rect width="20" height="20" rx="3" fill="#ef4444" opacity="0.9" />
                        <Swords className="w-3.5 h-3.5 text-white absolute inset-0 m-auto animate-bounce" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Draw Text and Flag Overlays */}
            <g id="port-overlays" className="pointer-events-none">
              {mapObjects.map(obj => {
                if (!obj.port) return null;
                const { x, y } = obj;
                
                const isPlayerOwned = currentPlayerId && obj.port.ownerId === currentPlayerId;
                const isSelected = selectedPortId === obj.port.id;
                
                return (
                  <g key={`overlay_${obj.key}`} className="select-none">
                    {/* Render Flag symbol inside hex */}
                    <foreignObject
                      x={x - 16}
                      y={y - 20}
                      width="32"
                      height="24"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {obj.port.ownerId ? (
                          <FlagSymbol 
                            flagId={obj.port.ownerId.startsWith('npc_') ? 12 : (players[obj.port.ownerId]?.flagId || 1)} 
                            color={obj.port.ownerId.startsWith('npc_') ? '#475569' : (players[obj.port.ownerId]?.flagColor || '#f43f5e')} 
                            size="sm"
                          />
                        ) : (
                          // Independent merchant flag icon (white bone on slate)
                          <div className="w-6 h-4 rounded bg-neutral-800 border border-neutral-600 flex items-center justify-center">
                            <Anchor className="w-3 h-3 text-neutral-400" />
                          </div>
                        )}
                      </div>
                    </foreignObject>

                    {/* Port Name Display */}
                    <text
                      x={x}
                      y={y + 18}
                      textAnchor="middle"
                      fill={isSelected ? '#fbbf24' : isPlayerOwned ? '#f43f5e' : '#e2e8f0'}
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight={isSelected || isPlayerOwned ? 'bold' : 'normal'}
                      className="drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)]"
                    >
                      {obj.port.name}
                    </text>
                    
                    {/* Garrison count short indicator */}
                    <text
                      x={x}
                      y={y + 28}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="8"
                      fontFamily="monospace"
                      className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]"
                    >
                      🛡️{obj.port.troops} | ⚔️{obj.port.cannons}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Hover HUD Panel overlay */}
          {hoveredPortId && ports[hoveredPortId] && (
            <div 
              className="absolute bottom-4 left-4 max-w-xs bg-slate-900/95 backdrop-blur border border-neutral-800 rounded-lg p-3 text-xs shadow-xl pointer-events-none"
              style={{ zIndex: 100 }}
            >
              {(() => {
                const p = ports[hoveredPortId];
                const isOwn = currentPlayerId && p.ownerId === currentPlayerId;
                const ownerLabel = p.ownerId ? (p.ownerId === currentPlayerId ? 'You (Pirate Lord)' : p.ownerName) : 'Independent Pirates';
                const isNPC = p.ownerId && p.ownerId.startsWith('npc_');
                
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-sans font-bold text-sm text-amber-400 tracking-wide">{p.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono tracking-wider ${
                        isOwn ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                        isNPC ? 'bg-slate-700/40 text-slate-400 border border-slate-600/30' : 
                        p.ownerId ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {p.ownerId ? (isNPC ? 'NPC KINGDOM' : 'PLAYER PORT') : 'INDEPENDENT'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono text-neutral-300 border-t border-neutral-800 pt-1.5 mt-1.5">
                      <div>Owner:</div>
                      <div className="text-right text-neutral-100 truncate max-w-[100px]">{ownerLabel}</div>
                      
                      <div>Coordinates:</div>
                      <div className="text-right text-amber-500">{`q:${p.q}, r:${p.r}`}</div>
                      
                      <div>Fort Level:</div>
                      <div className="text-right text-teal-400">{'★'.repeat(p.fortificationLevel)}</div>

                      {p.razedTicksRemaining > 0 && (
                        <>
                          <div className="text-rose-400 flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> Razed:</div>
                          <div className="text-right text-rose-400 font-bold">{p.razedTicksRemaining} ticks</div>
                        </>
                      )}
                    </div>

                    {/* Detailed Intel if owned by current player */}
                    {isOwn ? (
                      <div className="border-t border-neutral-800 pt-1.5 mt-1.5 text-[10.5px] font-mono text-neutral-400">
                        <div className="flex justify-between">
                          <span>Sloop / Schooner:</span>
                          <span className="text-neutral-200">{p.sloop} / {p.schooner}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frigate / Galleon:</span>
                          <span className="text-neutral-200">{p.frigate} / {p.galleon}</span>
                        </div>
                        <div className="flex justify-between mt-0.5 text-[9.5px]">
                          <span>Production / Tick:</span>
                          <span className="text-yellow-500">+{p.baseGoldProduction}G / +{p.baseGoodsProduction}W</span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-neutral-800 pt-1.5 mt-1.5 text-[10px] text-neutral-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Deploy scouts or attack to reveal deep intel</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
