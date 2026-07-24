import React, { useState, useEffect, useMemo } from 'react';
import { FlagSymbol, FLAG_COLORS } from './FlagSymbol.tsx';
import { Anchor, ShieldAlert, Sparkles, Swords, Compass, KeyRound, Mail, User, Ban, Check, Lock } from 'lucide-react';
import { Player } from '../types.ts';
import logoImg from '../assets/logo.jpg';

interface AuthProps {
  onRegister: (username: string, email: string, password: string, flagId: number, flagColor: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
  players?: Record<string, Player>;
}

export const Auth: React.FC<AuthProps> = ({ onRegister, onLogin, players }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFlagId, setSelectedFlagId] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>('#e11d48');
  const [fetchedPlayers, setFetchedPlayers] = useState<Record<string, Player> | null>(null);

  // Forgot Password fields
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);

  // Fetch state if players prop wasn't available
  useEffect(() => {
    if (!players) {
      fetch('/api/game/state')
        .then(res => res.json())
        .then(data => {
          if (data && data.players) {
            setFetchedPlayers(data.players);
          }
        })
        .catch(err => console.error('Failed to load players for flag checks:', err));
    }
  }, [players]);

  const activePlayers = players || fetchedPlayers || {};

  // Map of claimed flag combinations: "flagId_colorHex" -> username
  const claimedFlagsMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(activePlayers).forEach((p: Player) => {
      if (p.flagId && p.flagColor) {
        const key = `${p.flagId}_${p.flagColor.toLowerCase()}`;
        map[key] = p.username;
      }
    });
    return map;
  }, [activePlayers]);

  const currentKey = `${selectedFlagId}_${selectedColor.toLowerCase()}`;
  const isCurrentCombinationClaimed = Boolean(claimedFlagsMap[currentKey]);
  const currentClaimedUser = claimedFlagsMap[currentKey];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecoverySuccessMsg(null);

    if (!username || username.trim().length < 2) {
      setErrorMsg('Dread pirate! Enter a valid name of at least 2 characters.');
      return;
    }

    if (isForgotPassword) {
      if (!recoveryEmail || !recoveryEmail.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!recoveryNewPassword || recoveryNewPassword.length < 4) {
        setErrorMsg('Password must be at least 4 characters long.');
        return;
      }
      if (recoveryNewPassword !== recoveryConfirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            email: recoveryEmail.trim(),
            newPassword: recoveryNewPassword
          })
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          setRecoverySuccessMsg('Arrr! Password reset successfully, Captain! You can now log in.');
          setIsForgotPassword(false);
          // Reset fields
          setRecoveryEmail('');
          setRecoveryNewPassword('');
          setRecoveryConfirmPassword('');
          setPassword('');
        } else {
          let errText = 'Failed to recover password.';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            errText = data.error || errText;
          }
          setErrorMsg(errText);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Verification failed!');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal Register/Login flow
    if (isRegister) {
      if (isCurrentCombinationClaimed) {
        setErrorMsg(`Tämä lippu- ja väriyhdistelmä on jo varattu kapteenille ${currentClaimedUser}! Valitse toinen lippu tai väri.`);
        return;
      }
      if (email.trim().length > 0 && !email.includes('@')) {
        setErrorMsg('Please enter a valid email address containing @.');
        return;
      }
      if (!password || password.length < 4) {
        setErrorMsg('Password must be at least 4 characters long.');
        return;
      }
    } else {
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await onRegister(username.trim(), email.trim(), password, selectedFlagId, selectedColor);
      } else {
        await onLogin(username.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'The authorization gates failed to open!');
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
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center mb-1">
            <img 
              src={logoImg} 
              alt="Piracy Lunacy Logo" 
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-full border-2 border-rose-500/30 shadow-2xl bg-slate-950 p-1 hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
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

        {/* Form Success Display */}
        {recoverySuccessMsg && (
          <div className="mb-5 p-3 bg-teal-950/40 border border-teal-500/30 rounded-xl text-xs text-teal-300 flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <div>{recoverySuccessMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-slate-500" />
              {isRegister ? 'ENTER DREAD PIRATE NAME' : isForgotPassword ? 'PIRATE NAME TO RESET' : 'SIGN IN WITH REGISTERED NAME'}
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

          {/* Email field during Register */}
          {isRegister && !isForgotPassword && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500" />
                DREAD EMAIL ADDRESS (OPTIONAL FOR RECOVERY)
              </label>
              <input
                type="email"
                placeholder="pirate@caribbean.com (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>
          )}

          {/* Password field during Register & Login */}
          {!isForgotPassword && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-slate-500" />
                PIRATE SECRET KEY (PASSWORD)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
              />
            </div>
          )}

          {/* Forgot Password fields */}
          {isForgotPassword && (
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  REGISTERED EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  placeholder="pirate@caribbean.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-slate-500" />
                  NEW SECRET KEY (NEW PASSWORD)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-slate-500" />
                  CONFIRM NEW SECRET KEY
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={recoveryConfirmPassword}
                  onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Registration customizations */}
          {isRegister && !isForgotPassword && (
            <div className="space-y-5 border-t border-slate-800/80 pt-4">
              
              {/* Previews and Color select */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                
                {/* Real-time Flag Preview */}
                <div className="md:col-span-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center flex flex-col items-center justify-center h-full relative">
                  <span className="text-[9px] text-slate-500 mb-2 font-bold block">FLAG BLUEPRINT</span>
                  <FlagSymbol flagId={selectedFlagId} color={selectedColor} size="lg" />
                  <span className="text-[9px] text-slate-500 mt-2">Flag Option #{selectedFlagId}</span>

                  {isCurrentCombinationClaimed ? (
                    <div className="mt-2 text-[9px] font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-2 py-1 rounded-lg flex items-center justify-center gap-1 leading-tight">
                      <Ban className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>VARATTU: {currentClaimedUser}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-[9px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 leading-tight">
                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>VAPAANA</span>
                    </div>
                  )}
                </div>

                {/* Color Selector */}
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 block font-bold">CHOOSE SIGNATURE HUE</span>
                    {isCurrentCombinationClaimed && (
                      <span className="text-[10px] text-rose-400 font-semibold">Tämä väri on varattu lippulle #{selectedFlagId}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FLAG_COLORS.map(color => {
                      const colorKey = `${selectedFlagId}_${color.toLowerCase()}`;
                      const isColorClaimed = Boolean(claimedFlagsMap[colorKey]);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          title={isColorClaimed ? `Varattu kapteenille ${claimedFlagsMap[colorKey]}` : 'Vapaana'}
                          className={`w-6 h-6 rounded-full border transition-transform relative flex items-center justify-center ${
                            selectedColor === color 
                              ? 'scale-125 border-white ring-2 ring-rose-500/50' 
                              : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {isColorClaimed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-rose-400" />
                          )}
                        </button>
                      );
                    })}
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
                    const fIdKey = `${fId}_${selectedColor.toLowerCase()}`;
                    const isEmblemClaimed = Boolean(claimedFlagsMap[fIdKey]);
                    return (
                      <button
                        key={fId}
                        type="button"
                        onClick={() => setSelectedFlagId(fId)}
                        title={isEmblemClaimed ? `Varattu (${claimedFlagsMap[fIdKey]})` : `Lippu #${fId}`}
                        className={`p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg border transition-all flex items-center justify-center relative ${
                          isSelected 
                            ? isEmblemClaimed
                              ? 'border-rose-500 ring-2 ring-rose-500/40 scale-110'
                              : 'border-rose-500 ring-2 ring-rose-500/20 scale-110' 
                            : isEmblemClaimed
                              ? 'border-rose-900/40 opacity-70'
                              : 'border-slate-800'
                        }`}
                      >
                        <FlagSymbol flagId={fId} color={selectedColor} size="sm" />
                        {isEmblemClaimed && (
                          <div className="absolute -top-1 -right-1 bg-rose-950 border border-rose-500/60 rounded-full p-0.5 shadow">
                            <Lock className="w-2.5 h-2.5 text-rose-400" />
                          </div>
                        )}
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
            disabled={loading || (isRegister && !isForgotPassword && isCurrentCombinationClaimed)}
            className={`w-full text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              isRegister && !isForgotPassword && isCurrentCombinationClaimed
                ? 'bg-neutral-800 border border-rose-500/30 text-rose-300 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500'
            }`}
          >
            <Compass className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            {loading 
              ? 'SAILING THE WAVES...' 
              : isForgotPassword
                ? 'RESET PIRATE PASSWORD'
                : isRegister 
                  ? isCurrentCombinationClaimed
                    ? 'LIPPU JA VÄRI ON JO VARATTU (VALITSE TOINEN)'
                    : 'ESTABLISH PIRATE HAVEN (REGISTER)' 
                  : 'HOIST SAILS (LOG IN)'
            }
          </button>

        </form>

        {/* Alternate auth triggers */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs font-mono text-neutral-400 flex flex-col gap-2">
          {!isForgotPassword ? (
            <>
              {isRegister ? (
                <span>
                  Already feared on these seas?{' '}
                  <button 
                    onClick={() => { setIsRegister(false); setErrorMsg(null); }} 
                    className="text-rose-400 hover:underline font-bold"
                  >
                    Sign In to Account
                  </button>
                </span>
              ) : (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <span>
                    New to these pirate waters?{' '}
                    <button 
                      onClick={() => { setIsRegister(true); setErrorMsg(null); }} 
                      className="text-rose-400 hover:underline font-bold"
                    >
                      Create Pirate Profile
                    </button>
                  </span>
                  <button 
                    onClick={() => { setIsForgotPassword(true); setErrorMsg(null); }} 
                    className="text-slate-400 hover:text-white underline font-semibold"
                  >
                    Forgot Secret Key?
                  </button>
                </div>
              )}
            </>
          ) : (
            <span>
              Remembered your secret key?{' '}
              <button 
                onClick={() => { setIsForgotPassword(false); setIsRegister(false); setErrorMsg(null); }} 
                className="text-rose-400 hover:underline font-bold"
              >
                Back to Sign In
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
