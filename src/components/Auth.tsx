import React, { useState } from 'react';
import { FlagSymbol, FLAG_COLORS } from './FlagSymbol.tsx';
import { Anchor, ShieldAlert, Sparkles, Swords, Compass } from 'lucide-react';

interface AuthProps {
  onRegister: (username: string, flagId: number, flagColor: string) => Promise<void>;
  onLogin: (username: string) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ onRegister, onLogin }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedFlagId, setSelectedFlagId] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>('#e11d48');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.trim().length < 2) {
      setErrorMsg('Dread pirate! Enter a valid name of at least 2 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (isRegister) {
        await onRegister(username.trim(), selectedFlagId, selectedColor);
      } else {
        await onLogin(username.trim());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'The registration gates failed to open!');
    } finally {
      setLoading(false);
    }
  };

  // Generate an array of 40 flag IDs to select
  const flagIds = Array.from({ length: 40 }, (_, idx) => idx + 1);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative select-none font-mono bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
      
      {/* Background visual overlays */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Auth Container Card */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-850 rounded-3xl p-6 md:p-8 shadow-2xl relative backdrop-blur-md">
        
        {/* Decorative corner borders */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-800" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-800" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-800" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-800" />

        {/* Title branding */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 mb-1">
            <Swords className="w-7 h-7 text-rose-500 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-widest text-white font-sans">
            PIRACY LUNACY
          </h1>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            A tactical multiplayer 15-minute tick-based strategy game. Forge empires, build fleets, and plunder rivals.
          </p>
        </div>

        {/* Form Error Display */}
        {errorMsg && (
          <div className="mb-5 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider">
              {isRegister ? 'ENTER DREAD PIRATE NAME' : 'SIGN IN WITH REGISTERED NAME'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Captain Blackbeard"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
            />
          </div>

          {/* Registration customizations */}
          {isRegister && (
            <div className="space-y-5 border-t border-slate-800/80 pt-5">
              
              {/* Previews and Color select */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Real-time Flag Preview */}
                <div className="md:col-span-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col items-center justify-center h-full">
                  <span className="text-[9px] text-slate-500 mb-2 font-bold block">FLAG BLUEPRINT</span>
                  <FlagSymbol flagId={selectedFlagId} color={selectedColor} size="lg" />
                  <span className="text-[9px] text-slate-500 mt-2">Flag Option #{selectedFlagId}</span>
                </div>

                {/* Color Selector */}
                <div className="md:col-span-8 space-y-2">
                  <span className="text-xs text-neutral-400 block font-bold">CHOOSE SIGNATURE HUE</span>
                  <div className="flex flex-wrap gap-2">
                    {FLAG_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-6 h-6 rounded-full border transition-transform ${
                          selectedColor === color 
                            ? 'scale-125 border-white ring-2 ring-rose-500/50' 
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* 40 Flags Grid selection */}
              <div className="space-y-2">
                <span className="text-xs text-neutral-400 block font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  SELECT ONE OF 40 PIRATE EMBLEMS
                </span>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 max-h-[140px] overflow-y-auto bg-slate-950 p-3 rounded-2xl border border-slate-850">
                  {flagIds.map(fId => {
                    const isSelected = selectedFlagId === fId;
                    return (
                      <button
                        key={fId}
                        type="button"
                        onClick={() => setSelectedFlagId(fId)}
                        className={`p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg border transition-all flex items-center justify-center ${
                          isSelected 
                            ? 'border-rose-500 ring-2 ring-rose-500/20 scale-110' 
                            : 'border-slate-800'
                        }`}
                      >
                        <FlagSymbol flagId={fId} color={selectedColor} size="sm" />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Submit action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            {loading 
              ? 'SAILING THE WAVES...' 
              : isRegister 
                ? 'ESTABLISH PIRATE HAVEN (REGISTER)' 
                : 'HOIST SAILS (LOG IN)'
            }
          </button>

        </form>

        {/* Alternate auth triggers */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs font-mono text-neutral-400">
          {isRegister ? (
            <span>
              Already feared on these seas?{' '}
              <button 
                onClick={() => setIsRegister(false)} 
                className="text-rose-400 hover:underline font-bold"
              >
                Sign In to Account
              </button>
            </span>
          ) : (
            <span>
              New to these pirate waters?{' '}
              <button 
                onClick={() => setIsRegister(true)} 
                className="text-rose-400 hover:underline font-bold"
              >
                Create Pirate Profile
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
