import React, { useState } from 'react';
import { FlagSymbol, FLAG_COLORS } from './FlagSymbol.tsx';
import { Anchor, ShieldAlert, Sparkles, Swords, Compass, KeyRound, Mail, User } from 'lucide-react';

interface AuthProps {
  onRegister: (username: string, email: string, password: string, flagId: number, flagColor: string) => Promise<void>;
  onLogin: (username: string, password: string) => Promise<void>;
}

export const Auth: React.FC<AuthProps> = ({ onRegister, onLogin }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFlagId, setSelectedFlagId] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>('#e11d48');
  
  // Forgot Password fields
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);

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
        const data = await res.json();
        if (res.ok) {
          setRecoverySuccessMsg('Arrr! Password reset successfully, Captain! You can now log in.');
          setIsForgotPassword(false);
          // Reset fields
          setRecoveryEmail('');
          setRecoveryNewPassword('');
          setRecoveryConfirmPassword('');
          setPassword('');
        } else {
          setErrorMsg(data.error || 'Failed to recover password.');
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
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-3 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <Compass className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
            {loading 
              ? 'SAILING THE WAVES...' 
              : isForgotPassword
                ? 'RESET PIRATE PASSWORD'
                : isRegister 
                  ? 'ESTABLISH PIRATE HAVEN (REGISTER)' 
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
