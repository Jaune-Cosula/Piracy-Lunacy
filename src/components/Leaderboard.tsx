import React, { useState, useMemo } from 'react';
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
  AlertTriangle
} from 'lucide-react';

interface LeaderboardProps {
  players: Record<string, Player>;
  news: NewsItem[];
  currentTick: number;
  lastTickTime: string;
  tickSpeedMode: 'normal' | 'fast' | 'debug';
  onManualTick: () => Promise<void>;
  onChangeSpeed: (mode: 'normal' | 'fast' | 'debug') => Promise<void>;
  onRestartNPCs: () => Promise<void>;
  currentPlayerId: string | null;
  isPaused: boolean;
  onTogglePause: (pause: boolean) => Promise<void>;
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
  const [newsTab, setNewsTab] = useState<'global' | 'personal'>('global');

  // Rank players by score
  const rankedPlayers = (Object.values(players) as Player[]).sort((a, b) => b.score - a.score);

  // Filter news for current player if personal log tab is active
  const filteredNews = useMemo(() => {
    if (newsTab === 'global') {
      return news;
    }
    return news.filter(item => 
      item.senderPlayerId === currentPlayerId || 
      item.targetPlayerId === currentPlayerId
    );
  }, [news, newsTab, currentPlayerId]);

  const handleDevTick = async () => {
    setSuccessMsg(null);
    try {
      await onManualTick();
      setSuccessMsg('Successfully advanced 1 game tick!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDevSpeed = async (mode: 'normal' | 'fast' | 'debug') => {
    setSuccessMsg(null);
    try {
      await onChangeSpeed(mode);
      let speedText = '15 Minutes (Standard)';
      if (mode === 'fast') speedText = '30 Seconds (Fast Testing)';
      if (mode === 'debug') speedText = '5 Minutes (Debug/Testing)';
      setSuccessMsg(`Tick interval set to ${speedText}`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestartNPCsAction = async () => {
    setSuccessMsg(null);
    try {
      await onRestartNPCs();
      setSuccessMsg('Successfully re-started NPC factions! All neutral/NPC ports reset to weak defenses.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePauseAction = async () => {
    setSuccessMsg(null);
    try {
      const nextPaused = !isPaused;
      await onTogglePause(nextPaused);
      setSuccessMsg(nextPaused 
        ? '🚨 Game ticks and database sync have been safely PAUSED.' 
        : '🟢 Game ticks and database sync have been RESUMED!'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
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
      setSuccessMsg('💾 Game state backup JSON downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('Failed to generate backup JSON.');
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
          throw new Error('Missing players or ports data fields.');
        }
        
        const res = await fetch('/api/game/dev-restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupData: parsed })
        });
        
        if (res.ok) {
          const data = await res.json();
          setSuccessMsg('🎉 Game state successfully restored from local backup file!');
          onRestoreState(data.state);
          setTimeout(() => setSuccessMsg(null), 5000);
        } else {
          const err = await res.json();
          alert(`Restore failed: ${err.error}`);
        }
      } catch (err) {
        alert(`Invalid backup JSON file: ${err instanceof Error ? err.message : String(err)}`);
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
              <span><strong>Campaign Duration:</strong> All attacks take exactly 18 ticks total (6 to move, 6 battling, 6 returning home).</span>
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
      </div>

      {/* RIGHT COLUMN: Global & Personal News Feed & Developer Tools */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Global & Personal News Ticker */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col h-[340px] lg:h-[450px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <div className="flex gap-2.5">
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
            </div>
            <div className="text-[10px] font-mono bg-neutral-950 px-2 py-0.5 rounded text-rose-400 border border-neutral-800">
              CURRENT TICK: {currentTick}
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
