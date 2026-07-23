import React, { useState, useMemo, useEffect } from 'react';
import { Player, NewsItem } from '../types.ts';
import { FlagSymbol } from './FlagSymbol.tsx';
import { 
  Trophy, 
  Newspaper, 
  Swords, 
  Settings, 
  HelpCircle, 
  DollarSign, 
  Anchor, 
  Clock, 
  Wrench,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Play,
  Pause,
  Download,
  Upload,
  AlertTriangle,
  Lock,
  Unlock,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

interface LeaderboardProps {
  players: Record<string, Player>;
  news: NewsItem[];
  currentTick: number;
  lastTickTime: string;
  tickSpeedMode: 'normal' | 'fast' | 'debug';
  onManualTick: (adminKey?: string) => Promise<void>;
  onChangeSpeed: (mode: 'normal' | 'fast' | 'debug', adminKey?: string) => Promise<void>;
  onRestartNPCs: (adminKey?: string) => Promise<void>;
  currentPlayerId: string | null;
  isPaused: boolean;
  onTogglePause: (pause: boolean, adminKey?: string) => Promise<void>;
  onRestoreState: (state: any) => void;
  gameStateFull: any;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  news,
  currentTick,
  lastTickTime,
  tickSpeedMode,
  onManualTick,
  onChangeSpeed,
  onRestartNPCs,
  currentPlayerId,
  isPaused,
  onTogglePause,
  onRestoreState,
  gameStateFull,
}) => {
  const [devModeExpanded, setDevModeExpanded] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [newsTab, setNewsTab] = useState<'global' | 'personal' | 'history'>('global');
  const [fullHistory, setFullHistory] = useState<NewsItem[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Admin passcode authentication state
  const [adminPasscode, setAdminPasscode] = useState(() => localStorage.getItem('piracy_admin_key') || '');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Verify saved admin passcode on initial load if present
  useEffect(() => {
    const savedKey = localStorage.getItem('piracy_admin_key');
    if (savedKey) {
      verifyAdminKey(savedKey, true);
    }
  }, []);

  const verifyAdminKey = async (keyToTest: string, isSilent = false) => {
    if (!keyToTest) return;
    setIsVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/game/admin-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': keyToTest
        }
      });
      if (res.ok) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('piracy_admin_key', keyToTest);
        if (!isSilent) {
          setSuccessMsg('🔓 Ylläpitäjän tila avattu onnistuneesti!');
          setTimeout(() => setSuccessMsg(null), 3500);
        }
      } else {
        setIsAdminAuthenticated(false);
        if (!isSilent) {
          setAuthError('Virheellinen ylläpitäjän salasana!');
        }
      }
    } catch (e) {
      if (!isSilent) setAuthError('Yhteysvirhe salasanaa vahvistettaessa.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Rank players by score
  const rankedPlayers = (Object.values(players) as Player[]).sort((a, b) => b.score - a.score);

  const fetchFullHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/game/history');
      if (res.ok) {
        const data = await res.json();
        setFullHistory(data);
        setNewsTab('history');
      }
    } catch (e) {
      console.error('Failed to fetch full round history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Filter news for current player if personal log tab is active
  const filteredNews = useMemo(() => {
    if (newsTab === 'history') {
      return fullHistory || news;
    }
    if (newsTab === 'global') {
      return news;
    }
    return news.filter(item => 
      item.senderPlayerId === currentPlayerId || 
      item.targetPlayerId === currentPlayerId
    );
  }, [news, newsTab, currentPlayerId, fullHistory]);

  const handleDevTick = async () => {
    setSuccessMsg(null);
    try {
      await onManualTick(adminPasscode);
      setSuccessMsg('Suoritettiin +1 pelitiki onnistuneesti!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Tikityksen ajo epäonnistui');
    }
  };

  const handleDevSpeed = async (mode: 'normal' | 'fast' | 'debug') => {
    setSuccessMsg(null);
    try {
      await onChangeSpeed(mode, adminPasscode);
      let speedText = '15 minuuttia (Normaali)';
      if (mode === 'fast') speedText = '30 sekuntia (Nopea testaus)';
      if (mode === 'debug') speedText = '5 minuuttia (Debug/Testaus)';
      setSuccessMsg(`Tikitysväliksi asetettu ${speedText}`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e: any) {
      alert(e.message || 'Nopeuden muutos epäonnistui');
    }
  };

  const handleRestartNPCsAction = async () => {
    setSuccessMsg(null);
    try {
      await onRestartNPCs(adminPasscode);
      setSuccessMsg('NPC-faktiot re-starrattu! Kaikki NPC-satamat nollattu heikommin vartioiduiksi.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      alert(e.message || 'NPC-faktioiden nollaus epäonnistui');
    }
  };

  const handleTogglePauseAction = async () => {
    setSuccessMsg(null);
    try {
      const nextPaused = !isPaused;
      await onTogglePause(nextPaused, adminPasscode);
      setSuccessMsg(nextPaused 
        ? '🚨 Pelin tikitys ja tietokantasynkronointi TAUOTETTU.' 
        : '🟢 Pelin tikitys ja tietokantasynkronointi JATKUU!'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Pelin tauotus epäonnistui');
    }
  };

  const handleResetRoundAction = async () => {
    if (!confirm('VAROITUS: Haluatko varmasti nollata koko pelikierroksen? Kaikki saaret ja laivastot luodaan uudelleen, mutta pelaajatilit säilytetään.')) {
      return;
    }
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/game/dev-reset-round', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminPasscode
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMsg('🔄 Pelikierros nollattu onnistuneesti!');
        onRestoreState(data.state);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const err = await res.json();
        alert(`Kierroksen nollaus epäonnistui: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Virhe nollattaessa kierrosta: ${e.message}`);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameStateFull, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `piracy_lunacy_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccessMsg('💾 Pelitilanteen varmuuskopio ladattu JSON-tiedostona!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Varmuuskopion luonti epäonnistui.');
    }
  };

  const handleUploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.ports || !parsed.players) {
          throw new Error('Virheellinen backup-muoto! Puuttuu players tai ports.');
        }
        
        const res = await fetch('/api/game/dev-restore', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': adminPasscode
          },
          body: JSON.stringify({ backupData: parsed })
        });
        
        if (res.ok) {
          const data = await res.json();
          setSuccessMsg('🎉 Pelitilanne palautettu onnistuneesti varmuuskopiosta!');
          onRestoreState(data.state);
          setTimeout(() => setSuccessMsg(null), 5000);
        } else {
          const err = await res.json();
          alert(`Palautus epäonnistui: ${err.error}`);
        }
      } catch (err) {
        alert(`Virheellinen varmuuskopiotiedosto: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  };


  const getNewsIcon = (type: string) => {
    switch (type) {
      case 'battle':
        return <Swords className="w-3.5 h-3.5 text-red-400" />;
      case 'conquest':
        return <Anchor className="w-3.5 h-3.5 text-rose-500" />;
      case 'loot':
        return <DollarSign className="w-3.5 h-3.5 text-yellow-500" />;
      case 'raze':
        return <span className="text-orange-500">🔥</span>;
      default:
        return <Newspaper className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Ranks & Scoreboard */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" />
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Pirate Leaderboard</h3>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {rankedPlayers.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              const rank = idx + 1;
              let medal = '';
              if (rank === 1) medal = '🥇';
              else if (rank === 2) medal = '🥈';
              else if (rank === 3) medal = '🥉';

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-mono transition-colors ${
                    isMe
                      ? 'bg-rose-500/10 border-rose-500/40 text-white font-bold'
                      : 'bg-neutral-950 border-neutral-850 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 text-center font-bold text-neutral-500 text-sm">
                      {medal || rank}
                    </span>
                    <FlagSymbol flagId={p.flagId} color={p.flagColor} size="sm" />
                    <span className="truncate max-w-[120px] text-neutral-200">
                      {p.username} {isMe && <span className="text-[10px] text-rose-400 font-bold">(You)</span>}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-amber-400">{p.score.toLocaleString()} pts</div>
                    <div className="text-[9px] text-neutral-400">
                      💰{p.gold.toLocaleString()}G
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Game Rules Help Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-rose-500" />
            Rules of the Waters
          </h4>

          <ul className="text-[10.5px] font-mono text-neutral-400 space-y-2 list-none p-0 m-0">
            <li className="flex items-start gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span><strong>Ticks:</strong> Runs every 15 mins (or 30s in Dev Mode). Resources accumulate and armies charge upkeeps.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span><strong>Campaign Duration:</strong> All attacks take exactly 11 ticks total (4 to move, 3 battling, 4 returning home).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span><strong>Scouting:</strong> Fast 6-tick spy voyage. Reveals garrisons, fortifications, and timed flight schedules at enemy ports.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
              <span><strong>Bankruptcy:</strong> Keep enough gold in your treasury! Empty gold causes pay cuts, leading to 20% crew desertions every tick.</span>
            </li>
          </ul>
        </div>

        {/* Admin / Developer Box (Password Protected) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setDevModeExpanded(!devModeExpanded)}>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-xs font-black uppercase text-amber-400 tracking-widest flex items-center gap-1.5">
                  Ylläpitäjän Ohjauspaneeli
                  {isAdminAuthenticated ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-rose-400" />}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Salasanalla suojattu admin-hallinta</p>
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-amber-400 hover:text-amber-300 font-mono underline bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
            >
              {devModeExpanded ? 'Piilota ▲' : 'Avaa ▼'}
            </button>
          </div>

          {devModeExpanded && (
            <div className="pt-3 border-t border-slate-800/80 space-y-4">
              {/* Success Notification Message */}
              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {!isAdminAuthenticated ? (
                /* Unauthenticated Password Input Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    verifyAdminKey(adminPasscode);
                  }}
                  className="space-y-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800"
                >
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-mono">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>Syötä ylläpitäjän salasana:</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Admin-salasana..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying || !adminPasscode.trim()}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isVerifying ? 'TARKISTETAAN...' : 'AVAA'}
                    </button>
                  </div>

                  {authError && (
                    <div className="text-rose-400 text-[11px] font-mono flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 font-mono">
                    Oletussalasana: <code className="text-amber-400/90 bg-slate-900 px-1 py-0.5 rounded">pirate-admin-1234</code> (voidaan vaihtaa muuttujalla <code>ADMIN_SECRET</code>).
                  </p>
                </form>
              ) : (
                /* Authenticated Admin Controls */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Ylläpitäjä tunnistettu
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminAuthenticated(false);
                        localStorage.removeItem('piracy_admin_key');
                        setAdminPasscode('');
                      }}
                      className="text-slate-400 hover:text-rose-400 underline text-[10px] cursor-pointer"
                    >
                      Lukitse paneeli
                    </button>
                  </div>

                  {/* Dev Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                    {/* Manual Tick */}
                    <button
                      type="button"
                      onClick={handleDevTick}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      Aja +1 Tikitys
                    </button>

                    {/* Pause Toggle */}
                    <button
                      type="button"
                      onClick={handleTogglePauseAction}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition cursor-pointer ${
                        isPaused
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      {isPaused ? 'Jatka peliä' : 'Tauota peli'}
                    </button>

                    {/* Re-seed NPCs */}
                    <button
                      type="button"
                      onClick={handleRestartNPCsAction}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      Nollaa NPC-alueet
                    </button>

                    {/* Download Backup */}
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      Lataa Backup
                    </button>
                  </div>

                  {/* Tick Speed Selector */}
                  <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Tikitysväli (Nopeus):
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-[10.5px] font-mono">
                      <button
                        type="button"
                        onClick={() => handleDevSpeed('normal')}
                        className={`py-1.5 px-2 rounded-lg border transition cursor-pointer ${
                          tickSpeedMode === 'normal'
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        15m (Normi)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDevSpeed('debug')}
                        className={`py-1.5 px-2 rounded-lg border transition cursor-pointer ${
                          tickSpeedMode === 'debug'
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        5m (Debug)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDevSpeed('fast')}
                        className={`py-1.5 px-2 rounded-lg border transition cursor-pointer ${
                          tickSpeedMode === 'fast'
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        30s (Nopea)
                      </button>
                    </div>
                  </div>

                  {/* Restore Backup & Reset Round */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      Palauta varmuuskopio
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleUploadBackup}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleResetRoundAction}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      Nollaa Kierros
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Global & Personal News Feed & Developer Tools */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Global & Personal News Ticker */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col h-[340px] lg:h-[450px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex gap-2.5 items-center flex-wrap">
              <button
                type="button"
                onClick={() => setNewsTab('global')}
                className={`text-[10.5px] font-black uppercase tracking-widest pb-1 border-b-2 transition ${
                  newsTab === 'global'
                    ? 'text-rose-400 border-rose-500'
                    : 'text-slate-500 border-transparent hover:text-slate-400'
                }`}
              >
                GLOBAL NEWS
              </button>
              <button
                type="button"
                onClick={() => setNewsTab('personal')}
                className={`text-[10.5px] font-black uppercase tracking-widest pb-1 border-b-2 transition ${
                  newsTab === 'personal'
                    ? 'text-teal-400 border-teal-500'
                    : 'text-slate-500 border-transparent hover:text-slate-400'
                }`}
              >
                PERSONAL LOG
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!fullHistory) {
                    fetchFullHistory();
                  } else {
                    setNewsTab('history');
                  }
                }}
                disabled={isLoadingHistory}
                className={`text-[10.5px] font-black uppercase tracking-widest pb-1 border-b-2 transition flex items-center gap-1 ${
                  newsTab === 'history'
                    ? 'text-amber-400 border-amber-500'
                    : 'text-amber-500/70 border-transparent hover:text-amber-400'
                }`}
              >
                {isLoadingHistory ? 'LADATAAN...' : 'KOKO KROONIKKA'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {newsTab === 'history' && fullHistory && (
                <a
                  href="/api/game/history"
                  target="_blank"
                  rel="noreferrer"
                  download="round_history.json"
                  className="text-[9px] font-mono bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition flex items-center gap-1"
                  title="Lataa kierroskronikka JSON-muodossa"
                >
                  <Download className="w-3 h-3" /> LATAA
                </a>
              )}
              <div className="text-[10px] font-mono bg-neutral-950 px-2 py-0.5 rounded text-rose-400 border border-neutral-800">
                CURRENT TICK: {currentTick}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {filteredNews.length === 0 ? (
              <p className="text-neutral-500 text-xs font-mono italic p-6 text-center">No log entries found on this tab.</p>
            ) : (
              filteredNews.slice().reverse().map(item => (
                <div 
                  key={item.id} 
                  className="flex items-start gap-2.5 text-xs font-mono border-b border-neutral-900 pb-2.5"
                >
                  <div className="mt-0.5 p-1 bg-neutral-950 rounded border border-neutral-800 flex-shrink-0">
                    {getNewsIcon(item.type)}
                  </div>
                  <div>
                    <div className="text-neutral-300 leading-relaxed text-[11.5px]">{item.message}</div>
                    <div className="text-[9px] text-neutral-400 mt-1">
                      Tick {item.tick} • {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
