import React, { useState, useMemo } from 'react';
import { GamePort, Player, SHIP_CONFIGS, COST_TROOP, COST_CANNON, COST_SCOUT, COST_GOVERNOR, getGovernorCost, COST_FORTIFICATION, getFortificationCost, TradeRoute } from '../types.ts';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Anchor, 
  Wrench, 
  Compass, 
  Briefcase, 
  Activity, 
  Plus, 
  X,
  Lock
} from 'lucide-react';

interface DashboardProps {
  player: Player;
  ports: Record<string, GamePort>;
  tradeRoutes: TradeRoute[];
  players?: Record<string, Player>;
  onBuildShip: (portId: string, shipSize: string, count: number) => Promise<void>;
  onTrainUnit: (portId: string, type: string, count: number) => Promise<void>;
  onEstablishTrade: (proposerPortId: string, recipientPortId: string, shipType: 'sloop' | 'schooner') => Promise<void>;
  onAcceptTrade?: (routeId: string) => Promise<void>;
  onDeclineTrade?: (routeId: string) => Promise<void>;
  onCancelTrade: (routeId: string) => Promise<void>;
  selectedPortId: string | null;
  onSelectPort: (portId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  player,
  ports,
  tradeRoutes,
  players = {},
  onBuildShip,
  onTrainUnit,
  onEstablishTrade,
  onAcceptTrade,
  onDeclineTrade,
  onCancelTrade,
  selectedPortId,
  onSelectPort,
}) => {
  const [buildCount, setBuildCount] = useState<Record<string, number>>({
    sloop: 1, schooner: 1, frigate: 1, galleon: 1
  });
  const [trainCount, setTrainCount] = useState<Record<string, number>>({
    troops: 5, cannons: 2, scout: 1, governors: 1, fort: 1
  });

  const [tradeTargetPortId, setTradeTargetPortId] = useState<string>('');
  const [tradeShipType, setTradeShipType] = useState<'sloop' | 'schooner'>('sloop');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter player-owned ports
  const playerPorts = (Object.values(ports) as GamePort[]).filter(p => p.ownerId === player.id);
  const selectedPort = selectedPortId ? ports[selectedPortId] : null;
  const isSelectedPortOwned = selectedPort && selectedPort.ownerId === player.id;

  // Active trade routes owned by player
  const activeRoutes = tradeRoutes.filter(r => r.ownerId === player.id);

  const maxCrewCapacity = useMemo(() => {
    if (!selectedPort) return 0;
    return (selectedPort.sloop * SHIP_CONFIGS.sloop.crewCapacity) +
           (selectedPort.schooner * SHIP_CONFIGS.schooner.crewCapacity) +
           (selectedPort.frigate * SHIP_CONFIGS.frigate.crewCapacity) +
           (selectedPort.galleon * SHIP_CONFIGS.galleon.crewCapacity);
  }, [selectedPort]);

  const maxCannonCapacity = useMemo(() => {
    if (!selectedPort) return 0;
    return (selectedPort.sloop * SHIP_CONFIGS.sloop.cannonCapacity) +
           (selectedPort.schooner * SHIP_CONFIGS.schooner.cannonCapacity) +
           (selectedPort.frigate * SHIP_CONFIGS.frigate.cannonCapacity) +
           (selectedPort.galleon * SHIP_CONFIGS.galleon.cannonCapacity);
  }, [selectedPort]);

  const maxCargoCapacity = useMemo(() => {
    if (!selectedPort) return 0;
    return (selectedPort.sloop * SHIP_CONFIGS.sloop.cargoCapacity) +
           (selectedPort.schooner * SHIP_CONFIGS.schooner.cargoCapacity) +
           (selectedPort.frigate * SHIP_CONFIGS.frigate.cargoCapacity) +
           (selectedPort.galleon * SHIP_CONFIGS.galleon.cargoCapacity);
  }, [selectedPort]);

  const handleAction = async (actionFn: () => Promise<void>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await actionFn();
      setSuccessMsg('Action executed successfully, Captain!');
    } catch (e: any) {
      setErrorMsg(e.message || 'Action failed!');
    }
  };

  const nextFortCost = selectedPort && selectedPort.fortificationLevel < 5 
    ? getFortificationCost(selectedPort.fortificationLevel) 
    : { goldCost: 0, goodsCost: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Player Treasury & Port Selector */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Treasury Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-xs font-semibold tracking-widest text-neutral-400 font-mono mb-4">PIRATE TREASURY</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-400">GOLD DOUBLOONS</div>
                  <div className="text-2xl font-bold font-mono text-yellow-400">{player.gold.toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                  <Package className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-400">CARGO & WOOD (GOODS)</div>
                  <div className="text-2xl font-bold font-mono text-teal-300">{player.goods.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-neutral-800 text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            <span>Resource production deposits automatically every 15m.</span>
          </div>
        </div>

        {/* Owned Territory Directory */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4">Your Dockyards ({playerPorts.length})</h3>
          
          {playerPorts.length === 0 ? (
            <div className="p-4 bg-neutral-950 rounded border border-neutral-800 text-center">
              <p className="text-neutral-500 text-xs">You have no dockyards! All your ports were conquered. Colonize one or launch an attack!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {playerPorts.map(p => {
                const isSel = selectedPortId === p.id;
                const isRazed = p.razedTicksRemaining > 0;
                
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPort(p.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      isSel 
                        ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-md' 
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-950'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <Anchor className={`w-3.5 h-3.5 ${isSel ? 'text-rose-400' : 'text-neutral-500'}`} />
                        {p.name}
                      </div>
                      <div className="text-[9px] font-mono text-neutral-400 mt-0.5">
                        🛡️{p.troops} Crew | ⚔️{p.cannons} Cannons
                      </div>
                    </div>
                    {isRazed ? (
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] font-mono text-yellow-500 font-bold">
                          +{Math.floor(p.baseGoldProduction * (p.razedTicksRemaining > 24 ? 1 / 3 : 2 / 3))}G
                        </span>
                        <span className="bg-rose-500/20 text-rose-400 text-[8px] font-mono font-bold px-1 py-0.2 rounded border border-rose-500/30 flex items-center gap-0.5 animate-pulse mt-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" /> RAZED (-{p.baseGoldProduction - Math.floor(p.baseGoldProduction * (p.razedTicksRemaining > 24 ? 1 / 3 : 2 / 3))}G)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-yellow-500">+{p.baseGoldProduction}G</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Commands Panel */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Error / Success Toasts */}
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-200 font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-teal-950/50 border border-teal-500/40 rounded-lg text-xs text-teal-200 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400 flex-shrink-0 animate-pulse" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Selected Port HUD */}
        {!selectedPort ? (
          <div className="bg-slate-900/50 border border-dashed border-neutral-800 rounded-xl p-12 text-center">
            <Anchor className="w-10 h-10 text-neutral-600 mx-auto mb-3 animate-bounce" />
            <p className="text-neutral-400 text-xs">Select one of your ports on the map or from the directory to start commanding your fleets, recruiting crew, and constructing galleons.</p>
          </div>
        ) : !isSelectedPortOwned ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Foreign Territory: {selectedPort.name}
              </h3>
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20">
                {selectedPort.ownerId ? `Owned by ${selectedPort.ownerName}` : 'Independent'}
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-mono">
              You do not control this island. If you wish to colonize or plunder this port, navigate to the <span className="text-rose-400 font-bold">Armada (Military)</span> tab, select a departure port, and set sail with a combat fleet!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Port Title and Production Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
                <div>
                  <h2 className="text-sm font-black uppercase text-slate-200 flex items-center gap-1.5 tracking-wider">
                    <Anchor className="w-5 h-5 text-rose-500" />
                    Commanding Port: {selectedPort.name}
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">Position: q={selectedPort.q}, r={selectedPort.r}</p>
                </div>
                
                {selectedPort.razedTicksRemaining > 0 && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded px-2.5 py-1 text-[10px] font-mono text-red-300 flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>RAZED: PRODUCTION CUT ({selectedPort.razedTicksRemaining} Ticks Left)</span>
                  </div>
                )}
              </div>

              {/* Garrison Display */}
              <h4 className="text-[10px] font-mono text-neutral-400 font-bold mb-2 tracking-wider">CURRENT STATIONED FORCES</h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
                  <div className="text-lg font-bold font-mono text-white">{selectedPort.troops}</div>
                  <div className="text-[9px] font-mono text-neutral-400">Pirate Crew (Cap: {maxCrewCapacity})</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
                  <div className="text-lg font-bold font-mono text-white">
                    {selectedPort.cannons}
                    {Math.min(selectedPort.cannons, Math.floor(selectedPort.troops / 2)) < selectedPort.cannons && (
                      <span className="text-[10px] text-amber-400 font-normal block text-center">
                        ({Math.min(selectedPort.cannons, Math.floor(selectedPort.troops / 2))} Manned)
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-neutral-400">Cannons (Cap: {maxCannonCapacity})</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center">
                  <div className="text-lg font-bold font-mono text-white">{selectedPort.governors}</div>
                  <div className="text-[9px] font-mono text-neutral-400">Governors</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold font-mono text-white">{selectedPort.scoutCount}</div>
                  <div className="text-[9px] font-mono text-neutral-400">Spies/Scouts</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-center col-span-2 sm:col-span-2">
                  <div className="text-xs font-mono text-neutral-300 flex flex-col justify-center h-full">
                    <div>⛵ {selectedPort.sloop} Sloop | ⛵ {selectedPort.schooner} Sch</div>
                    <div className="mt-0.5">🛥️ {selectedPort.frigate} Frig | 🚢 {selectedPort.galleon} Gall</div>
                  </div>
                </div>
              </div>

              {/* Economic Production Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-neutral-950/40 border border-neutral-800 rounded p-2.5 text-center">
                  <div className="text-[10px] font-mono text-neutral-400">GOLD REVENUE</div>
                  <div className="text-sm font-bold font-mono text-yellow-500">
                    +{selectedPort.razedTicksRemaining > 24 
                      ? Math.floor(selectedPort.baseGoldProduction / 3) 
                      : selectedPort.razedTicksRemaining > 0 
                        ? Math.floor(selectedPort.baseGoldProduction * 2 / 3) 
                        : selectedPort.baseGoldProduction}G <span className="text-xs font-normal text-neutral-400">/tick</span>
                  </div>
                  {selectedPort.razedTicksRemaining > 0 && (
                    <div className="text-[9px] font-mono text-rose-400 font-bold mt-0.5">
                      🔥 -{selectedPort.baseGoldProduction - Math.floor(selectedPort.baseGoldProduction * (selectedPort.razedTicksRemaining > 24 ? 1 / 3 : 2 / 3))}G razed loss
                    </div>
                  )}
                </div>
                <div className="bg-neutral-950/40 border border-neutral-800 rounded p-2.5 text-center">
                  <div className="text-[10px] font-mono text-neutral-400">GOODS / WOOD YIELD</div>
                  <div className="text-sm font-bold font-mono text-teal-400">
                    +{selectedPort.razedTicksRemaining > 24 
                      ? Math.floor(selectedPort.baseGoodsProduction / 3) 
                      : selectedPort.razedTicksRemaining > 0 
                        ? Math.floor(selectedPort.baseGoodsProduction * 2 / 3) 
                        : selectedPort.baseGoodsProduction}W <span className="text-xs font-normal text-neutral-400">/tick</span>
                  </div>
                  {selectedPort.razedTicksRemaining > 0 && (
                    <div className="text-[9px] font-mono text-rose-400 font-bold mt-0.5">
                      🔥 -{selectedPort.baseGoodsProduction - Math.floor(selectedPort.baseGoodsProduction * (selectedPort.razedTicksRemaining > 24 ? 1 / 3 : 2 / 3))}W razed loss
                    </div>
                  )}
                </div>
                <div className="bg-neutral-950/40 border border-neutral-800 rounded p-2.5 text-center">
                  <div className="text-[10px] font-mono text-neutral-400">FORTIFICATIONS</div>
                  <div className="text-sm font-bold font-mono text-pink-400">
                    Level {selectedPort.fortificationLevel} / 5
                  </div>
                </div>
              </div>

              {/* Construction & Training Queue */}
              {selectedPort.buildQueue && selectedPort.buildQueue.length > 0 && (
                <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-rose-500/20">
                  <h4 className="text-[10px] font-mono text-rose-400 font-bold mb-2 tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    CONSTRUCTION & TRAINING QUEUE ({selectedPort.buildQueue.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedPort.buildQueue.map((item) => {
                      const percentage = Math.round(((item.totalTicks - item.ticksRemaining) / item.totalTicks) * 100);
                      
                      let typeLabel = item.type;
                      let icon = '🔧';
                      if (item.type === 'troops') {
                        typeLabel = 'Pirate Crew (Barracks)';
                        icon = '👥';
                      } else if (item.type === 'cannons') {
                        typeLabel = 'Defensive Artillery Cannons';
                        icon = '💣';
                      } else if (item.type === 'fort') {
                        typeLabel = 'Fortification Wall';
                        icon = '🏰';
                      } else if (item.type === 'sloop') {
                        typeLabel = 'Sloop (Light Corvette)';
                        icon = '⛵';
                      } else if (item.type === 'schooner') {
                        typeLabel = 'Schooner (Merchant Trader)';
                        icon = '⛵';
                      } else if (item.type === 'frigate') {
                        typeLabel = 'Frigate (Heavy Cruiser)';
                        icon = '⚔️';
                      } else if (item.type === 'galleon') {
                        typeLabel = 'Galleon (Colossal Dreadnought)';
                        icon = '🚢';
                      }

                      return (
                        <div key={item.id} className="text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-900/40 rounded-xl border border-slate-800">
                          <div>
                            <span className="mr-2 text-sm">{icon}</span>
                            <span className="font-bold text-slate-200">{typeLabel}</span>
                            <span className="text-neutral-400 ml-1.5 font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-slate-800">x{item.count}</span>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-64">
                            <div className="flex-grow bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                              <div 
                                className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-yellow-400 font-bold whitespace-nowrap">
                              {item.ticksRemaining} tick{item.ticksRemaining > 1 ? 's' : ''} left
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recruits and Upgrades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Training and Artillery */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                  <Users className="w-4 h-4 text-rose-500" />
                  Recruitment & Fortifications
                </h3>

                <div className="space-y-3.5 text-xs font-mono">
                  {/* Train Troops */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-neutral-950 rounded border border-neutral-800">
                    <div>
                      <div className="font-bold text-neutral-200">Pirate Crew (Troops)</div>
                      <div className="text-[10px] text-neutral-400">Cost: {COST_TROOP} Gold | Upkeep: 1G/tick | Ship Capacity: {maxCrewCapacity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        value={trainCount.troops} 
                        onChange={(e) => setTrainCount({...trainCount, troops: Math.max(1, parseInt(e.target.value) || 0)})}
                        className="w-12 bg-slate-900 border border-neutral-700 text-center py-1 text-white rounded text-xs"
                      />
                      <button 
                        onClick={() => handleAction(() => onTrainUnit(selectedPort.id, 'troops', trainCount.troops))}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                      >
                        Recruit
                      </button>
                    </div>
                  </div>

                  {/* Buy Cannons */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-neutral-950 rounded border border-neutral-800">
                    <div>
                      <div className="font-bold text-neutral-200">Artillery (Cannons)</div>
                      <div className="text-[10px] text-neutral-400">Cost: {COST_CANNON} Gold | Heavy defences | Ship Capacity: {maxCannonCapacity}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        value={trainCount.cannons} 
                        onChange={(e) => setTrainCount({...trainCount, cannons: Math.max(1, parseInt(e.target.value) || 0)})}
                        className="w-12 bg-slate-900 border border-neutral-700 text-center py-1 text-white rounded text-xs"
                      />
                      <button 
                        onClick={() => handleAction(() => onTrainUnit(selectedPort.id, 'cannons', trainCount.cannons))}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                      >
                        Construct
                      </button>
                    </div>
                  </div>

                  {/* Hire Scouts */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-neutral-950 rounded border border-neutral-800">
                    <div>
                      <div className="font-bold text-neutral-200">Infiltrators (Scouts)</div>
                      <div className="text-[10px] text-neutral-400">Cost: {COST_SCOUT} Gold | Upkeep: 2G/tick</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        value={trainCount.scout} 
                        onChange={(e) => setTrainCount({...trainCount, scout: Math.max(1, parseInt(e.target.value) || 0)})}
                        className="w-12 bg-slate-900 border border-neutral-700 text-center py-1 text-white rounded text-xs"
                      />
                      <button 
                        onClick={() => handleAction(() => onTrainUnit(selectedPort.id, 'scout', trainCount.scout))}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                      >
                        Hire
                      </button>
                    </div>
                  </div>

                  {/* Buy Governor */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-neutral-950 rounded border border-neutral-800">
                    <div>
                      <div className="font-bold text-neutral-200">Governor (Conquer Admin)</div>
                      <div className="text-[10px] text-yellow-500">
                        Cost: {getGovernorCost(playerPorts.length).toLocaleString()} Gold ({playerPorts.length} {playerPorts.length === 1 ? 'port' : 'ports'} owned)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="1" 
                        value={trainCount.governors} 
                        onChange={(e) => setTrainCount({...trainCount, governors: Math.max(1, parseInt(e.target.value) || 0)})}
                        className="w-12 bg-slate-900 border border-neutral-700 text-center py-1 text-white rounded text-xs"
                      />
                      <button 
                        onClick={() => handleAction(() => onTrainUnit(selectedPort.id, 'governors', trainCount.governors))}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                      >
                        Appoint
                      </button>
                    </div>
                  </div>

                  {/* Fortifications */}
                  <div className="flex items-center justify-between gap-3 p-2 bg-neutral-950 rounded border border-neutral-800">
                    <div>
                      <div className="font-bold text-neutral-200">Fortification Wall</div>
                      <div className="text-[10px] text-neutral-400">
                        {selectedPort.fortificationLevel >= 5 
                          ? 'Maxed Level 5' 
                          : `Cost: ${nextFortCost.goldCost}G & ${nextFortCost.goodsCost}W (Lvl ${selectedPort.fortificationLevel} → ${selectedPort.fortificationLevel + 1})`}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAction(() => onTrainUnit(selectedPort.id, 'fort', 1))}
                      disabled={selectedPort.fortificationLevel >= 5}
                      className="bg-teal-600 hover:bg-teal-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold px-2.5 py-1 rounded text-xs transition"
                    >
                      {selectedPort.fortificationLevel >= 5 ? 'Maxed' : 'Upgrade'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Shipyard construction */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-3">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1">
                    <Wrench className="w-4 h-4 text-teal-400" />
                    Shipyard (Construct Fleet)
                  </h3>
                  <div className="text-[10.5px] font-mono text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 self-start sm:self-auto">
                    📦 Harbor Fleet Cargo: {maxCargoCapacity.toLocaleString()} (Gold+Goods)
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-mono">
                  {(['sloop', 'schooner', 'frigate', 'galleon'] as const).map(shipKey => {
                    const cfg = SHIP_CONFIGS[shipKey];
                    return (
                      <div key={shipKey} className="flex flex-col gap-2 p-2.5 bg-neutral-950 rounded border border-neutral-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-200">{cfg.name}</span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1 bg-neutral-900 px-1.5 py-0.5 rounded">
                            ⚔️{cfg.combatPower} Power | Upkeep: {cfg.upkeepGold}G/t
                          </span>
                        </div>
                        <div className="text-[10.5px] text-neutral-300 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>🛡️ Crew: {cfg.crewCapacity}</span>
                          <span>⚔️ Cannons: {cfg.cannonCapacity}</span>
                          <span className="text-amber-400 font-semibold">📦 Cargo: {cfg.cargoCapacity.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-neutral-900 pt-2 mt-1 gap-2">
                          <span className="text-[10px] text-amber-500">Cost: {cfg.costGold}G / {cfg.costGoods}W</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              min="1" 
                              value={buildCount[shipKey]} 
                              onChange={(e) => setBuildCount({...buildCount, [shipKey]: Math.max(1, parseInt(e.target.value) || 0)})}
                              className="w-10 bg-slate-900 border border-neutral-700 text-center py-0.5 text-white rounded text-xs"
                            />
                            <button 
                              onClick={() => handleAction(() => onBuildShip(selectedPort.id, shipKey, buildCount[shipKey]))}
                              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-2.5 py-0.5 rounded text-xs transition"
                            >
                              Build
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Trade Routes & Alliance Pacts */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-yellow-500" />
                Alliance Trade Pacts & Non-Aggression Routes
              </h3>

              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 text-[11px] font-mono text-neutral-300 space-y-1.5 leading-relaxed">
                <p className="font-bold text-amber-400">🤝 Trade Agreements are Non-Aggression Alliances between Players!</p>
                <p className="text-neutral-400">
                  You can establish trade routes <strong>only with other captains</strong>. Propose a route from one of your ports to another captain's port. Once accepted, <strong>both captains receive recurring gold</strong> (+100G/t for Sloop, +250G/t for Schooner) and an <strong>automatic Non-Aggression Pact</strong> is sealed.
                </p>
                <p className="text-neutral-400 text-[10px]">
                  💡 <em>Strategy Tip:</em> Each port can send only <strong>1 outgoing trade fleet</strong> (though a port can receive multiple incoming trade routes from other Captains). Neither captain can launch attacks against each other while the trade pact is active. Placing a route under <strong>Trade Embargo</strong> (dissolving the trade route) seizes and <strong>steals the trading vessel for your own fleet</strong>!
                </p>
              </div>

              {/* Propose Trade Route Panel */}
              {(() => {
                const otherPlayerPorts = (Object.values(ports) as GamePort[]).filter(p => p.ownerId && p.ownerId !== player.id && p.ownerId !== 'npc');

                if (otherPlayerPorts.length === 0) {
                  return (
                    <div className="p-3 bg-neutral-950/40 rounded border border-neutral-800 text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>No other player ports found in the archipelago yet. Wait for other players to register or settle ports!</span>
                    </div>
                  );
                }

                const selectedPortSendingFleet = selectedPort && tradeRoutes.some(r => (r.proposerPortId || r.portAId) === selectedPort.id);

                return (
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 font-mono text-xs">
                    <div className="font-bold text-teal-400 text-[11px] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> PROPOSE NEW TRADE PACT
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">From (Your Port):</span>
                        <select
                          value={selectedPort?.id || ''}
                          onChange={(e) => onSelectPort(e.target.value)}
                          className="bg-slate-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                        >
                          {playerPorts.map(p => {
                            const isSending = tradeRoutes.some(r => (r.proposerPortId || r.portAId) === p.id);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} {isSending ? '(1/1 Outgoing Fleet Active)' : `(Sloop: ${p.sloop}, Schooner: ${p.schooner})`}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">To Partner Port:</span>
                        <select
                          value={tradeTargetPortId}
                          onChange={(e) => setTradeTargetPortId(e.target.value)}
                          className="bg-slate-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="">-- Choose Other Player Port --</option>
                          {otherPlayerPorts.map(p => {
                            const ownerName = players[p.ownerId]?.username || p.ownerName || 'Unknown Captain';
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} (Capt. {ownerName})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400">Ship:</span>
                        <select
                          value={tradeShipType}
                          onChange={(e) => setTradeShipType(e.target.value as any)}
                          className="bg-slate-900 border border-neutral-700 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="sloop">Sloop (+100 Gold/t to Both)</option>
                          <option value="schooner">Schooner (+250 Gold/t to Both)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (!selectedPort || !tradeTargetPortId || selectedPortSendingFleet) return;
                          handleAction(() => onEstablishTrade(selectedPort.id, tradeTargetPortId, tradeShipType));
                        }}
                        disabled={!selectedPort || !tradeTargetPortId || Boolean(selectedPortSendingFleet)}
                        className="bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 font-bold px-3 py-1 rounded text-xs text-white transition flex items-center gap-1"
                      >
                        Send Proposal
                      </button>
                    </div>

                    {selectedPortSendingFleet && (
                      <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1 bg-amber-950/40 p-2 rounded border border-amber-800/60">
                        <span>⚠️ {selectedPort.name} is already sending an outgoing trade fleet. Each port can send only 1 trade fleet (though it may receive multiple incoming trade routes).</span>
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Pending Incoming Trade Offers */}
              {(() => {
                const incomingOffers = tradeRoutes.filter(r => r.recipientPlayerId === player.id && r.status === 'pending');
                if (incomingOffers.length === 0) return null;

                return (
                  <div className="space-y-2 border-t border-amber-500/20 pt-3">
                    <h4 className="text-[10px] font-mono text-amber-400 font-bold tracking-wider flex items-center gap-1">
                      📩 INCOMING TRADE PROPOSALS ({incomingOffers.length})
                    </h4>
                    <div className="space-y-2">
                      {incomingOffers.map(route => {
                        const proposerPort = ports[route.proposerPortId || route.portAId];
                        const recipientPort = ports[route.recipientPortId || route.portBId];
                        const yieldGold = route.shipType === 'schooner' ? 250 : 100;

                        return (
                          <div key={route.id} className="flex flex-wrap items-center justify-between p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/30 text-xs font-mono gap-2">
                            <div className="space-y-0.5">
                              <div className="text-amber-300 font-bold flex items-center gap-1.5">
                                📜 Alliance Proposal from Captain {route.proposerPlayerName}
                              </div>
                              <div className="text-neutral-400 text-[11px]">
                                Route: {proposerPort ? proposerPort.name : route.proposerPortName} ── {recipientPort ? recipientPort.name : route.recipientPortName} ({route.shipType.toUpperCase()})
                              </div>
                              <div className="text-yellow-400 text-[10px] font-semibold">
                                Yields +{yieldGold} Gold/tick to both players & seals a Non-Aggression Pact
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {onAcceptTrade && (
                                <button
                                  onClick={() => handleAction(() => onAcceptTrade(route.id))}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-[11px] transition"
                                >
                                  Accept Pact
                                </button>
                              )}
                              {onDeclineTrade && (
                                <button
                                  onClick={() => handleAction(() => onDeclineTrade(route.id))}
                                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold px-2.5 py-1 rounded text-[11px] transition"
                                >
                                  Decline
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Pending Outgoing Trade Offers */}
              {(() => {
                const outgoingOffers = tradeRoutes.filter(r => (r.proposerPlayerId || r.ownerId) === player.id && r.status === 'pending');
                if (outgoingOffers.length === 0) return null;

                return (
                  <div className="space-y-2 border-t border-neutral-800 pt-3">
                    <h4 className="text-[10px] font-mono text-neutral-400 font-bold tracking-wider flex items-center gap-1">
                      📤 OUTGOING PROPOSALS AWAITING RESPONSE ({outgoingOffers.length})
                    </h4>
                    <div className="space-y-2">
                      {outgoingOffers.map(route => {
                        return (
                          <div key={route.id} className="flex items-center justify-between p-2 bg-neutral-950/60 rounded border border-neutral-850 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold">⏳ PENDING</span>
                              <span className="text-neutral-300">Sent to Capt. {route.recipientPlayerName} ({route.proposerPortName} ── {route.recipientPortName})</span>
                            </div>
                            <button
                              onClick={() => handleAction(() => onCancelTrade(route.id))}
                              className="text-neutral-400 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded text-[10px] border border-neutral-800 transition"
                            >
                              Withdraw Proposal
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Active Alliance Trade Routes Directory */}
              {(() => {
                const activePacts = tradeRoutes.filter(r => 
                  (r.status === 'active' || r.active) && 
                  ((r.proposerPlayerId || r.ownerId) === player.id || r.recipientPlayerId === player.id)
                );

                return (
                  <div className="space-y-2 border-t border-neutral-800 pt-3">
                    <h4 className="text-[10px] font-mono text-neutral-400 font-bold tracking-wider flex items-center justify-between">
                      <span>ACTIVE ALLIANCE TRADE PACTS ({activePacts.length})</span>
                      <span className="text-[9px] text-teal-400">🛡️ NON-AGGRESSION RESTRICTION IN EFFECT</span>
                    </h4>

                    {activePacts.length === 0 ? (
                      <p className="text-neutral-500 text-[11px] font-mono italic">No commercial alliance pacts are currently active.</p>
                    ) : (
                      <div className="space-y-2">
                        {activePacts.map(route => {
                          const partnerName = (route.proposerPlayerId || route.ownerId) === player.id ? route.recipientPlayerName : route.proposerPlayerName;
                          const portA = ports[route.proposerPortId || route.portAId];
                          const portB = ports[route.recipientPortId || route.portBId];
                          const bonus = route.shipType === 'schooner' ? 250 : 100;

                          return (
                            <div key={route.id} className="flex flex-wrap items-center justify-between p-2.5 bg-neutral-950 rounded-xl border border-teal-500/30 text-xs font-mono gap-2">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-teal-400 font-bold">⛵ {route.shipType.toUpperCase()}</span>
                                  <span className="text-neutral-200 font-bold">Alliance with Capt. {partnerName}</span>
                                </div>
                                <div className="text-neutral-400 text-[11px]">
                                  {portA ? portA.name : route.proposerPortName} ── {portB ? portB.name : route.recipientPortName}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-yellow-400 font-bold">+{bonus} Gold/Tick</span>
                                <button
                                  onClick={() => handleAction(() => onCancelTrade(route.id))}
                                  className="text-red-400 hover:text-white hover:bg-red-600/80 px-2.5 py-1 bg-red-950/40 rounded border border-red-500/30 transition text-[10px] font-bold"
                                  title="Break Agreement, Enact Embargo & Steal Trading Vessel"
                                >
                                  EMBARGO & STEAL SHIP
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
