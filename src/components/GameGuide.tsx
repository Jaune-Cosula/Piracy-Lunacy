import React from 'react';
import { 
  X, 
  HelpCircle, 
  Compass, 
  Anchor, 
  Users, 
  Coins, 
  ShieldCheck, 
  Sword, 
  TrendingUp, 
  BookOpen, 
  Flame, 
  Skull,
  Ship
} from 'lucide-react';

interface GameGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameGuide: React.FC<GameGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        
        {/* HEADER */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 rounded-xl border border-amber-500/20">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-slate-100 font-mono">Captain's Log: Game Manual & Tutorial</h2>
              <p className="text-xs font-mono text-neutral-400">Master the trade winds, build heavy armadas, and rule the Caribbean.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto text-xs font-mono leading-relaxed text-slate-300">
          
          {/* SECTION 1: GAME OBJECTIVE */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-black text-amber-400 flex items-center gap-2 font-sans tracking-wide">
              <Skull className="w-4 h-4 text-amber-500" />
              1. ULTIMATE GAME GOAL
            </h3>
            <p>
              Your objective is simple yet absolute: <span className="text-white font-bold">Rule the Caribbean seas</span>. 
              Amass gold doubloons, seize control of neutral and player-held ports, build robust commercial trade lines, and secure your place at the pinnacle of the Captains' Leaderboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-yellow-500 font-bold block mb-1">💰 TREASURE</span>
                Store massive hoards of Gold & Goods inside your home ports.
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-rose-500 font-bold block mb-1">🏰 EXPANSION</span>
                Deploy Governors to colonize and capture rival islands permanently.
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">⚓ ARMADAS</span>
                Command a grand fleet ranging from fast Sloops to colossal Galleons.
              </div>
            </div>
          </div>

          {/* SECTION 2: WHAT CAN YOU DO */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 font-sans tracking-wide">
              <Compass className="w-4 h-4 text-rose-500" />
              2. PIRATE ACTION CHECKLIST
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Ship className="w-4 h-4 text-teal-400" />
                  Shipyard Fleet Construction
                </h4>
                <p className="text-neutral-400">
                  Select an owned port and open the Shipyard to construct vessels. Sloops are fast stealth scout ships; Schooners carry raw cargo; Frigates are heavy escort escutcheons; Galleons are indomitable fortresses.
                </p>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-rose-400" />
                  Troop Recruitment & Barracks
                </h4>
                <p className="text-neutral-400">
                  Recruit brave Pirate Crew to man your ships, defend your harbor garrison, or mount attacks on hostile shores. Recruit Cannons for port defense or Governors to conquer territory.
                </p>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                  Establish Commercial Trade Lanes
                </h4>
                <p className="text-neutral-400">
                  Establish a trade route between two of your owned islands. Assigning a Sloop or Schooner from your docks to run the trade route generates recurring bonus gold doubloons every single game tick.
                </p>
              </div>

              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Sword className="w-4 h-4 text-rose-500 animate-pulse" />
                  Launch Armadas & Military Expeditions
                </h4>
                <p className="text-neutral-400">
                  Open the Armada tab to deploy campaigns. You can <span className="text-yellow-400">Loot & Plunder</span> treasuries, <span className="text-pink-400">Conquer Ports</span> (requires 1 Governor), or <span className="text-orange-400">Raze & Cripple</span> defenses.
                </p>
              </div>

            </div>
          </div>

          {/* SECTION 3: STEP-BY-STEP QUICK START TUTORIAL */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-amber-500 flex items-center gap-2 font-sans tracking-wide">
              <Anchor className="w-4 h-4 text-amber-500" />
              3. GETTING STARTED: YOUR FIRST CONQUEST
            </h3>

            <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-6">
              
              {/* STEP 1 */}
              <div className="relative">
                <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold font-mono text-xs text-amber-500">
                  1
                </div>
                <h4 className="font-bold text-slate-200">Construct Your First Vessel (Shipyard)</h4>
                <p className="text-neutral-400 mt-1">
                  Navigate to the <span className="text-white">Port Economy</span> tab. Select your starting port in the directory. 
                  Scroll down to the Shipyard and order <span className="text-teal-400 font-bold">1 Sloop</span>. 
                  It costs <span className="text-yellow-500 font-bold">400 Gold</span> and <span className="text-teal-400 font-bold">200 Cargo/Goods</span>. 
                  Once purchased, wait for 1 game tick to complete shipbuilding.
                </p>
              </div>

              {/* STEP 2 */}
              <div className="relative">
                <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold font-mono text-xs text-amber-500">
                  2
                </div>
                <h4 className="font-bold text-slate-200">Recruit an Expedition Crew (Barracks)</h4>
                <p className="text-neutral-400 mt-1">
                  In the Recruitment & Fortifications section, train at least <span className="text-rose-400 font-bold">10 Pirate Crew (Troops)</span>. 
                  They will serve as the heavy muscle during combat boarding operations.
                  Ensure you also Construct at least <span className="text-white font-bold">1 Heavy Cannon</span> to protect your own island from incoming raids!
                </p>
              </div>

              {/* STEP 3 */}
              <div className="relative">
                <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold font-mono text-xs text-amber-500">
                  3
                </div>
                <h4 className="font-bold text-slate-200">Deploy Spy Sloops (Scouting)</h4>
                <p className="text-neutral-400 mt-1">
                  To attack effectively, you need intelligence. Select a nearby rival island on the map. 
                  Hiring a Scout allows you to deploy a Spy Sloop. Go to the <span className="text-white">Armada (Military)</span> tab, select the target island, and click <span className="text-teal-400 font-bold">"Deploy Scout"</span>. 
                  The sloop will slip through the defense blockade and report their gold, wood, cannons, and garrison numbers.
                </p>
              </div>

              {/* STEP 4 */}
              <div className="relative">
                <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold font-mono text-xs text-amber-500">
                  4
                </div>
                <h4 className="font-bold text-slate-200">Loot & Plunder the Treasury</h4>
                <p className="text-neutral-400 mt-1">
                  Once your spy returns with the report, check the <span className="text-rose-400 font-bold">Total Defense Power</span> of the target. 
                  Ensure your compiled Armada's <span className="text-emerald-400 font-bold">Attack Power</span> is strictly greater than their defense. 
                  Select <span className="text-yellow-400 font-bold">"Loot & Plunder"</span>, load your crew and cannon armaments, select your vessels, and click <span className="text-yellow-500 font-extrabold">"HOIST THE BLACK FLAG"</span>. 
                  If successful, your pirates will raid their docks, escape with up to <span className="text-yellow-500 font-bold">80% of their treasury gold & cargo</span>, and return safely home!
                </p>
              </div>

            </div>
          </div>

          {/* SECTION 4: WARFARE RULES */}
          <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 space-y-2.5">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 font-sans">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Garrison Combat Mathematics
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-neutral-400 text-[11px]">
              <li><span className="text-white font-bold">Loot & Plunder:</span> Success requires <span className="text-yellow-400">Offence &gt; Defence</span>. Steals massive gold & goods.</li>
              <li><span className="text-white font-bold">Conquer Port:</span> Capture the port permanently. Requires <span className="text-rose-400">Offence &gt;= 3x Defence</span> and <span className="text-yellow-500">1 Governor</span>.</li>
              <li><span className="text-white font-bold">Raze & Cripple:</span> Cut production to 1/3 for 48 ticks. Requires <span className="text-orange-400">Offence &gt; Defence</span>.</li>
              <li><span className="text-white font-bold">Vessel Combat Weights:</span> Sloop = 10, Schooner = 30, Frigate = 80, Galleon = 200 Combat Power.</li>
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 text-center font-mono text-[10px] text-neutral-500">
          Hoist your flags and chart your course, Captain. Glory awaits!
        </div>

      </div>
    </div>
  );
};
