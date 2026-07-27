export interface Player {
  id: string;
  username: string;
  flagId: number; // 1 to 40
  flagColor: string; // Tailwind color class or hex
  score: number;
  gold: number;
  goods: number;
  lastActiveTime: string;
}

export interface BuildItem {
  id: string;
  type: 'troops' | 'cannons' | 'governors' | 'scout' | 'fort' | 'sloop' | 'schooner' | 'frigate' | 'galleon';
  count: number;
  ticksRemaining: number;
  totalTicks: number;
}

export interface GamePort {
  id: string;
  name: string;
  type: 'port' | 'island' | 'npc';
  ownerId: string | null; // null if independent/NPC
  ownerName: string;
  q: number; // hex axial coordinate column
  r: number; // hex axial coordinate row
  troops: number; // stationed troops
  cannons: number; // stationed cannons
  governors: number; // stationed governors
  sloop: number;
  schooner: number;
  frigate: number;
  galleon: number;
  fortificationLevel: number;
  scoutCount: number;
  razedTicksRemaining: number;
  baseGoldProduction: number;
  baseGoodsProduction: number;
  buildQueue?: BuildItem[];
  gold?: number;
  goods?: number;
}

export interface TradeRoute {
  id: string;
  proposerPlayerId: string;
  proposerPlayerName: string;
  recipientPlayerId: string;
  recipientPlayerName: string;
  proposerPortId: string;
  proposerPortName: string;
  recipientPortId: string;
  recipientPortName: string;
  shipType: 'sloop' | 'schooner';
  status: 'pending' | 'active';
  createdAt?: string;
  // Backward compatibility fields
  ownerId?: string;
  portAId?: string;
  portBId?: string;
  active?: boolean;
}

export interface FleetCampaign {
  id: string;
  senderId: string;
  senderName: string;
  senderFlagId: number;
  senderFlagColor: string;
  originPortId: string;
  originPortName: string;
  targetPortId: string;
  targetPortName: string;
  type: 'attack_conquer' | 'attack_loot' | 'attack_raze' | 'scout' | 'transfer';
  status: 'moving' | 'battling' | 'returning';
  ticksRemaining: number; // starts at 11 for attack (4 move, 3 battle, 4 return) or 4 for scout (2 move, 2 return)
  totalDuration: number;
  sloop: number;
  schooner: number;
  frigate: number;
  galleon: number;
  troops: number;
  cannons: number;
  governors: number;
  outcome: string | null;
}

export interface NewsItem {
  id: string;
  tick: number;
  type: 'battle' | 'conquest' | 'raze' | 'loot' | 'system' | 'trade';
  message: string;
  timestamp: string;
  senderPlayerId?: string;
  targetPlayerId?: string;
}

export interface ScoutReport {
  id: string;
  senderId: string;
  targetPortId: string;
  targetPortName: string;
  scoutTick: number;
  troops: number;
  cannons: number;
  sloop: number;
  schooner: number;
  frigate: number;
  galleon: number;
  fortificationLevel: number;
  activeFleets: {
    type: string;
    status: string;
    ticksRemaining: number;
    destination: string;
  }[];
  gold?: number;
  goods?: number;
}

export interface ForumReply {
  id: string;
  senderId: string;
  senderName: string;
  senderFlagId: number;
  senderFlagColor: string;
  content: string;
  timestamp: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderFlagId: number;
  senderFlagColor: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: string;
}

export interface ForumPost {
  id: string;
  senderId: string;
  senderName: string;
  senderFlagId: number;
  senderFlagColor: string;
  title: string;
  content: string;
  timestamp: string;
  replies: ForumReply[];
}

export interface GameState {
  players: Record<string, Player>;
  ports: Record<string, GamePort>;
  tradeRoutes: TradeRoute[];
  campaigns: FleetCampaign[];
  news: NewsItem[];
  scoutReports: ScoutReport[];
  currentTick: number;
  lastTickTime: string;
  gameStartTime?: string;
  roundLimitTicks?: number;
  roundName?: string;
  tickSpeedMode: 'normal' | 'fast' | 'debug'; // normal = 15m, fast = 30s, debug = 5m
  forum?: ForumPost[];
  directMessages?: DirectMessage[];
  isPaused?: boolean;
  authStore?: Record<string, { passwordHash: string; salt: string; email: string }>;
}

// Ship static properties
export interface ShipTypeConfig {
  name: string;
  costGold: number;
  costGoods: number;
  upkeepGold: number;
  cannonCapacity: number;
  crewCapacity: number;
  cargoCapacity: number;
  combatPower: number; // base ship strength
  speed: number;
}

export const SHIP_CONFIGS: Record<'sloop' | 'schooner' | 'frigate' | 'galleon', ShipTypeConfig> = {
  sloop: {
    name: 'Sloop',
    costGold: 200,
    costGoods: 50,
    upkeepGold: 5,
    cannonCapacity: 4,
    crewCapacity: 15,
    cargoCapacity: 300,
    combatPower: 10,
    speed: 4,
  },
  schooner: {
    name: 'Schooner',
    costGold: 500,
    costGoods: 150,
    upkeepGold: 12,
    cannonCapacity: 12,
    crewCapacity: 40,
    cargoCapacity: 800,
    combatPower: 30,
    speed: 3,
  },
  frigate: {
    name: 'Frigate',
    costGold: 1200,
    costGoods: 400,
    upkeepGold: 30,
    cannonCapacity: 28,
    crewCapacity: 100,
    cargoCapacity: 2000,
    combatPower: 80,
    speed: 2,
  },
  galleon: {
    name: 'Galleon',
    costGold: 2500,
    costGoods: 1000,
    upkeepGold: 65,
    cannonCapacity: 60,
    crewCapacity: 220,
    cargoCapacity: 5000,
    combatPower: 200,
    speed: 1,
  },
};

export const COST_GOVERNOR = 3000;
export function getGovernorCost(ownedPortsCount: number): number {
  return 2000 + 1000 * Math.max(1, ownedPortsCount);
}
export const COST_TROOP = 30; // Gold
export const COST_CANNON = 80; // Gold
export const COST_SCOUT = 150; // Gold
export function getFortificationCost(currentLevel: number): { goldCost: number; goodsCost: number } {
  const level = Math.max(1, currentLevel);
  const goldCost = 50 + level * 50; // Lvl 1->2: 100G, Lvl 2->3: 150G, Lvl 3->4: 200G, Lvl 4->5: 250G
  const goodsCost = level * 400;    // Lvl 1->2: 400W, Lvl 2->3: 800W, Lvl 3->4: 1200W, Lvl 4->5: 1600W
  return { goldCost, goodsCost };
}
export const COST_FORTIFICATION = 100; // Base gold cost for level 1 fort upgrade

export const UPKEEP_TROOP = 1; // Gold per tick
export const UPKEEP_SCOUT = 2; // Gold per tick
