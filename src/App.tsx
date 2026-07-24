import { useState, useEffect, useMemo } from 'react';
import { Auth } from './components/Auth.tsx';
import { HexMap } from './components/HexMap.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Military } from './components/Military.tsx';
import { Leaderboard } from './components/Leaderboard.tsx';
import { Forum } from './components/Forum.tsx';
import { GameGuide } from './components/GameGuide.tsx';
import { GameState, Player, GamePort, SHIP_CONFIGS, UPKEEP_TROOP, UPKEEP_SCOUT } from './types.ts';
import { FlagSymbol } from './components/FlagSymbol.tsx';
import logoImg from './assets/logo.jpg';
import { 
  Anchor, 
  Map as MapIcon, 
  DollarSign, 
  ShieldCheck, 
  Clock, 
  LogOut, 
  Compass, 
  TrendingUp, 
  Skull, 
  Swords, 
  Newspaper,
  MessageSquare
} from 'lucide-react';

// Helper to format duration beautifully in Finnish or clear UI
const formatDuration = (ms: number) => {
  if (ms <= 0) return '0s';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / (24 * 3600));
  const hours = Math.floor((totalSecs % (24 * 3600)) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  
  let parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
};

// Countdown clock format
const formatCountdown = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('piracy_token'));
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'economy' | 'military' | 'ranks' | 'forum'>('map');
  const [loading, setLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Time-to-next-tick state
  const [secondsToNextTick, setSecondsToNextTick] = useState<number>(0);

  // Track last seen forum message count
  const [lastSeenForumCount, setLastSeenForumCount] = useState<number>(() => {
    const saved = localStorage.getItem('piracy_last_seen_forum');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Calculate total forum messages (posts + replies + direct messages)
  const totalForumCount = useMemo(() => {
    if (!gameState) return 0;
    const forumPosts = gameState.forum || [];
    const postsAndReplies = forumPosts.reduce((acc, p) => acc + 1 + (p.replies ? p.replies.length : 0), 0);
    const dms = gameState.directMessages || [];
    const playerDMs = player ? dms.filter(m => m.senderId === player.id || m.receiverId === player.id) : dms;
    return postsAndReplies + playerDMs.length;
  }, [gameState, player]);

  const unreadForumCount = Math.max(0, totalForumCount - lastSeenForumCount);

  // Clear unread indicator when user views the 'forum' tab
  useEffect(() => {
    if (activeTab === 'forum' && totalForumCount !== lastSeenForumCount) {
      setLastSeenForumCount(totalForumCount);
      localStorage.setItem('piracy_last_seen_forum', totalForumCount.toString());
    }
  }, [activeTab, totalForumCount, lastSeenForumCount]);

  // Helper to safely parse JSON responses or throw meaningful error
  const parseJsonResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch (e) {
        throw new Error(`Virheellinen JSON-vastaus palvelimelta (${res.status})`);
      }
    }
    throw new Error(`Palvelinvirhe (${res.status}): ${res.statusText || 'Ei JSON-vastausta'}`);
  };

  // Poll full game state
  const fetchGameState = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/game/state', { headers });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn('fetchGameState received non-JSON response:', contentType);
          return;
        }
        const data: GameState = await res.json();
        setGameState(data);
        
        // Update current player object if authenticated
        if (token && data.players[token]) {
          setPlayer(data.players[token]);
        }
      }
    } catch (e) {
      console.error('Error fetching game state:', e);
    }
  };

  // Fetch current player profile
  const fetchMyProfile = async (sessionToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setPlayer(data);
      } else {
        // Clear stale session
        handleLogout();
      }
    } catch (e) {
      console.error('Profile fetch failed:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchGameState();
      if (token) {
        await fetchMyProfile(token);
      }
      setLoading(false);
    };
    init();

    // Setup polling every 4 seconds
    const interval = setInterval(fetchGameState, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Ticking Countdown effect
  useEffect(() => {
    if (!gameState) return;

    const calculateCountdown = () => {
      const now = new Date().getTime();
      const lastTick = new Date(gameState.lastTickTime).getTime();
      const durationMs = gameState.tickSpeedMode === 'fast' ? 30000 : 15 * 60 * 1000;
      const elapsed = now - lastTick;
      const remainingMs = Math.max(0, durationMs - elapsed);
      setSecondsToNextTick(Math.ceil(remainingMs / 1000));
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const handleRegister = async (username: string, email: string, password: string, flagId: number, flagColor: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, flagId, flagColor })
    });
    
    if (res.ok) {
      const data = await parseJsonResponse(res);
      localStorage.setItem('piracy_token', data.token);
      setToken(data.token);
      setPlayer(data.player);
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Registration failed!');
    }
  };

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await parseJsonResponse(res);
      localStorage.setItem('piracy_token', data.token);
      setToken(data.token);
      setPlayer(data.player);
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Sign in failed!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('piracy_token');
    setToken(null);
    setPlayer(null);
    setSelectedPortId(null);
  };

  // Commands API proxy handlers (attaches auth headers automatically)
  const handleTrainUnit = async (portId: string, type: string, count: number) => {
    const res = await fetch('/api/game/train', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ portId, type, count })
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Recruitment failed');
    }
    await fetchGameState();
  };

  const handleBuildShip = async (portId: string, shipSize: string, count: number) => {
    const res = await fetch('/api/game/build', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ portId, shipSize, count })
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Shipbuilding failed');
    }
    await fetchGameState();
  };

  const handleEstablishTrade = async (portAId: string, portBId: string, shipType: 'sloop' | 'schooner') => {
    const res = await fetch('/api/game/trade', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ portAId, portBId, shipType })
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Trade lane establishment failed');
    }
    await fetchGameState();
  };

  const handleCancelTrade = async (routeId: string) => {
    const res = await fetch('/api/game/trade/cancel', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ routeId })
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Route cancellation failed');
    }
    await fetchGameState();
  };

  const handleLaunchAttack = async (payload: any) => {
    const res = await fetch('/api/game/attack', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Armada deployment failed');
    }
    await fetchGameState();
  };

  const handleLaunchScout = async (originPortId: string, targetPortId: string) => {
    const res = await fetch('/api/game/scout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ originPortId, targetPortId })
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Scout deployment failed');
    }
    await fetchGameState();
  };

  const handleLaunchTransfer = async (payload: any) => {
    const res = await fetch('/api/game/transfer', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Transfer dispatch failed');
    }
    await fetchGameState();
  };

  // Sandbox overrides (Admin Protected)
  const handleManualTick = async (adminKey?: string) => {
    const key = adminKey || localStorage.getItem('piracy_admin_key') || '';
    const res = await fetch('/api/game/dev-tick', { 
      method: 'POST',
      headers: { 'x-admin-key': key }
    });
    if (res.ok) {
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Tikityksen ajaminen epäonnistui');
    }
  };

  const handleChangeSpeed = async (mode: 'normal' | 'fast' | 'debug', adminKey?: string) => {
    const key = adminKey || localStorage.getItem('piracy_admin_key') || '';
    const res = await fetch('/api/game/dev-speed', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': key 
      },
      body: JSON.stringify({ mode })
    });
    if (res.ok) {
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Nopeuden muutos epäonnistui');
    }
  };

  const handleRestartNPCs = async (adminKey?: string) => {
    const key = adminKey || localStorage.getItem('piracy_admin_key') || '';
    const res = await fetch('/api/game/restart-npcs', { 
      method: 'POST',
      headers: { 'x-admin-key': key }
    });
    if (res.ok) {
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'NPC-alueiden nollaus epäonnistui');
    }
  };

  const handleTogglePause = async (pause: boolean, adminKey?: string) => {
    const key = adminKey || localStorage.getItem('piracy_admin_key') || '';
    const res = await fetch('/api/game/dev-pause', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-key': key 
      },
      body: JSON.stringify({ pause })
    });
    if (res.ok) {
      await fetchGameState();
    } else {
      const err = await parseJsonResponse(res).catch(e => ({ error: e.message }));
      throw new Error(err.error || 'Pelin tauotus epäonnistui');
    }
  };

  const handleRestoreState = (newState: GameState) => {
    setGameState(newState);
    if (token && newState.players[token]) {
      setPlayer(newState.players[token]);
    }
  };

  // Helper counting player owned ports
  const ownedPorts = gameState 
    ? (Object.values(gameState.ports) as GamePort[]).filter(p => p.ownerId === (player ? player.id : ''))
    : [];

  // Calculate Net Gold and Net Goods income in real-time for UI display
  const netIncome = useMemo(() => {
    if (!gameState || !player) return { netGold: 0, netGoods: 0, upkeepGold: 0, grossGold: 0 };

    let grossGold = 0;
    let grossGoods = 0;
    let upkeepGold = 0;

    // Calculate production of owned ports
    const ownedPortsList = (Object.values(gameState.ports) as GamePort[]).filter(p => p.ownerId === player.id);
    ownedPortsList.forEach(port => {
      let multiplier = 1.0;
      if (port.razedTicksRemaining > 24) {
        multiplier = 1 / 3;
      } else if (port.razedTicksRemaining > 0) {
        multiplier = 2 / 3;
      }
      grossGold += Math.floor(port.baseGoldProduction * multiplier);
      grossGoods += Math.floor(port.baseGoodsProduction * multiplier);

      // Stationed upkeeps
      upkeepGold += (port.troops || 0) * UPKEEP_TROOP;
      upkeepGold += (port.scoutCount || 0) * UPKEEP_SCOUT;
      upkeepGold += (port.sloop || 0) * SHIP_CONFIGS.sloop.upkeepGold;
      upkeepGold += (port.schooner || 0) * SHIP_CONFIGS.schooner.upkeepGold;
      upkeepGold += (port.frigate || 0) * SHIP_CONFIGS.frigate.upkeepGold;
      upkeepGold += (port.galleon || 0) * SHIP_CONFIGS.galleon.upkeepGold;
    });

    // Upkeeps for fleets in transit
    const playerCampaigns = (gameState.campaigns || []).filter(c => c.senderId === player.id);
    playerCampaigns.forEach(c => {
      upkeepGold += (c.troops || 0) * UPKEEP_TROOP;
      upkeepGold += (c.sloop || 0) * SHIP_CONFIGS.sloop.upkeepGold;
      upkeepGold += (c.schooner || 0) * SHIP_CONFIGS.schooner.upkeepGold;
      upkeepGold += (c.frigate || 0) * SHIP_CONFIGS.frigate.upkeepGold;
      upkeepGold += (c.galleon || 0) * SHIP_CONFIGS.galleon.upkeepGold;
    });

    // Trade routes gold production
    const playerTradeRoutes = (gameState.tradeRoutes || []).filter(r => r.active && r.ownerId === player.id);
    playerTradeRoutes.forEach(r => {
      const tradeBonus = r.shipType === 'schooner' ? 150 : 60;
      grossGold += tradeBonus;
    });

    const netGold = grossGold - upkeepGold;
    return { netGold, netGoods: grossGoods, upkeepGold, grossGold };
  }, [gameState, player]);

  const elapsedPlayTime = useMemo(() => {
    if (!gameState || !gameState.gameStartTime) return '0s';
    const start = new Date(gameState.gameStartTime).getTime();
    const elapsedMs = Math.max(0, Date.now() - start);
    return formatDuration(elapsedMs);
  }, [gameState, secondsToNextTick]);

  const remainingRoundTime = useMemo(() => {
    if (!gameState) return '0s';
    const tickDurationSecs = gameState.tickSpeedMode === 'fast' 
      ? 30 
      : gameState.tickSpeedMode === 'debug'
        ? 5 * 60
        : 15 * 60;
    const remainingTicks = Math.max(0, (gameState.roundLimitTicks || 1000) - gameState.currentTick);
    const totalSecs = (remainingTicks - 1) * tickDurationSecs + secondsToNextTick;
    return formatDuration(Math.max(0, totalSecs * 1000));
  }, [gameState, secondsToNextTick]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-rose-500 font-mono gap-3">
        <Anchor className="w-12 h-12 animate-spin text-rose-500" />
        <span className="text-sm tracking-widest text-neutral-400">SAILING THE GAME ENGINE SEAS...</span>
      </div>
    );
  }

  if (!token || !player) {
    return <Auth onRegister={handleRegister} onLogin={handleLogin} players={gameState?.players} />;
  }

  // Percent progress bar for ticks
  const tickDurationSeconds = gameState?.tickSpeedMode === 'fast' 
    ? 30 
    : gameState?.tickSpeedMode === 'debug'
      ? 5 * 60
      : 15 * 60;
  const tickProgressPercent = Math.min(
    100,
    ((tickDurationSeconds - secondsToNextTick) / tickDurationSeconds) * 100
  );

  return (
    <div className="min-h-screen bg-slate-950 text-neutral-200 font-sans selection:bg-rose-500/30 flex flex-col p-4 md:p-6 gap-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
      
      {/* GLOBAL HUD / NAVBAR */}
      <header className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-2xl relative overflow-hidden max-w-7xl w-full mx-auto backdrop-blur-md">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo and Flag */}
          <div className="flex items-center gap-3">
            <img 
              src={logoImg} 
              alt="Piracy Lunacy Logo" 
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full border border-rose-500/30 shadow-lg bg-slate-950 p-0.5 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <FlagSymbol flagId={player.flagId} color={player.flagColor} size="md" />
            <div>
              <h1 className="text-lg font-black tracking-widest text-slate-100 flex items-center gap-2">
                PIRACY LUNACY
                <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded font-mono font-bold">
                  BETA v1.0
                </span>
              </h1>
              <p className="text-[11px] font-mono text-neutral-400">
                Commanding Pirate Lord: <strong className="text-white">{player.username}</strong>
              </p>
            </div>
          </div>

          {/* Real-time Ticking HUD */}
          <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-2.5 rounded-2xl border border-slate-800/80 flex-1 lg:flex-initial max-w-sm">
            {gameState?.isPaused ? (
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                <div className="font-mono">
                  <div className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">ENGINE PAUSED</div>
                  <div className="text-[9px] text-neutral-400 font-bold mt-0.5">DEVELOPER MAINTENANCE</div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-left font-mono flex-shrink-0">
                  <div className="text-[9px] text-neutral-500 tracking-wider font-bold">T-MINUS TICK</div>
                  <div className="text-sm font-bold text-amber-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
                    {formatCountdown(secondsToNextTick)}
                  </div>
                </div>

                {/* Countdown progress bar */}
                <div className="flex-1 space-y-1">
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${tickProgressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-neutral-500 font-bold">
                    <span>Tick {gameState?.currentTick}</span>
                    <span>{gameState?.tickSpeedMode === 'fast' ? '30s speed' : '15m interval'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Real-time Game Round Clock */}
          {gameState && (
            <div className="flex items-center gap-4 bg-slate-950/60 px-4 py-2.5 rounded-2xl border border-slate-800/80 flex-1 lg:flex-initial font-mono">
              <div className="text-left flex-shrink-0">
                <div className="text-[9px] text-neutral-500 tracking-wider font-bold uppercase">GAME TIME ELAPSED</div>
                <div className="text-xs font-bold text-teal-400 mt-1">{elapsedPlayTime}</div>
              </div>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div className="text-left flex-shrink-0">
                <div className="text-[9px] text-neutral-500 tracking-wider font-bold uppercase">TIME REMAINING</div>
                <div className="text-xs font-bold text-rose-400 mt-1">{remainingRoundTime}</div>
              </div>
            </div>
          )}

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-mono font-bold px-4 py-2 rounded-2xl border border-amber-500/30 text-xs transition"
            >
              <Compass className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              Game Manual & Guide
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 text-neutral-300 font-mono font-bold px-4 py-2 rounded-2xl border border-slate-800 text-xs transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              Desert (Logout)
            </button>
          </div>

        </div>
      </header>

      {/* MAIN BENTO LAYOUT BLOCK */}
      <div className="max-w-7xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Sleek vertical tab sidebar + general stats widget */}
        <aside className="lg:col-span-3 space-y-6">
          
          {/* Navigation Tab Menu */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-2">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2 pb-2 border-b border-slate-800/80 mb-2">
              Navigation Log
            </div>
            
            <button
              onClick={() => setActiveTab('map')}
              className={`w-full py-3 px-4 font-mono font-bold text-xs tracking-wider transition-all rounded-2xl flex items-center gap-3 ${
                activeTab === 'map' 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-white shadow-lg' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              <MapIcon className="w-4 h-4 text-rose-500" /> Naval Map
            </button>

            <button
              onClick={() => setActiveTab('economy')}
              className={`w-full py-3 px-4 font-mono font-bold text-xs tracking-wider transition-all rounded-2xl flex items-center gap-3 ${
                activeTab === 'economy' 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-white shadow-lg' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-rose-500" /> Dockyards & Commerce
            </button>

            <button
              onClick={() => setActiveTab('military')}
              className={`w-full py-3 px-4 font-mono font-bold text-xs tracking-wider transition-all rounded-2xl flex items-center gap-3 ${
                activeTab === 'military' 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-white shadow-lg' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              <Swords className="w-4 h-4 text-rose-500" /> Armada & Campaigns
            </button>

            <button
              onClick={() => setActiveTab('ranks')}
              className={`w-full py-3 px-4 font-mono font-bold text-xs tracking-wider transition-all rounded-2xl flex items-center gap-3 ${
                activeTab === 'ranks' 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-white shadow-lg' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              <Newspaper className="w-4 h-4 text-rose-500" /> Wire & Sandbox
            </button>

            <button
              onClick={() => setActiveTab('forum')}
              className={`w-full py-3 px-4 font-mono font-bold text-xs tracking-wider transition-all rounded-2xl flex items-center justify-between gap-2 ${
                activeTab === 'forum' 
                  ? 'bg-rose-500/10 border border-rose-500/30 text-white shadow-lg' 
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 truncate">
                <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="truncate">Tavern & Council</span>
              </div>

              {totalForumCount > 0 && (
                unreadForumCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold flex-shrink-0 animate-pulse">
                    {totalForumCount} ({unreadForumCount} uutta)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-normal flex-shrink-0">
                    ({totalForumCount})
                  </span>
                )
              )}
            </button>
          </div>

          {/* Quick HUD stats card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest pb-2 border-b border-slate-800/80">
              Pirate Metrics
            </div>

            <div className="grid grid-cols-2 gap-3.5 font-mono text-xs">
              <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-neutral-500 text-[9px] font-bold">REPUTATION</div>
                  <div className="text-sm font-bold text-amber-500 mt-1">{player.score.toLocaleString()} pts</div>
                </div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-neutral-500 text-[9px] font-bold">GOLD</div>
                  <div className="text-sm font-bold text-yellow-500 mt-1">{player.gold.toLocaleString()} G</div>
                </div>
                {gameState && (
                  <div className="border-t border-slate-900 mt-1.5 pt-1">
                    <div className={`text-[10px] font-bold ${netIncome.netGold >= 0 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                      {netIncome.netGold >= 0 ? '+' : ''}{netIncome.netGold.toLocaleString()} /tick
                    </div>
                    <div className="text-[8px] text-neutral-500 font-mono mt-0.5 leading-none">
                      ({netIncome.grossGold}G gross - {netIncome.upkeepGold}G upkeep)
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-neutral-500 text-[9px] font-bold">CARGO/WOOD</div>
                  <div className="text-sm font-bold text-teal-400 mt-1">{player.goods.toLocaleString()} W</div>
                </div>
                {gameState && (
                  <div className="text-[10px] text-teal-400 font-bold mt-1.5 pt-1 border-t border-slate-900">
                    +{netIncome.netGoods.toLocaleString()} /tick
                  </div>
                )}
              </div>
              <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="text-neutral-500 text-[9px] font-bold">PORTS HELD</div>
                  <div className="text-sm font-bold text-rose-500 mt-1">{ownedPorts.length}</div>
                </div>
              </div>
            </div>
          </div>

        </aside>

        {/* RIGHT COLUMN: Active tab views */}
        <main className="lg:col-span-9 w-full">
          {gameState && (
            <>
              {activeTab === 'map' && (
                <div className="space-y-6">
                  <HexMap
                    ports={gameState.ports}
                    players={gameState.players}
                    currentPlayerId={player.id}
                    selectedPortId={selectedPortId}
                    onSelectPort={setSelectedPortId}
                    activeCampaigns={gameState.campaigns}
                  />
                  
                  {/* Map Selected Quick HUD */}
                  {selectedPortId && gameState.ports[selectedPortId] && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-2xl">
                      <div>
                        <span className="text-neutral-400">Selected Island:</span>{' '}
                        <strong className="text-amber-400 text-sm font-sans">{gameState.ports[selectedPortId].name}</strong>{' '}
                        <span className="text-neutral-500">
                          ({gameState.ports[selectedPortId].ownerId === player.id ? 'You control this island' : `Owned by ${gameState.ports[selectedPortId].ownerName}`})
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveTab('economy')}
                          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold px-4 py-1.5 rounded-xl transition"
                        >
                          Manage Infrastructure
                        </button>
                        <button
                          onClick={() => setActiveTab('military')}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-1.5 rounded-xl transition"
                        >
                          Deploy Fleet Commands
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'economy' && (
                <Dashboard
                  player={player}
                  ports={gameState.ports}
                  tradeRoutes={gameState.tradeRoutes}
                  onBuildShip={handleBuildShip}
                  onTrainUnit={handleTrainUnit}
                  onEstablishTrade={handleEstablishTrade}
                  onCancelTrade={handleCancelTrade}
                  selectedPortId={selectedPortId}
                  onSelectPort={setSelectedPortId}
                />
              )}

              {activeTab === 'military' && (
                <Military
                  player={player}
                  ports={gameState.ports}
                  campaigns={gameState.campaigns}
                  scoutReports={gameState.scoutReports}
                  onLaunchAttack={handleLaunchAttack}
                  onLaunchScout={handleLaunchScout}
                  onLaunchTransfer={handleLaunchTransfer}
                  selectedPortId={selectedPortId}
                  onSelectPort={setSelectedPortId}
                />
              )}

              {activeTab === 'ranks' && (
                <Leaderboard
                  players={gameState.players}
                  news={gameState.news}
                  currentTick={gameState.currentTick}
                  lastTickTime={gameState.lastTickTime}
                  tickSpeedMode={gameState.tickSpeedMode}
                  onManualTick={handleManualTick}
                  onChangeSpeed={handleChangeSpeed}
                  onRestartNPCs={handleRestartNPCs}
                  currentPlayerId={player.id}
                  isPaused={gameState.isPaused || false}
                  onTogglePause={handleTogglePause}
                  onRestoreState={handleRestoreState}
                  gameStateFull={gameState}
                />
              )}

              {activeTab === 'forum' && (
                <Forum
                  player={player}
                  gameState={gameState}
                  onFetchState={fetchGameState}
                  token={token}
                />
              )}
            </>
          )}
        </main>

      </div>

      <GameGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* FOOTER */}
      <footer className="bg-transparent border-t border-slate-800/80 py-6 text-center text-[10px] font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <div>Piracy Lunacy © 2026 • Swiss Modern Bento Grid Edition.</div>
          <div>All communications in this sector are broadcast securely. Rule the waves or sink to Davy Jones' Locker.</div>
        </div>
      </footer>

    </div>
  );
}
