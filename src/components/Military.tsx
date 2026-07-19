import React, { useState, useMemo } from 'react';
import { GamePort, Player, SHIP_CONFIGS, FleetCampaign, ScoutReport } from '../types.ts';
import { 
  Swords, 
  Compass, 
  ShieldAlert, 
  Users, 
  Anchor, 
  Search, 
  TrendingUp, 
  Clock, 
  Skull, 
  MapPin,
  Flame,
  Coins,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface MilitaryProps {
  player: Player;
  ports: Record<string, GamePort>;
  campaigns: FleetCampaign[];
  scoutReports: ScoutReport[];
  onLaunchAttack: (payload: any) => Promise<void>;
  onLaunchScout: (originPortId: string, targetPortId: string) => Promise<void>;
  onLaunchTransfer: (payload: any) => Promise<void>;
  selectedPortId: string | null;
  onSelectPort: (portId: string) => void;
}

export const Military: React.FC<MilitaryProps> = ({
  player,
  ports,
  campaigns,
  scoutReports,
  onLaunchAttack,
  onLaunchScout,
  onLaunchTransfer,
  selectedPortId,
  onSelectPort,
}) => {
  // Attack form states
  const [activeMode, setActiveMode] = useState<'campaign' | 'transfer'>('campaign');
  const [transferTargetPortId, setTransferTargetPortId] = useState<string>('');
  const [targetPortId, setTargetPortId] = useState<string>('');
  const [attackType, setAttackType] = useState<'attack_conquer' | 'attack_loot' | 'attack_raze'>('attack_loot');
  
  const [sloopToSend, setSloopToSend] = useState<number>(0);
  const [schoonerToSend, setSchoonerToSend] = useState<number>(0);
  const [frigateToSend, setFrigateToSend] = useState<number>(0);
  const [galleonToSend, setGalleonToSend] = useState<number>(0);
  
  const [troopsToSend, setTroopsToSend] = useState<number>(0);
  const [cannonsToSend, setCannonsToSend] = useState<number>(0);
  const [govsToSend, setGovsToSend] = useState<number>(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search target filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  const departurePort = selectedPortId ? ports[selectedPortId] : null;
  const isDepartureOwned = departurePort && departurePort.ownerId === player.id;

  // Player owned ports for fast selection
  const playerPorts = (Object.values(ports) as GamePort[]).filter(p => p.ownerId === player.id);

  // Candidate attack targets (everyone except departure port)
  const candidateTargets = useMemo(() => {
    return (Object.values(ports) as GamePort[])
      .filter(p => p.id !== selectedPortId)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [ports, selectedPortId, searchQuery]);

  // Owned destination ports for transfers
  const myOtherPorts = useMemo(() => {
    return (Object.values(ports) as GamePort[])
      .filter(p => p.ownerId === player.id && p.id !== selectedPortId);
  }, [ports, selectedPortId, player.id]);

  // Selected Target Port Details
  const targetPort = targetPortId ? ports[targetPortId] : null;

  // Find latest scout report for targetPortId to display intelligence briefing
  const latestReportForTarget = useMemo(() => {
    if (!targetPortId) return null;
    const reports = scoutReports.filter(r => r.targetPortId === targetPortId);
    if (reports.length === 0) return null;
    return [...reports].sort((a, b) => b.scoutTick - a.scoutTick)[0];
  }, [scoutReports, targetPortId]);

  // Carrying capacity math
  const capacities = useMemo(() => {
    const s = Math.floor(sloopToSend) || 0;
    const sc = Math.floor(schoonerToSend) || 0;
    const f = Math.floor(frigateToSend) || 0;
    const g = Math.floor(galleonToSend) || 0;

    const crewCap = (s * SHIP_CONFIGS.sloop.crewCapacity) +
                    (sc * SHIP_CONFIGS.schooner.crewCapacity) +
                    (f * SHIP_CONFIGS.frigate.crewCapacity) +
                    (g * SHIP_CONFIGS.galleon.crewCapacity);

    const cannonCap = (s * SHIP_CONFIGS.sloop.cannonCapacity) +
                      (sc * SHIP_CONFIGS.schooner.cannonCapacity) +
                      (f * SHIP_CONFIGS.frigate.cannonCapacity) +
                      (g * SHIP_CONFIGS.galleon.cannonCapacity);

    // Fleet Combat power: Ships + Crew (3 each) + Cannons (8 each)
    const combatPower = (s * SHIP_CONFIGS.sloop.combatPower) +
                        (sc * SHIP_CONFIGS.schooner.combatPower) +
                        (f * SHIP_CONFIGS.frigate.combatPower) +
                        (g * SHIP_CONFIGS.galleon.combatPower) +
                        (troopsToSend * 3) +
                        (cannonsToSend * 8);

    return { crewCap, cannonCap, combatPower };
  }, [sloopToSend, schoonerToSend, frigateToSend, galleonToSend, troopsToSend, cannonsToSend]);

  // Handle setting all available resources to send
  const handleSelectAllForces = () => {
    if (!departurePort) return;
    setSloopToSend(departurePort.sloop);
    setSchoonerToSend(departurePort.schooner);
    setFrigateToSend(departurePort.frigate);
    setGalleonToSend(departurePort.galleon);
    
    // Automatically match max capacities
    const maxCrew = (departurePort.sloop * SHIP_CONFIGS.sloop.crewCapacity) +
                    (departurePort.schooner * SHIP_CONFIGS.schooner.crewCapacity) +
                    (departurePort.frigate * SHIP_CONFIGS.frigate.crewCapacity) +
                    (departurePort.galleon * SHIP_CONFIGS.galleon.crewCapacity);
                    
    const maxCannons = (departurePort.sloop * SHIP_CONFIGS.sloop.cannonCapacity) +
                       (departurePort.schooner * SHIP_CONFIGS.schooner.cannonCapacity) +
                       (departurePort.frigate * SHIP_CONFIGS.frigate.cannonCapacity) +
                       (departurePort.galleon * SHIP_CONFIGS.galleon.cannonCapacity);

    setTroopsToSend(Math.min(departurePort.troops, maxCrew));
    setCannonsToSend(Math.min(departurePort.cannons, maxCannons));
    setGovsToSend(departurePort.governors);
  };

  const handleAction = async (actionFn: () => Promise<void>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await actionFn();
      setSuccessMsg('Captain, the sails have been hoisted and the campaign is underway!');
      // Reset sending fields
      setSloopToSend(0);
      setSchoonerToSend(0);
      setFrigateToSend(0);
      setGalleonToSend(0);
      setTroopsToSend(0);
      setCannonsToSend(0);
      setGovsToSend(0);
    } catch (e: any) {
      setErrorMsg(e.message || 'Mission failed to launch!');
    }
  };

  // Filter campaigns involving the current player
  const playerCampaigns = campaigns.filter(c => c.senderId === player.id);

  return (
    <div className="space-y-6">
      {/* Active Port Selector for Quick Switching */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
          <Anchor className="w-4 h-4 text-rose-500" />
          Select Active Departure Port ({playerPorts.length} Held)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {playerPorts.map(p => {
            const isSelected = selectedPortId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPort(p.id)}
                className={`p-3 rounded-2xl border text-left font-mono transition-all duration-200 flex flex-col justify-between h-20 relative overflow-hidden ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-lg shadow-rose-500/5'
                    : 'bg-slate-950 border-slate-800 text-neutral-400 hover:border-slate-700 hover:text-neutral-200'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 rounded-bl-full flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 translate-x-1 -translate-y-1" />
                  </div>
                )}
                <div className="text-xs font-bold truncate pr-6">{p.name}</div>
                <div className="flex justify-between items-center text-[9px] text-neutral-500 mt-2 w-full">
                  <span>⛵ Sloop: {p.sloop}</span>
                  <span>🛡️ Crew: {p.troops}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Launch Campaign Form */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Error / Success messages */}
        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-200 font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-teal-950/50 border border-teal-500/40 rounded-lg text-xs text-teal-200 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Selected Departure Port Context */}
        {!departurePort ? (
          <div className="bg-slate-900/50 border border-dashed border-neutral-800 rounded-xl p-12 text-center">
            <Anchor className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400 text-xs font-mono">Select one of your ports on the map or select below to launch a campaign.</p>
            <div className="mt-4 flex justify-center gap-2 max-w-sm mx-auto">
              <select
                onChange={(e) => onSelectPort(e.target.value)}
                className="bg-slate-900 border border-neutral-700 text-white rounded px-3 py-1.5 text-xs w-full font-mono"
              >
                <option value="">-- Select Departure Port --</option>
                {playerPorts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (🛡️{p.troops} Crew)</option>
                ))}
              </select>
            </div>
          </div>
        ) : !isDepartureOwned ? (
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs font-mono text-amber-300">
            <MapPin className="w-4 h-4 text-amber-400 mb-1" />
            <span>You selected <strong>{departurePort.name}</strong>, which is not your port! Please choose one of your own ports as a departure base for campaigns.</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-6">
            
            {/* Mode selection tabs */}
            <div className="flex border-b border-slate-800/80 -mx-5 -mt-5 mb-5 rounded-t-3xl overflow-hidden bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('campaign');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-center text-xs font-bold uppercase transition ${
                  activeMode === 'campaign'
                    ? 'bg-rose-950/20 text-rose-400 border-b-2 border-rose-500'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                ⚔️ LAUNCH ARMADA
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('transfer');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-3 text-center text-xs font-bold uppercase transition ${
                  activeMode === 'transfer'
                    ? 'bg-blue-950/20 text-blue-400 border-b-2 border-blue-500'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                ⛵ SHIP TRANSFER
              </button>
            </div>

            {/* Header departure info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                  <Swords className="w-4.5 h-4.5 text-rose-500" />
                  Departure Base: {departurePort.name.toUpperCase()}
                </h3>
                <p className="text-[10px] font-mono text-neutral-400">Available: ⛵{departurePort.sloop} Sloop | ⛵{departurePort.schooner} Sch | 🛡️{departurePort.troops} Crew | ⚔️{departurePort.cannons} Cannons</p>
              </div>
              
              <button
                onClick={handleSelectAllForces}
                className="bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[10px] font-mono font-bold px-2.5 py-1 rounded border border-neutral-700 transition"
              >
                Draft All Available Forces
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Target Selector */}
              <div className="space-y-4 font-mono text-xs">
                {activeMode === 'campaign' ? (
                  <div>
                    <label className="block text-neutral-400 font-bold mb-1.5">1. SELECT TARGET PORT / ISLAND</label>
                    
                    {/* Search query input */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Search island name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-neutral-800 rounded pl-8 pr-3 py-1 text-white text-xs"
                      />
                    </div>

                    <select
                      value={targetPortId}
                      onChange={(e) => setTargetPortId(e.target.value)}
                      className="w-full bg-slate-950 border border-neutral-800 text-white rounded p-2 text-xs"
                    >
                      <option value="">-- Choose Target Destination --</option>
                      {candidateTargets.map(p => {
                        const isEnemy = p.ownerId && p.ownerId !== player.id;
                        const ownerStr = p.ownerId ? `(${p.ownerName})` : '(Independent)';
                        return (
                          <option key={p.id} value={p.id}>{p.name} {ownerStr}</option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-neutral-400 font-bold mb-1.5">1. SELECT DESTINATION PORT (OWNED)</label>
                    <select
                      value={transferTargetPortId}
                      onChange={(e) => setTransferTargetPortId(e.target.value)}
                      className="w-full bg-slate-950 border border-neutral-800 text-white rounded p-2 text-xs"
                    >
                      <option value="">-- Choose Owned Target Port --</option>
                      {myOtherPorts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (🛡️{p.troops} Crew)</option>
                      ))}
                    </select>
                    <p className="mt-2 text-[9.5px] text-neutral-400 leading-normal">
                      Transfer voyages are completely safe. Ships and cargo will be routed through friendly channels and integrated into the target port's garrison upon arrival. Takes 4 ticks.
                    </p>
                  </div>
                )}

                {/* Campaign type */}
                {activeMode === 'campaign' && (
                  <div>
                    <label className="block text-neutral-400 font-bold mb-1.5">2. SELECT MISSION TYPE</label>
                    <div className="grid grid-cols-3 gap-2">
                      
                      <button
                        type="button"
                        onClick={() => setAttackType('attack_loot')}
                        className={`p-2.5 rounded border text-center transition flex flex-col items-center justify-center gap-1 ${
                          attackType === 'attack_loot'
                            ? 'bg-yellow-600/10 border-yellow-500/60 text-yellow-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Loot & Plunder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttackType('attack_conquer')}
                        className={`p-2.5 rounded border text-center transition flex flex-col items-center justify-center gap-1 ${
                          attackType === 'attack_conquer'
                            ? 'bg-rose-600/10 border-rose-500/60 text-rose-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Skull className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Conquer Port</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttackType('attack_raze')}
                        className={`p-2.5 rounded border text-center transition flex flex-col items-center justify-center gap-1 ${
                          attackType === 'attack_raze'
                            ? 'bg-orange-600/10 border-orange-500/60 text-orange-400'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Raze & Cripple</span>
                      </button>

                    </div>

                    {/* Context rules indicator */}
                    <div className="mt-2 text-[9.5px] text-neutral-400 leading-normal">
                      {attackType === 'attack_loot' && 'Looting steals up to 40% of enemy gold and goods. Requires Offence > Defence.'}
                      {attackType === 'attack_conquer' && 'Conquering transfers port ownership to you permanently. Consumes 1 Governor. Requires Offence >= 3x Defence.'}
                      {attackType === 'attack_raze' && 'Razing inflicts massive troop losses and reduces target port production by 2/3 for 48 ticks. Requires Offence > Defence.'}
                    </div>
                  </div>
                )}

                {/* Scouting options quick launch */}
                {activeMode === 'campaign' && targetPort && (
                  <div className="p-3 bg-neutral-950 rounded border border-neutral-800 space-y-2 mt-4">
                    <div className="text-[10.5px] font-bold text-teal-400">DEPLOY SPY SLOOP (SCOUT)</div>
                    <p className="text-[9.5px] text-neutral-400">
                      Dispatches a fast stealth vessel to report target port structures, ships, and defense forces. Takes 1 tick to arrive and 1 tick to return.
                    </p>
                    <button
                      type="button"
                      disabled={departurePort.sloop < 1}
                      onClick={() => handleAction(() => onLaunchScout(departurePort.id, targetPortId))}
                      className={`w-full text-[10px] font-bold py-1.5 px-2 rounded border transition ${
                        departurePort.sloop >= 1
                          ? 'bg-teal-950/20 text-teal-400 border-teal-500/30 hover:bg-teal-900/30'
                          : 'bg-neutral-950 text-neutral-600 border-neutral-900 cursor-not-allowed'
                      }`}
                    >
                      {departurePort.sloop < 1 
                        ? 'Requires 1 Sloop' 
                        : 'Hoist Stealth Sails (Deploy Scout)'}
                    </button>
                  </div>
                )}

              </div>

              {/* Fleet composition */}
              <div className="space-y-4 font-mono text-xs">
                <label className="block text-neutral-400 font-bold">3. COMPOSE COMBAT FLEET</label>
                
                {/* Ship inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">SLOOP (Max {departurePort.sloop})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.sloop}
                      value={sloopToSend}
                      onChange={(e) => setSloopToSend(Math.min(departurePort.sloop, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-sm outline-none mt-1"
                    />
                  </div>
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">SCHOONER (Max {departurePort.schooner})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.schooner}
                      value={schoonerToSend}
                      onChange={(e) => setSchoonerToSend(Math.min(departurePort.schooner, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-sm outline-none mt-1"
                    />
                  </div>
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">FRIGATE (Max {departurePort.frigate})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.frigate}
                      value={frigateToSend}
                      onChange={(e) => setFrigateToSend(Math.min(departurePort.frigate, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-sm outline-none mt-1"
                    />
                  </div>
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">GALLEON (Max {departurePort.galleon})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.galleon}
                      value={galleonToSend}
                      onChange={(e) => setGalleonToSend(Math.min(departurePort.galleon, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-sm outline-none mt-1"
                    />
                  </div>
                </div>

                {/* Troop inputs */}
                <div className="grid grid-cols-3 gap-2 border-t border-neutral-800 pt-3">
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[9px] block">Crew (Max {departurePort.troops})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.troops}
                      value={troopsToSend}
                      onChange={(e) => setTroopsToSend(Math.min(departurePort.troops, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-xs outline-none mt-1"
                    />
                  </div>
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[9px] block">Cannons ({departurePort.cannons})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.cannons}
                      value={cannonsToSend}
                      onChange={(e) => setCannonsToSend(Math.min(departurePort.cannons, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-xs outline-none mt-1"
                    />
                  </div>
                  <div className="p-2 bg-neutral-950 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[9px] block">Govs ({departurePort.governors})</span>
                    <input
                      type="number"
                      min="0"
                      max={departurePort.governors}
                      value={govsToSend}
                      onChange={(e) => setGovsToSend(Math.min(departurePort.governors, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full bg-transparent text-white font-bold text-xs outline-none mt-1"
                    />
                  </div>
                </div>

                {/* Fleet Statistics / Limits Display */}
                <div className="p-3 bg-neutral-950 rounded border border-neutral-850 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Fleet Combat Power:</span>
                    <span className="text-rose-400 font-bold">{capacities.combatPower} Power</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 pl-2 space-y-0.5 border-l border-rose-500/30 font-mono">
                    <div>• Ships: {((Math.floor(sloopToSend) || 0) * SHIP_CONFIGS.sloop.combatPower) + ((Math.floor(schoonerToSend) || 0) * SHIP_CONFIGS.schooner.combatPower) + ((Math.floor(frigateToSend) || 0) * SHIP_CONFIGS.frigate.combatPower) + ((Math.floor(galleonToSend) || 0) * SHIP_CONFIGS.galleon.combatPower)} Power</div>
                    <div>• Crew: {troopsToSend * 3} Power (⚔️3 each)</div>
                    <div>• Cannons: {cannonsToSend * 8} Power (⚔️8 each)</div>
                  </div>
                  <div className="flex justify-between border-t border-neutral-900 pt-1.5 mt-1.5">
                    <span className="text-neutral-400">Crew Carriage Capacity:</span>
                    <span className={`font-bold ${troopsToSend + govsToSend > capacities.crewCap ? 'text-red-400' : 'text-green-400'}`}>
                      {troopsToSend + govsToSend} / {capacities.crewCap}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cannon Carriage Capacity:</span>
                    <span className={`font-bold ${cannonsToSend > capacities.cannonCap ? 'text-red-400' : 'text-green-400'}`}>
                      {cannonsToSend} / {capacities.cannonCap}
                    </span>
                  </div>
                </div>

                {/* Live Target Intelligence Briefing & Victory Forecast */}
                {targetPort && (() => {
                  const defenseShipPower = (targetPort.sloop * 10) +
                                           (targetPort.schooner * 30) +
                                           (targetPort.frigate * 80) +
                                           (targetPort.galleon * 200);
                  const garrisonPower = (targetPort.troops * 3) + (targetPort.cannons * 8);
                  const fortPower = targetPort.fortificationLevel * 40;
                  const liveDefensePower = defenseShipPower + garrisonPower + fortPower;

                  let reqPower = 0;
                  let isSufficient = false;
                  let missionLabel = "";
                  let explanation = "";

                  if (attackType === 'attack_conquer') {
                    reqPower = liveDefensePower * 3;
                    isSufficient = capacities.combatPower >= reqPower;
                    missionLabel = "CONQUER PORT";
                    explanation = `Requires 3x defensive strength (>= ${reqPower} Power) to successfully capture.`;
                  } else {
                    reqPower = liveDefensePower + 1;
                    isSufficient = capacities.combatPower > liveDefensePower;
                    missionLabel = attackType === 'attack_loot' ? "LOOT & PLUNDER" : "RAZE & CRIPPLE";
                    explanation = `Requires strictly greater strength (> ${liveDefensePower} Power) to succeed.`;
                  }

                  return (
                    <div className="p-3 bg-neutral-950 rounded border border-neutral-850 space-y-3.5 text-[11px] font-mono">
                      <div className="flex justify-between items-center border-b border-neutral-900 pb-1.5">
                        <span className="font-bold text-teal-400 flex items-center gap-1">
                          📡 TARGET DEFENCE: {targetPort.name}
                        </span>
                        <span className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          {liveDefensePower} Power
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-y-1 text-[10px] text-neutral-300">
                        <div>🛡️ Defending Crew:</div>
                        <div className="text-right text-neutral-100 font-bold">{targetPort.troops}</div>

                        <div>⚔️ Cannons:</div>
                        <div className="text-right text-neutral-100 font-bold">{targetPort.cannons}</div>

                        <div>★ Fortification:</div>
                        <div className="text-right text-pink-400 font-bold">Level {targetPort.fortificationLevel}</div>

                        <div>⛵ Defence Ships:</div>
                        <div className="text-right text-neutral-100">
                          {targetPort.sloop + targetPort.schooner + targetPort.frigate + targetPort.galleon} ({targetPort.sloop} sl / {targetPort.schooner} sch / {targetPort.frigate} fr / {targetPort.galleon} gl)
                        </div>
                      </div>

                      <div className="border-t border-neutral-900 pt-2 space-y-2">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-400">Total Defending Power:</span>
                          <span className="text-neutral-200 font-bold">{liveDefensePower} Power</span>
                        </div>
                        <div className="text-[9px] text-neutral-500 pl-2 space-y-0.5 border-l border-neutral-850">
                          <div>• Ships: {defenseShipPower} Power</div>
                          <div>• Garrison: {garrisonPower} Power</div>
                          <div>• Fortification: +{fortPower} Power</div>
                        </div>
                      </div>

                      <div className="border-t border-neutral-900 pt-2.5 space-y-1.5">
                        <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{missionLabel} CHANCE FORECAST:</div>
                        <p className="text-[9.5px] text-neutral-500 leading-tight mb-1">{explanation}</p>
                        
                        {capacities.combatPower === 0 ? (
                          <div className="text-neutral-400 italic text-[10px] pt-0.5">
                            Composing fleet...
                          </div>
                        ) : isSufficient ? (
                          <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 p-2 rounded font-bold text-[10px] flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-emerald-400">🟢 100% SUCCESS CHANCE FORECASTED</span>
                            <span className="text-[9px] font-normal text-emerald-400/80">Your armada has {capacities.combatPower} Power vs {liveDefensePower} Defence Power (Needs {reqPower} Power).</span>
                          </div>
                        ) : (
                          <div className="bg-red-950/20 text-red-400 border border-red-500/20 p-2 rounded font-bold text-[10px] flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-red-400">🔴 HIGH DANGER: INSUFFICIENT FORCE!</span>
                            <span className="text-[9px] font-normal text-red-400/80">Your armada has {capacities.combatPower} Power. Need at least {reqPower - capacities.combatPower} more combat power to succeed.</span>
                          </div>
                        )}
                      </div>

                      {latestReportForTarget ? (
                        <div className="border-t border-dashed border-neutral-900 pt-2 text-[9.5px] text-neutral-400">
                          📡 <span className="font-bold text-teal-400">Active Scout Intel available!</span> Historical report shows target details from Tick {latestReportForTarget.scoutTick}. Check intelligence logs below for active outgoing fleets.
                        </div>
                      ) : (
                        <div className="border-t border-dashed border-neutral-900 pt-2 text-[9.5px] text-amber-500/90 leading-normal">
                          ⚠️ No recent spy scout intelligence reports exist on {targetPort.name}. You are launching blind with no insight into their scheduled outgoing fleets or historical logs!
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* Launch button */}
            <div className="border-t border-neutral-800 pt-4 flex justify-end">
              {activeMode === 'campaign' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!targetPortId) {
                      setErrorMsg('You must select an island destination target, Captain!');
                      return;
                    }
                    const totalShips = sloopToSend + schoonerToSend + frigateToSend + galleonToSend;
                    if (totalShips === 0) {
                      setErrorMsg('You cannot launch an armada without ships! Select at least one ship.');
                      return;
                    }
                    if (troopsToSend + govsToSend > capacities.crewCap) {
                      setErrorMsg('Your fleet is over-capacitated! Add more ships or reduce crew to launch.');
                      return;
                    }
                    if (cannonsToSend > capacities.cannonCap) {
                      setErrorMsg('Too many cannons loaded! Select larger ships or reduce cannons.');
                      return;
                    }
                    if (attackType === 'attack_conquer' && govsToSend < 1) {
                      setErrorMsg('Conquering requires deploying at least 1 Governor on the expedition!');
                      return;
                    }

                    handleAction(() => onLaunchAttack({
                      originPortId: departurePort.id,
                      targetPortId,
                      type: attackType,
                      sloop: sloopToSend,
                      schooner: schoonerToSend,
                      frigate: frigateToSend,
                      galleon: galleonToSend,
                      troops: troopsToSend,
                      cannons: cannonsToSend,
                      governors: govsToSend
                    }));
                  }}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 font-bold px-6 py-2.5 rounded text-xs text-white shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Swords className="w-4 h-4 animate-pulse" />
                  HOIST THE BLACK FLAG (LAUNCH FLEET)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!transferTargetPortId) {
                      setErrorMsg('You must select an owned port destination for transfer!');
                      return;
                    }
                    const totalShips = sloopToSend + schoonerToSend + frigateToSend + galleonToSend;
                    if (totalShips === 0) {
                      setErrorMsg('You cannot sail a transfer convoy without ships! Select at least one ship.');
                      return;
                    }
                    if (troopsToSend + govsToSend > capacities.crewCap) {
                      setErrorMsg('Your fleet is over-capacitated! Add more ships or reduce crew.');
                      return;
                    }
                    if (cannonsToSend > capacities.cannonCap) {
                      setErrorMsg('Too many cannons loaded! Select larger ships or reduce cannons.');
                      return;
                    }

                    handleAction(() => onLaunchTransfer({
                      originPortId: departurePort.id,
                      targetPortId: transferTargetPortId,
                      sloop: sloopToSend,
                      schooner: schoonerToSend,
                      frigate: frigateToSend,
                      galleon: galleonToSend,
                      troops: troopsToSend,
                      cannons: cannonsToSend,
                      governors: govsToSend
                    }));
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 font-bold px-6 py-2.5 rounded text-xs text-white shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Anchor className="w-4 h-4 animate-pulse" />
                  DISPATCH TRANSFER CONVOY
                </button>
              )}
            </div>

          </div>
        )}

        {/* Active Outgoing Campaigns and Inbound Threats */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-rose-500" />
            Your Flight Log & Campaigns ({playerCampaigns.length})
          </h3>

          {playerCampaigns.length === 0 ? (
            <p className="text-neutral-500 text-xs font-mono italic">No fleets are currently deployed on expeditions.</p>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {playerCampaigns.map(camp => {
                const totalShips = camp.sloop + camp.schooner + camp.frigate + camp.galleon;
                
                // Color tags based on type
                let tagColor = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
                let actionLabel = 'Looting';
                if (camp.type === 'attack_conquer') {
                  tagColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                  actionLabel = 'Conquest';
                } else if (camp.type === 'attack_raze') {
                  tagColor = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
                  actionLabel = 'Razing';
                } else if (camp.type === 'scout') {
                  tagColor = 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
                  actionLabel = 'Scouting';
                } else if (camp.type === 'transfer') {
                  tagColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                  actionLabel = 'Transfer';
                }

                return (
                  <div key={camp.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${tagColor}`}>
                          {actionLabel.toUpperCase()}
                        </span>
                        <span className="text-neutral-200 font-bold">{camp.originPortName} ──&gt; {camp.targetPortName}</span>
                      </div>
                      
                      <div className="text-[10px] text-neutral-400 flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        <Clock className="w-3 h-3 text-rose-400" />
                        <span>Status: <span className="text-neutral-100 font-bold">{camp.status.toUpperCase()}</span> ({camp.ticksRemaining} Ticks Left)</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-neutral-900 pt-2">
                      <div>Ships: <span className="text-neutral-100 font-bold">{totalShips}</span></div>
                      <div>Crew: <span className="text-neutral-100 font-bold">{camp.troops}</span></div>
                      <div>Cannons: <span className="text-neutral-100 font-bold">{camp.cannons}</span></div>
                      {camp.governors > 0 && <div>Governors: <span className="text-yellow-500 font-bold">{camp.governors}</span></div>}
                    </div>

                    {camp.outcome && (
                      <div className="mt-2 p-2 bg-slate-900 rounded border border-neutral-800 text-[10.5px] text-amber-300">
                        {camp.outcome}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Spies and Scout Reports */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Spy Reports Directory */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-teal-400 animate-spin-slow" />
            Scout Blueprints & Intel
          </h3>

          <p className="text-[11px] font-mono text-neutral-400">
            Reports generated by your covert scouts detailing defenses, fortifications, and scheduled incoming/outgoing fleets at spied targets.
          </p>

          {scoutReports.length === 0 ? (
            <div className="p-4 bg-neutral-950/60 rounded border border-neutral-800 text-center text-xs text-neutral-500 font-mono">
              No intelligence reports available yet, Captain. Deploy some spies!
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {scoutReports.slice().reverse().map(rep => {
                const totalShips = rep.sloop + rep.schooner + rep.frigate + rep.galleon;
                
                // Calculate combat power values
                const defenseShipPower = (rep.sloop * 10) +
                                         (rep.schooner * 30) +
                                         (rep.frigate * 80) +
                                         (rep.galleon * 200);
                const garrisonPower = (rep.troops * 3) + (rep.cannons * 8);
                const fortPower = rep.fortificationLevel * 40;
                const totalDefensePower = defenseShipPower + garrisonPower + fortPower;

                return (
                  <div key={rep.id} className="p-3 bg-neutral-950 rounded border border-neutral-800 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-neutral-850 pb-1">
                      <span className="font-bold text-amber-400">{rep.targetPortName}</span>
                      <span className="text-[9px] text-neutral-400">Tick {rep.scoutTick} Intel</span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 text-[10.5px] text-neutral-300">
                      <div>🛡️ Defending Crew:</div>
                      <div className="text-right text-neutral-100 font-bold">{rep.troops}</div>
                      
                      <div>⚔️ Cannons:</div>
                      <div className="text-right text-neutral-100 font-bold">{rep.cannons}</div>

                      <div>★ Fortification:</div>
                      <div className="text-right text-pink-400">Level {rep.fortificationLevel}</div>
                      
                      <div>⛵ Defense Ships:</div>
                      <div className="text-right text-neutral-100">{totalShips} ({rep.sloop} sl / {rep.schooner} sch / {rep.frigate} fr / {rep.galleon} gl)</div>

                      {rep.gold !== undefined && (
                        <>
                          <div>💰 Scouted Gold:</div>
                          <div className="text-right text-yellow-400 font-bold">{rep.gold.toLocaleString()} G</div>
                        </>
                      )}

                      {rep.goods !== undefined && (
                        <>
                          <div>📦 Scouted Goods:</div>
                          <div className="text-right text-teal-400 font-bold">{rep.goods.toLocaleString()}</div>
                        </>
                      )}
                    </div>

                    {/* Combat Strength Breakdown */}
                    <div className="border-t border-dashed border-neutral-800/80 pt-2 mt-1 space-y-1">
                      <div className="flex justify-between items-center bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                          🛡️ Total Defense Power
                        </span>
                        <span className="text-rose-400 font-extrabold text-xs">
                          {totalDefensePower} Power
                        </span>
                      </div>
                      <div className="text-[9px] text-neutral-400 pl-2 space-y-0.5 border-l border-neutral-800 font-mono">
                        <div className="flex justify-between"><span>• Ship Battle Power:</span> <span className="text-neutral-300">{defenseShipPower}</span></div>
                        <div className="flex justify-between"><span>• Garrison (Crew + Cannons):</span> <span className="text-neutral-300">{garrisonPower}</span></div>
                        <div className="flex justify-between"><span>• Fortification Buffer:</span> <span className="text-neutral-300">+{fortPower}</span></div>
                      </div>
                    </div>

                    {/* Live fleet attack comparison */}
                    {capacities.combatPower > 0 && (
                      <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800 space-y-1.5 mt-2">
                        <div className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider">⚔️ FLEET SIMULATION EVALUATION</div>
                        <div className="text-[9.5px] text-neutral-300 space-y-1">
                          <div className="flex justify-between items-center">
                            <span>Your Attack Power:</span>
                            <span className="text-rose-400 font-bold">{capacities.combatPower} Power</span>
                          </div>
                          
                          <div className="border-t border-neutral-800 pt-1 space-y-1 font-sans">
                            {/* Conquer Chance */}
                            <div className="flex justify-between text-[9px]">
                              <span className="font-mono text-neutral-400">Conquer (Needs {totalDefensePower * 3} Power):</span>
                              {capacities.combatPower >= totalDefensePower * 3 ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-0.5">🟢 100% Success</span>
                              ) : (
                                <span className="text-red-400 font-bold">🔴 Fail (Need {totalDefensePower * 3 - capacities.combatPower} more)</span>
                              )}
                            </div>

                            {/* Loot/Raze Chance */}
                            <div className="flex justify-between text-[9px]">
                              <span className="font-mono text-neutral-400">Loot/Raze (Needs {totalDefensePower + 1} Power):</span>
                              {capacities.combatPower > totalDefensePower ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-0.5">🟢 100% Success</span>
                              ) : (
                                <span className="text-red-400 font-bold">🔴 Fail (Need {totalDefensePower + 1 - capacities.combatPower} more)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {rep.activeFleets && rep.activeFleets.length > 0 && (
                      <div className="border-t border-neutral-850 pt-1.5 mt-1.5 space-y-1">
                        <div className="text-[9.5px] text-red-400 font-bold">SPOTTED FLEETS IN TRANSIT:</div>
                        {rep.activeFleets.map((fl, fIdx) => (
                          <div key={fIdx} className="text-[9.5px] text-neutral-400 flex justify-between bg-neutral-900 p-1 rounded">
                            <span>{fl.type.toUpperCase()} ({fl.status})</span>
                            <span className="text-neutral-200">to {fl.destination} (in {fl.ticksRemaining}t)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
    </div>
  );
};
