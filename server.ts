import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { 
  GameState, 
  GamePort, 
  Player, 
  TradeRoute, 
  FleetCampaign, 
  NewsItem, 
  ScoutReport, 
  SHIP_CONFIGS, 
  COST_GOVERNOR, 
  COST_TROOP, 
  COST_CANNON, 
  COST_SCOUT, 
  COST_FORTIFICATION,
  UPKEEP_TROOP,
  UPKEEP_SCOUT
} from './src/types.js';

// PORT is hardcoded by the infrastructure to 3000
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'piracy_db.json');

// Load Firebase configuration
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  console.error('Error reading firebase-applet-config.json:', e);
}

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || 'calcium-form-07c1c';
const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || 'ai-studio-piracylunacy-bc3f1352-8aa3-4eca-8753-19c9d8a3d910';

const adminConfig: any = {
  projectId: projectId
};

// Support initializing firebase-admin via service account JSON in external deployments (like Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const creds = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
  if (creds) {
    try {
      let parsedCreds: any = null;
      if (creds.startsWith('{')) {
        parsedCreds = JSON.parse(creds);
      } else {
        // Try decoding as base64 in case they encoded it to avoid multi-line issues in env vars
        try {
          const decoded = Buffer.from(creds, 'base64').toString('utf8');
          if (decoded.startsWith('{')) {
            parsedCreds = JSON.parse(decoded);
          }
        } catch (base64Err) {
          // Not base64, ignore
        }
      }

      if (parsedCreds) {
        adminConfig.credential = cert(parsedCreds);
        console.log('Firebase Admin initialized successfully using FIREBASE_SERVICE_ACCOUNT.');
      } else {
        console.warn('FIREBASE_SERVICE_ACCOUNT was provided but does not appear to be a valid JSON object or Base64-encoded JSON. Please make sure to copy the entire JSON content of your service account file.');
      }
    } catch (e: any) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable. Please ensure it is a valid JSON string:', e.message || e);
    }
  }
}

const firebaseApp = initializeApp(adminConfig);

// If database ID is 'default' or '(default)', use the default database. Otherwise, use the specified database ID.
const db = (firestoreDatabaseId && firestoreDatabaseId !== 'default' && firestoreDatabaseId !== '(default)')
  ? getFirestore(firebaseApp, firestoreDatabaseId)
  : getFirestore(firebaseApp);

// List of pirate-themed port names
const PORT_NAMES = [
  'Tortuga', 'Nassau', 'Port Royal', 'Kingston', 'Blackbeard Cove',
  'Dead Man Island', 'Shipwreck Cove', 'Smugglers Bay', 'Krakens Deep', 'Devils Throat',
  'Isla de la Juventud', 'Buccaneers Rest', 'Sirens Cove', 'Cutlass Cay', 'Grog Harbor',
  'Corsair Reef', 'Booty Island', 'Treasure Island', 'Golden Atoll', 'Sharktooth Bay',
  'Gallows Point', 'Hurricane Gulch', 'Marooners Rock', 'Rogues Haven', 'Viper Isle',
  'Anchor Bay', 'Skull Rock', 'Windward Cay', 'Cannon Cove', 'Jolly Roger Reef',
  'Spanish Wells', 'Havana Harbor', 'Santo Domingo', 'Cartagena Outpost', 'Port-de-Paix',
  'Biloxi Point', 'Pensacola Cay', 'Veracruz Wharf', 'Campeche Cove', 'Roatan Reef',
  'Cozumel Island', 'Bluefields Basin', 'Providence Island', 'Bermuda Outpost', 'Trinidad Fortress'
];

// Factions
const NPC_FACTIONS = [
  { id: 'npc_spain', name: 'Spanish Crown', color: 'bg-red-600' },
  { id: 'npc_britain', name: 'British Empire', color: 'bg-blue-600' },
  { id: 'npc_east_india', name: 'East India Trading Co', color: 'bg-amber-600' },
  { id: 'npc_independent', name: 'Independent Merchants', color: 'bg-slate-500' }
];

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Initialize Game State
function createInitialState(): GameState {
  const ports: Record<string, GamePort> = {};
  
  // Generate a beautiful hexagonal coordinate layout (radius 4)
  let nameIndex = 0;
  let portIdCounter = 1;
  
  for (let q = -4; q <= 4; q++) {
    for (let r = -4; r <= 4; r++) {
      if (Math.abs(q + r) <= 4) {
        // We filter some hexes to keep about 45 ports
        if (nameIndex < PORT_NAMES.length && (q !== 0 || r !== 0 || nameIndex % 2 === 0)) {
          const name = PORT_NAMES[nameIndex];
          const id = `port_${portIdCounter++}`;
          
          // Randomly assign NPC owner
          // 40% are Independent Merchants, 10% Spain, 10% Britain, 10% East India, 30% unowned/independent
          let ownerId: string | null = null;
          let ownerName = 'Independent Pirates';
          const roll = Math.random();
          
          if (roll < 0.25) {
            ownerId = 'npc_independent';
            ownerName = 'Independent Merchants';
          } else if (roll < 0.4) {
            ownerId = 'npc_spain';
            ownerName = 'Spanish Crown';
          } else if (roll < 0.55) {
            ownerId = 'npc_britain';
            ownerName = 'British Empire';
          } else if (roll < 0.7) {
            ownerId = 'npc_east_india';
            ownerName = 'East India Trading Co';
          }
          
          // Generate starting resources/garrisons for NPC ports
          const isNPC = ownerId !== null;
          ports[id] = {
            id,
            name,
            type: isNPC ? 'npc' : 'port',
            ownerId,
            ownerName,
            q,
            r,
            troops: isNPC ? Math.floor(Math.random() * 8) + 4 : 10, // NPCs are much weaker for easy player expansion
            cannons: isNPC ? Math.floor(Math.random() * 3) + 1 : 2,
            governors: 0,
            sloop: isNPC ? (Math.random() > 0.8 ? 1 : 0) : 0,
            schooner: isNPC ? (Math.random() > 0.95 ? 1 : 0) : 0,
            frigate: 0,
            galleon: 0,
            fortificationLevel: isNPC ? Math.floor(Math.random() * 2) + 1 : 1,
            scoutCount: 0,
            razedTicksRemaining: 0,
            baseGoldProduction: Math.floor(Math.random() * 100) + 150, // base 150-250 gold per tick
            baseGoodsProduction: Math.floor(Math.random() * 30) + 50,  // base 50-80 goods per tick
            buildQueue: [],
            gold: isNPC ? Math.floor(Math.random() * 4000) + 3500 : 0,
            goods: isNPC ? Math.floor(Math.random() * 1500) + 1000 : 0
          };
          
          nameIndex++;
        }
      }
    }
  }

  // Ensure we have exactly at least one guaranteed player-claimable port
  return {
    players: {},
    ports,
    tradeRoutes: [],
    campaigns: [],
    news: [
      {
        id: 'news_init',
        tick: 0,
        type: 'system',
        message: 'The Piracy Lunacy waters are open! Form alliances, construct ships, and conquer the Caribbean.',
        timestamp: new Date().toISOString()
      }
    ],
    scoutReports: [],
    currentTick: 1,
    lastTickTime: new Date().toISOString(),
    gameStartTime: new Date().toISOString(),
    roundLimitTicks: 2000,
    tickSpeedMode: 'normal',
    forum: [],
    directMessages: [],
    isPaused: false
  };
}

let state: GameState = createInitialState();
let isStateLoaded = false;
let isFirestoreAvailable = true;
let lastFirestoreCheck = 0;
const FIRESTORE_RETRY_INTERVAL = 60000; // 1 minute

async function loadStateFromFirestore(forceCheck = false) {
  const now = Date.now();
  if (!isFirestoreAvailable && !forceCheck && (now - lastFirestoreCheck < FIRESTORE_RETRY_INTERVAL)) {
    return;
  }

  try {
    const docRef = db.collection('game_states').doc('global');
    const doc = await docRef.get();
    if (doc.exists) {
      state = doc.data() as GameState;
      if (!state.forum) state.forum = [];
      if (!state.directMessages) state.directMessages = [];
      if (state.isPaused === undefined) state.isPaused = false;
      if (!state.scoutReports) state.scoutReports = [];
      if (!state.campaigns) state.campaigns = [];
      if (!state.tradeRoutes) state.tradeRoutes = [];
      if (!state.news) state.news = [];
      if (!state.authStore) state.authStore = {};
      if (!state.gameStartTime) state.gameStartTime = new Date().toISOString();
      if (!state.roundLimitTicks) state.roundLimitTicks = 2000;
      Object.values(state.ports).forEach(p => {
        if (!p.buildQueue) p.buildQueue = [];
      });
      isStateLoaded = true;
    } else {
      console.log('No game state in Firestore. Initializing...');
      state = createInitialState();
      await docRef.set(state);
      isStateLoaded = true;
    }
    if (!isFirestoreAvailable) {
      console.log('Firestore connection recovered! Switching to Firestore sync.');
      isFirestoreAvailable = true;
    }
  } catch (err) {
    if (isFirestoreAvailable) {
      console.warn('Firestore is temporarily unavailable, falling back to local file-based database:', err instanceof Error ? err.message : String(err));
      isFirestoreAvailable = false;
    }
    lastFirestoreCheck = now;
    
    // Fallback to local file if Firestore fails
    try {
      if (fs.existsSync(DB_FILE)) {
        const loadedState = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (loadedState && typeof loadedState === 'object' && loadedState.ports) {
          state = loadedState;
          if (!state.forum) state.forum = [];
          if (state.isPaused === undefined) state.isPaused = false;
          if (!state.scoutReports) state.scoutReports = [];
          if (!state.campaigns) state.campaigns = [];
          if (!state.tradeRoutes) state.tradeRoutes = [];
          if (!state.news) state.news = [];
          if (!state.authStore) state.authStore = {};
          if (!state.gameStartTime) state.gameStartTime = new Date().toISOString();
          if (!state.roundLimitTicks) state.roundLimitTicks = 2000;
          Object.values(state.ports).forEach(p => {
            if (!p.buildQueue) p.buildQueue = [];
          });
          isStateLoaded = true;
          console.log('Successfully loaded fallback local state piracy_db.json');
        }
      } else {
        // No local database file exists, and Firestore failed.
        // We will NOT set isStateLoaded to true because we didn't load a valid state.
        // This prevents overwriting the cloud database with an empty initial state if we subsequently write.
        console.warn('No local fallback file found, database load is incomplete.');
      }
    } catch (fileErr) {
      console.error('File fallback load failed:', fileErr);
    }
  }
}

async function saveDb() {
  if (!isStateLoaded) {
    console.warn('Skipping saveDb: Game state is not fully loaded/verified yet. Aborting to protect existing database.');
    return;
  }
  try {
    // Write locally for local backup
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    
    if (isFirestoreAvailable) {
      // Persist to Firestore
      const docRef = db.collection('game_states').doc('global');
      await docRef.set(state);
      console.log('Game state saved to Firestore.');
    }
  } catch (err) {
    console.error('Error saving database to Firestore:', err);
    isFirestoreAvailable = false;
    lastFirestoreCheck = Date.now();
  }
}

// Score Calculation Helper
export function calculateScores() {
  const playerStats: Record<string, { ports: number; shipsValue: number; armyValue: number; goldValue: number; score: number }> = {};
  
  // Initialize stats for each active player
  Object.keys(state.players).forEach(pId => {
    playerStats[pId] = { ports: 0, shipsValue: 0, armyValue: 0, goldValue: 0, score: 0 };
  });

  // 1. Ports (1000 pts per port owned)
  Object.values(state.ports).forEach(port => {
    if (port.ownerId && state.players[port.ownerId]) {
      playerStats[port.ownerId].ports += 1000;
      
      // Port ships value
      playerStats[port.ownerId].shipsValue += (port.sloop * SHIP_CONFIGS.sloop.combatPower) +
                                              (port.schooner * SHIP_CONFIGS.schooner.combatPower) +
                                              (port.frigate * SHIP_CONFIGS.frigate.combatPower) +
                                              (port.galleon * SHIP_CONFIGS.galleon.combatPower);
                                              
      // Port army value
      playerStats[port.ownerId].armyValue += (port.troops * 1) + (port.cannons * 2);
    }
  });

  // Add fleet in transit values
  state.campaigns.forEach(c => {
    if (state.players[c.senderId]) {
      playerStats[c.senderId].shipsValue += (c.sloop * SHIP_CONFIGS.sloop.combatPower) +
                                            (c.schooner * SHIP_CONFIGS.schooner.combatPower) +
                                            (c.frigate * SHIP_CONFIGS.frigate.combatPower) +
                                            (c.galleon * SHIP_CONFIGS.galleon.combatPower);
                                            
      playerStats[c.senderId].armyValue += (c.troops * 1) + (c.cannons * 2);
    }
  });

  // Calculate scores and update Player objects
  Object.keys(state.players).forEach(pId => {
    const p = state.players[pId];
    const stats = playerStats[pId];
    
    // Gold and Goods Value (1 pt per 1000 gold/goods)
    stats.goldValue = Math.floor((p.gold + p.goods) / 1000);
    
    // Total Score Formula
    // Ports are heavily weighted, then ships, then troops, then treasury
    stats.score = stats.ports + stats.shipsValue + stats.armyValue + stats.goldValue;
    p.score = stats.score;
  });
}

// Tick processing logic
export function processGameTick() {
  state.currentTick++;
  state.lastTickTime = new Date().toISOString();
  
  console.log(`Processing Game Tick: ${state.currentTick}`);
  
  const tickNews: string[] = [];

  // 1. Tick down razed state on ports
  Object.values(state.ports).forEach(port => {
    if (port.razedTicksRemaining > 0) {
      port.razedTicksRemaining--;
      if (port.razedTicksRemaining === 0) {
        tickNews.push(`Port ${port.name} has finished rebuilding and returned to normal production!`);
      }
    }
  });

  // 2. Resource production & upkeeps
  // Map player upkeeps and productions
  const playerProd: Record<string, { gold: number; goods: number }> = {};
  const playerUpkeep: Record<string, { gold: number }> = {};
  
  // Initialize maps
  Object.keys(state.players).forEach(pId => {
    playerProd[pId] = { gold: 0, goods: 0 };
    playerUpkeep[pId] = { gold: 0 };
  });

  // Calculate production of owned ports
  Object.values(state.ports).forEach(port => {
    if (port.ownerId && state.players[port.ownerId]) {
      const pId = port.ownerId;
      
      // Calculate multiplier based on razed ticks
      let multiplier = 1.0;
      if (port.razedTicksRemaining > 24) {
        multiplier = 1 / 3; // 48 ticks at 1/3
      } else if (port.razedTicksRemaining > 0) {
        multiplier = 2 / 3; // 24 ticks at 2/3
      }
      
      // Port production
      const goldProduced = Math.floor(port.baseGoldProduction * multiplier);
      const goodsProduced = Math.floor(port.baseGoodsProduction * multiplier);
      
      playerProd[pId].gold += goldProduced;
      playerProd[pId].goods += goodsProduced;
      
      // Upkeeps for stationed troops & scouts & ships in port
      const troopUpkeep = port.troops * UPKEEP_TROOP;
      const scoutUpkeep = port.scoutCount * UPKEEP_SCOUT;
      const shipUpkeep = (port.sloop * SHIP_CONFIGS.sloop.upkeepGold) +
                         (port.schooner * SHIP_CONFIGS.schooner.upkeepGold) +
                         (port.frigate * SHIP_CONFIGS.frigate.upkeepGold) +
                         (port.galleon * SHIP_CONFIGS.galleon.upkeepGold);
                         
      playerUpkeep[pId].gold += troopUpkeep + scoutUpkeep + shipUpkeep;
    } else {
      // NPC / independent port: accumulate gold and goods treasury
      if (port.gold === undefined) port.gold = 0;
      if (port.goods === undefined) port.goods = 0;
      
      let multiplier = 1.0;
      if (port.razedTicksRemaining > 24) {
        multiplier = 1 / 3;
      } else if (port.razedTicksRemaining > 0) {
        multiplier = 2 / 3;
      }
      
      const goldProduced = Math.floor(port.baseGoldProduction * multiplier);
      const goodsProduced = Math.floor(port.baseGoodsProduction * multiplier);
      
      port.gold += goldProduced;
      port.goods += goodsProduced;
      
      // Limit total hoard to prevent infinite growth
      if (port.gold > 15000) port.gold = 15000;
      if (port.goods > 6000) port.goods = 6000;
    }
  });

  // Upkeeps for fleets in transit
  state.campaigns.forEach(c => {
    if (state.players[c.senderId]) {
      const pId = c.senderId;
      const troopUpkeep = c.troops * UPKEEP_TROOP;
      const shipUpkeep = (c.sloop * SHIP_CONFIGS.sloop.upkeepGold) +
                         (c.schooner * SHIP_CONFIGS.schooner.upkeepGold) +
                         (c.frigate * SHIP_CONFIGS.frigate.upkeepGold) +
                         (c.galleon * SHIP_CONFIGS.galleon.upkeepGold);
                         
      playerUpkeep[pId].gold += troopUpkeep + shipUpkeep;
    }
  });

  // Apply production and upkeeps
  Object.keys(state.players).forEach(pId => {
    const p = state.players[pId];
    const prod = playerProd[pId];
    const upkeep = playerUpkeep[pId];
    
    // Add production
    p.gold += prod.gold;
    p.goods += prod.goods;
    
    // Deduct upkeep
    p.gold -= upkeep.gold;
    
    // Handle bankruptcy
    if (p.gold < 0) {
      // Player is in debt!
      const debt = Math.abs(p.gold);
      p.gold = 0;
      
      // Desertion & fleet damage!
      let desertionCount = 0;
      Object.values(state.ports).forEach(port => {
        if (port.ownerId === pId) {
          // 20% of troops desert due to lack of pay
          const troopLoss = Math.floor(port.troops * 0.2);
          port.troops -= troopLoss;
          desertionCount += troopLoss;
          
          // 20% of scouts leave
          const scoutLoss = Math.floor(port.scoutCount * 0.2);
          port.scoutCount -= scoutLoss;
        }
      });
      
      if (desertionCount > 0) {
        state.news.push({
          id: `desertion_${state.currentTick}_${pId}`,
          tick: state.currentTick,
          type: 'system',
          message: `FINANCIAL CRISIS: ${p.username}'s treasury is empty! ${desertionCount} pirates have deserted due to lack of pay.`,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Calculate Trade Route Gold Production
  // Trade routes require a Sloop or Schooner to be assigned, producing gold per route
  state.tradeRoutes.forEach(route => {
    if (route.active && state.players[route.ownerId]) {
      const p = state.players[route.ownerId];
      // Schooner routes are twice as lucrative
      const tradeBonus = route.shipType === 'schooner' ? 150 : 60;
      p.gold += tradeBonus;
    }
  });

  // 3. Process Campaigns / Military actions
  const campaignsToComplete: string[] = [];
  
  state.campaigns.forEach(c => {
    c.ticksRemaining--;
    
    // Check transitions
    if (c.type === 'transfer') {
      if (c.ticksRemaining === 0) {
        campaignsToComplete.push(c.id);
      }
    } else if (c.type !== 'scout') {
      // Standard Attack Transition (14 Ticks Total: 4 move, 5 battle, 5 return)
      if (c.ticksRemaining === 10) {
        // Battle starts! Set state to battling
        c.status = 'battling';
        const targetPort = state.ports[c.targetPortId];
        state.news.push({
          id: `battle_start_${c.id}`,
          tick: state.currentTick,
          type: 'battle',
          message: `BATTLE IN PROGRESS: ${c.senderName}'s fleet has engaged defences at Port ${c.targetPortName}! Conflict will rage for 5 ticks (75 mins).`,
          timestamp: new Date().toISOString(),
          senderPlayerId: c.senderId,
          targetPlayerId: targetPort ? (targetPort.ownerId || undefined) : undefined
        });
      } else if (c.ticksRemaining === 5) {
        // Battle finishes! Resolve and return
        c.status = 'returning';
        resolveBattle(c);
      } else if (c.ticksRemaining === 0) {
        // Returning fleet arrives back home
        campaignsToComplete.push(c.id);
      }
    } else {
      // Scout Transition (2 Ticks Total: 1 move/spy, 1 return)
      if (c.ticksRemaining === 1) {
        c.status = 'battling'; // spys/scouts are 'battling' (meaning actively scouting)
        resolveScout(c);
        c.status = 'returning';
      } else if (c.ticksRemaining === 0) {
        campaignsToComplete.push(c.id);
      }
    }
  });

  // Return fleets to home port or deliver transfer reinforcements to destination
  campaignsToComplete.forEach(cId => {
    const idx = state.campaigns.findIndex(cam => cam.id === cId);
    if (idx !== -1) {
      const c = state.campaigns[idx];
      if (c.type === 'transfer') {
        const destPort = state.ports[c.targetPortId];
        if (destPort) {
          destPort.sloop += c.sloop;
          destPort.schooner += c.schooner;
          destPort.frigate += c.frigate;
          destPort.galleon += c.galleon;
          destPort.troops += c.troops;
          destPort.cannons += c.cannons;
          destPort.governors += c.governors;
          
          state.news.push({
            id: `transfer_complete_${c.id}`,
            tick: state.currentTick,
            type: 'system',
            message: `CONVOY ARRIVED: Your reinforcement fleet from ${c.originPortName} has arrived at ${destPort.name}, merging ${c.sloop + c.schooner + c.frigate + c.galleon} ships, ${c.troops} crew, ${c.cannons} cannons, and ${c.governors} governors into the local garrison!`,
            timestamp: new Date().toISOString(),
            senderPlayerId: c.senderId,
            targetPlayerId: c.senderId
          });
        }
      } else {
        const homePort = state.ports[c.originPortId];
        if (homePort) {
          // Return surviving forces to home port
          homePort.sloop += c.sloop;
          homePort.schooner += c.schooner;
          homePort.frigate += c.frigate;
          homePort.galleon += c.galleon;
          if (c.type === 'scout') {
            homePort.scoutCount += c.troops;
          } else {
            homePort.troops += c.troops;
          }
          homePort.cannons += c.cannons;
          homePort.governors += c.governors;
        }
      }
      
      // Remove campaign
      state.campaigns.splice(idx, 1);
    }
  });

  // 4. Process Port Build and Training Queues
  Object.values(state.ports).forEach(port => {
    if (port.buildQueue && port.buildQueue.length > 0) {
      const completedIndices: number[] = [];
      
      port.buildQueue.forEach((item, index) => {
        item.ticksRemaining--;
        if (item.ticksRemaining <= 0) {
          completedIndices.push(index);
          
          // Apply completed assets to port
          if (item.type === 'troops') {
            port.troops += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `TRAINING COMPLETE: ${port.ownerName} has completed training ${item.count} troops at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'cannons') {
            port.cannons += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `CONSTRUCTION COMPLETE: ${port.ownerName} has completed construction of ${item.count} cannons at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'fort') {
            port.fortificationLevel += item.count;
            port.fortificationLevel = Math.min(5, port.fortificationLevel);
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `UPGRADE COMPLETE: ${port.ownerName} has successfully fortified ${port.name} to Level ${port.fortificationLevel}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'sloop') {
            port.sloop += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `SHIPYARD COMPLETE: ${port.ownerName} has finished building ${item.count} Sloop(s) at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'schooner') {
            port.schooner += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `SHIPYARD COMPLETE: ${port.ownerName} has finished building ${item.count} Schooner(s) at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'frigate') {
            port.frigate += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `SHIPYARD COMPLETE: ${port.ownerName} has finished building ${item.count} Frigate(s) at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          } else if (item.type === 'galleon') {
            port.galleon += item.count;
            state.news.push({
              id: `build_complete_${item.id}`,
              tick: state.currentTick,
              type: 'system',
              message: `SHIPYARD COMPLETE: ${port.ownerName} has finished building ${item.count} Galleon(s) at ${port.name}!`,
              timestamp: new Date().toISOString()
            });
          }
        }
      });
      
      // Remove completed items
      port.buildQueue = port.buildQueue.filter((_, idx) => !completedIndices.includes(idx));
    }
  });

  // 5. NPC automated AI activity (Repair, Recruit, Defend) - Grown VERY slowly as requested!
  NPC_FACTIONS.forEach(faction => {
    Object.values(state.ports).forEach(port => {
      if (port.ownerId === faction.id) {
        // NPC ports grow their garrisons and defenses very slowly for easy player conquest
        if (Math.random() > 0.90) {
          port.troops += 1; // Only 10% chance to gain 1 troop (previously 30% to gain 1-3)
        }
        if (Math.random() > 0.98) {
          port.fortificationLevel = Math.min(port.fortificationLevel + 1, 3); // Only 2% chance, max level capped at 3 for NPCs
        }
        if (Math.random() > 0.97) {
          if (port.cannons < 3) {
            port.cannons += 1; // Only 3% chance to build a cannon, cap at 3 (previously 10% chance to gain 1-2)
          }
        }
        // Build ships very rarely, max 1 sloop
        if (Math.random() > 0.99) {
          if (port.sloop < 1) port.sloop++;
        }
      }
    });
  });

  // Calculate new leader scores
  calculateScores();
  
  // Save updated state
  saveDb();
}

// Battle Resolution Engine
function resolveBattle(c: FleetCampaign) {
  const targetPort = state.ports[c.targetPortId];
  const attacker = state.players[c.senderId];
  if (!targetPort) return;
  
  const isTargetOwnedByPlayer = targetPort.ownerId !== null && state.players[targetPort.ownerId] !== undefined;
  const defenderPlayer = isTargetOwnedByPlayer ? state.players[targetPort.ownerId!] : null;
  const defenderName = defenderPlayer ? defenderPlayer.username : targetPort.ownerName;

  // 1. Calculate Attacking Power (with troops = 3 power, cannons = 8 power)
  const attackerShipPower = (c.sloop * SHIP_CONFIGS.sloop.combatPower) +
                            (c.schooner * SHIP_CONFIGS.schooner.combatPower) +
                            (c.frigate * SHIP_CONFIGS.frigate.combatPower) +
                            (c.galleon * SHIP_CONFIGS.galleon.combatPower);
                             
  // Attacking forces
  const attTroopPower = c.troops * 3;
  const attCannonPower = c.cannons * 8;
  const totalOffence = attackerShipPower + attTroopPower + attCannonPower;

  // 2. Calculate Defending Power
  const defenderShipPower = (targetPort.sloop * SHIP_CONFIGS.sloop.combatPower) +
                            (targetPort.schooner * SHIP_CONFIGS.schooner.combatPower) +
                            (targetPort.frigate * SHIP_CONFIGS.frigate.combatPower) +
                            (targetPort.galleon * SHIP_CONFIGS.galleon.combatPower);
                             
  const defTroopPower = targetPort.troops * 3;
  const defCannonPower = targetPort.cannons * 8;
  const fortPower = targetPort.fortificationLevel * 40; // fortification adds defensive buffer
  const totalDefence = defenderShipPower + defTroopPower + defCannonPower + fortPower;

  console.log(`Resolving Battle at ${targetPort.name}: Offence=${totalOffence} vs Defence=${totalDefence}`);

  // Base battle outcomes
  if (c.type === 'attack_conquer') {
    // 1. Conquer with fleet and Governor
    // Needs 3 times port defense offence
    const requiredOffence = totalDefence * 3;
    const canConquer = totalOffence >= requiredOffence && c.governors >= 1;
    
    if (canConquer) {
      // Conquest SUCCESSFUL!
      const ratio = totalOffence / Math.max(1, totalDefence);
      // Winner loss decreases, loser loss increases
      const baseWinnerLoss = 0.12; // lower base loss (12%)
      const winnerLossRatio = Math.max(0.04, baseWinnerLoss / Math.sqrt(ratio));
      
      const defenderSurvival = 0.05; // Defender is wiped out (5% survival)
      const attackerSurvival = 1 - winnerLossRatio;
      
      targetPort.troops = Math.max(0, Math.floor(targetPort.troops * defenderSurvival));
      targetPort.cannons = Math.max(0, Math.floor(targetPort.cannons * defenderSurvival));
      targetPort.sloop = 0;
      targetPort.schooner = 0;
      targetPort.frigate = 0;
      targetPort.galleon = 0;
      
      // Attacker casualties
      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.round(c.sloop * (1 - winnerLossRatio * 0.75)));
      c.schooner = Math.max(0, Math.round(c.schooner * (1 - winnerLossRatio * 0.75)));
      c.frigate = Math.max(0, Math.round(c.frigate * (1 - winnerLossRatio * 0.5)));
      c.galleon = Math.max(0, Math.round(c.galleon * (1 - winnerLossRatio * 0.4)));
      
      // Consume 1 Governor
      c.governors -= 1;
      
       // Transfer Port ownership
      const oldOwnerName = targetPort.ownerName;
      const oldOwnerId = targetPort.ownerId;
      targetPort.ownerId = c.senderId;
      targetPort.ownerName = c.senderName;
      targetPort.type = 'port'; // Now a standard player port
      
      const survivingTroops = c.troops;
      const survivingCannons = c.cannons;
      const survivingSloop = c.sloop;
      const survivingSchooner = c.schooner;
      const survivingFrigate = c.frigate;
      const survivingGalleon = c.galleon;

      // Station remaining forces directly at the newly conquered port!
      targetPort.troops += c.troops;
      targetPort.cannons += c.cannons;
      targetPort.sloop += c.sloop;
      targetPort.schooner += c.schooner;
      targetPort.frigate += c.frigate;
      targetPort.galleon += c.galleon;
      
      // Reset attacking campaign force since they stayed to garrison the port
      c.troops = 0;
      c.cannons = 0;
      c.sloop = 0;
      c.schooner = 0;
      c.frigate = 0;
      c.galleon = 0;
      
      c.outcome = `CONQUEST SUCCESSFUL! You conquered ${targetPort.name} from ${oldOwnerName} with ${totalOffence} Offence Power against their ${totalDefence} Defence Power! Your surviving forces (${survivingTroops} crew, ${survivingCannons} cannons, and ships [Sloop: ${survivingSloop}, Schooner: ${survivingSchooner}, Frigate: ${survivingFrigate}, Galleon: ${survivingGalleon}]) have successfully taken garrison of the port and are stationed there.`;
      
      state.news.push({
        id: `conquest_success_${c.id}`,
        tick: state.currentTick,
        type: 'conquest',
        message: `VICTORY! The pirate lord ${c.senderName} (Offence: ${totalOffence} Power) has captured the port of ${targetPort.name}, claiming it from ${oldOwnerName} (Defence: ${totalDefence} Power)!`,
        timestamp: new Date().toISOString(),
        senderPlayerId: c.senderId,
        targetPlayerId: oldOwnerId || undefined
      });
    } else {
      // Conquest FAILED!
      const ratio = totalDefence / Math.max(1, totalOffence);
      const baseWinnerLoss = 0.08; // Defender base loss
      const baseLoserLoss = 0.35; // Attacker base loss (tuned down from 75% to 35%)
      
      const winnerLossRatio = Math.max(0.02, baseWinnerLoss / Math.sqrt(ratio));
      const loserLossRatio = Math.max(baseLoserLoss, 1.0 - (1.0 - baseLoserLoss) / Math.pow(ratio, 0.6));
      
      const defenderSurvival = 1 - winnerLossRatio;
      const attackerSurvival = 1 - loserLossRatio;
      
      const oldAttackerTroops = c.troops;
      const oldAttackerCannons = c.cannons;
      const oldAttackerSloop = c.sloop;
      const oldAttackerSchooner = c.schooner;
      const oldAttackerFrigate = c.frigate;
      const oldAttackerGalleon = c.galleon;

      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.floor(c.sloop * (1 - loserLossRatio * 0.75)));
      c.schooner = Math.max(0, Math.floor(c.schooner * (1 - loserLossRatio * 0.75)));
      c.frigate = Math.max(0, Math.floor(c.frigate * (1 - loserLossRatio * 0.5)));
      c.galleon = Math.max(0, Math.floor(c.galleon * (1 - loserLossRatio * 0.4)));
      
      const lostTroops = oldAttackerTroops - c.troops;
      const lostCannons = oldAttackerCannons - c.cannons;
      const lostSloop = oldAttackerSloop - c.sloop;
      const lostSchooner = oldAttackerSchooner - c.schooner;
      const lostFrigate = oldAttackerFrigate - c.frigate;
      const lostGalleon = oldAttackerGalleon - c.galleon;

      targetPort.troops = Math.max(0, Math.floor(targetPort.troops * defenderSurvival));
      targetPort.cannons = Math.max(0, Math.floor(targetPort.cannons * defenderSurvival));
      
      c.outcome = `CONQUEST FAILED! The fortifications of ${targetPort.name} held. Combat Strength: Offence ${totalOffence} vs Defence ${totalDefence}. CASUALTIES: ${lostTroops} crew, ${lostCannons} cannons, and ships (${lostSloop} sl / ${lostSchooner} sch / ${lostFrigate} fr / ${lostGalleon} gl) were lost.`;
      
      state.news.push({
        id: `conquest_fail_${c.id}`,
        tick: state.currentTick,
        type: 'battle',
        message: `DEFENCE HELD: The assault on ${targetPort.name} by ${c.senderName} (Offence: ${totalOffence} Power) was repelled by ${defenderName}'s garrison (Defence: ${totalDefence} Power). Attacker lost ${lostTroops} crew & ${lostSloop + lostSchooner + lostFrigate + lostGalleon} ships. Defenders stand strong!`,
        timestamp: new Date().toISOString()
      });
    }
  } else if (c.type === 'attack_loot') {
    // 2. Loot and Plunder
    // Needs offence > defence
    const success = totalOffence > totalDefence;
    
    if (success) {
      // Plunder successful!
      const ratio = totalOffence / Math.max(1, totalDefence);
      const baseWinnerLoss = 0.06; // Attacker base loss (tuned down from 20% to 6%)
      const baseLoserLoss = 0.20; // Defender base loss (tuned down from 40% to 20%)
      
      const winnerLossRatio = Math.max(0.015, baseWinnerLoss / Math.sqrt(ratio));
      const loserLossRatio = Math.max(baseLoserLoss, 1.0 - (1.0 - baseLoserLoss) / Math.pow(ratio, 0.6));
      
      const attackerSurvival = 1 - winnerLossRatio;
      const defenderSurvival = 1 - loserLossRatio;
      
      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.round(c.sloop * (1 - winnerLossRatio * 0.5)));
      c.schooner = Math.max(0, Math.round(c.schooner * (1 - winnerLossRatio * 0.5)));
      c.frigate = Math.max(0, Math.round(c.frigate * (1 - winnerLossRatio * 0.3)));
      c.galleon = Math.max(0, Math.round(c.galleon * (1 - winnerLossRatio * 0.2)));
      
      targetPort.troops = Math.max(0, Math.floor(targetPort.troops * defenderSurvival));
      targetPort.cannons = Math.max(0, Math.floor(targetPort.cannons * defenderSurvival));
      
      // Calculate booty stole from defender's treasury
      let plunderedGold = 0;
      let plunderedGoods = 0;
      
      if (defenderPlayer) {
        plunderedGold = Math.floor(defenderPlayer.gold * 0.4); // steal 40% of treasury
        plunderedGoods = Math.floor(defenderPlayer.goods * 0.4);
        defenderPlayer.gold -= plunderedGold;
        defenderPlayer.goods -= plunderedGoods;
      } else {
        // NPC ports accumulate gold and goods; plunder loots 80% of it, with a base minimum
        plunderedGold = Math.floor((targetPort.gold || 0) * 0.8);
        plunderedGoods = Math.floor((targetPort.goods || 0) * 0.8);
        
        const minGold = Math.floor(targetPort.baseGoldProduction * 4);
        const minGoods = Math.floor(targetPort.baseGoodsProduction * 4);
        if (plunderedGold < minGold) plunderedGold = minGold;
        if (plunderedGoods < minGoods) plunderedGoods = minGoods;
        
        // Deduct from NPC port treasury
        targetPort.gold = Math.max(0, (targetPort.gold || 0) - plunderedGold);
        targetPort.goods = Math.max(0, (targetPort.goods || 0) - plunderedGoods);
      }
      
      // Cap plunder based on attacker's cargo space!
      // Ships have cargo: Sloop (300), Schooner (800), Frigate (2000), Galleon (5000)
      const cargoCapacity = (c.sloop * 300) + (c.schooner * 800) + (c.frigate * 2000) + (c.galleon * 5000);
      const totalBooty = plunderedGold + plunderedGoods;
      
      if (totalBooty > cargoCapacity) {
        const ratioCargo = cargoCapacity / totalBooty;
        plunderedGold = Math.floor(plunderedGold * ratioCargo);
        plunderedGoods = Math.floor(plunderedGoods * ratioCargo);
      }
      
      // Deposited directly on attacker treasury upon returning
      attacker.gold += plunderedGold;
      attacker.goods += plunderedGoods;
      
      c.outcome = `PLUNDER SUCCESSFUL! You plundered ${targetPort.name} (Offence: ${totalOffence} vs Defence: ${totalDefence} Power) of ${plunderedGold} Gold and ${plunderedGoods} Goods, and are sailing back with the booty!`;
      
      state.news.push({
        id: `loot_success_${c.id}`,
        tick: state.currentTick,
        type: 'loot',
        message: `PLUNDERED! ${c.senderName}'s fleet (Offence: ${totalOffence} Power) successfully looted the docks of ${targetPort.name} owned by ${defenderName} (Defence: ${totalDefence} Power), escaping with a massive chest of booty (${plunderedGold} Gold & ${plunderedGoods} Goods)!`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Plunder FAILED
      const ratio = totalDefence / Math.max(1, totalOffence);
      const baseWinnerLoss = 0.04; // Defender base loss
      const baseLoserLoss = 0.25; // Attacker base loss (tuned down from 50% to 25%)
      
      const winnerLossRatio = Math.max(0.01, baseWinnerLoss / Math.sqrt(ratio));
      const loserLossRatio = Math.max(baseLoserLoss, 1.0 - (1.0 - baseLoserLoss) / Math.pow(ratio, 0.6));
      
      const defenderSurvival = 1 - winnerLossRatio;
      const attackerSurvival = 1 - loserLossRatio;
      
      const oldAttackerTroops = c.troops;
      const oldAttackerCannons = c.cannons;
      const oldAttackerSloop = c.sloop;
      const oldAttackerSchooner = c.schooner;
      const oldAttackerFrigate = c.frigate;
      const oldAttackerGalleon = c.galleon;

      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.floor(c.sloop * (1 - loserLossRatio * 0.6)));
      c.schooner = Math.max(0, Math.floor(c.schooner * (1 - loserLossRatio * 0.6)));
      c.frigate = Math.max(0, Math.floor(c.frigate * (1 - loserLossRatio * 0.4)));
      c.galleon = Math.max(0, Math.floor(c.galleon * (1 - loserLossRatio * 0.3)));
      
      const lostTroops = oldAttackerTroops - c.troops;
      const lostCannons = oldAttackerCannons - c.cannons;
      const lostSloop = oldAttackerSloop - c.sloop;
      const lostSchooner = oldAttackerSchooner - c.schooner;
      const lostFrigate = oldAttackerFrigate - c.frigate;
      const lostGalleon = oldAttackerGalleon - c.galleon;

      targetPort.troops = Math.max(0, Math.floor(targetPort.troops * defenderSurvival));
      
      c.outcome = `PLUNDER FAILED! Your forces were defeated trying to loot ${targetPort.name}. Combat Strength: Offence ${totalOffence} vs Defence ${totalDefence}. CASUALTIES: ${lostTroops} crew, ${lostCannons} cannons, and ships (${lostSloop} sl / ${lostSchooner} sch / ${lostFrigate} fr / ${lostGalleon} gl) were lost.`;
      
      state.news.push({
        id: `loot_fail_${c.id}`,
        tick: state.currentTick,
        type: 'battle',
        message: `PLUNDER REPELLED: ${c.senderName} (Offence: ${totalOffence} Power) tried to plunder ${targetPort.name} but was beaten back by ${defenderName}'s garrison (Defence: ${totalDefence} Power). Attacker lost ${lostTroops} crew and ${lostSloop + lostSchooner + lostFrigate + lostGalleon} vessels.`,
        timestamp: new Date().toISOString()
      });
    }
  } else if (c.type === 'attack_raze') {
    // 3. Raze and Kill
    // Pirates destroy the city, causing high casualties to defender.
    // 1/3 production for 48 ticks, 2/3 for 24 ticks, then normal.
    const success = totalOffence > totalDefence;
    
    if (success) {
      // Raze SUCCESSFUL!
      const ratio = totalOffence / Math.max(1, totalDefence);
      const baseWinnerLoss = 0.08; // Attacker base loss (tuned down from 25% to 8%)
      const baseLoserLoss = 0.60; // Defender base loss (tuned down from 80% to 60%)
      
      const winnerLossRatio = Math.max(0.02, baseWinnerLoss / Math.sqrt(ratio));
      const loserLossRatio = Math.max(baseLoserLoss, 1.0 - (1.0 - baseLoserLoss) / Math.pow(ratio, 0.5));
      
      const attackerSurvival = 1 - winnerLossRatio;
      const defenderSurvival = 1 - loserLossRatio;
      
      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.round(c.sloop * (1 - winnerLossRatio * 0.6)));
      c.schooner = Math.max(0, Math.round(c.schooner * (1 - winnerLossRatio * 0.6)));
      c.frigate = Math.max(0, Math.round(c.frigate * (1 - winnerLossRatio * 0.4)));
      c.galleon = Math.max(0, Math.round(c.galleon * (1 - winnerLossRatio * 0.3)));
      
      const killedTroops = Math.floor(targetPort.troops * loserLossRatio);
      const killedCannons = Math.floor(targetPort.cannons * loserLossRatio);
      
      targetPort.troops -= killedTroops;
      targetPort.cannons -= killedCannons;
      targetPort.fortificationLevel = Math.max(1, targetPort.fortificationLevel - 2);
      
      // Inflict raze status: 72 ticks total (48 + 24)
      targetPort.razedTicksRemaining = 72;
      
      c.outcome = `RAZE SUCCESSFUL! You devastated ${targetPort.name} (Offence: ${totalOffence} vs Defence: ${totalDefence} Power), destroying their infrastructure. Their production is crippled for 72 ticks (18 hours)!`;
      
      state.news.push({
        id: `raze_success_${c.id}`,
        tick: state.currentTick,
        type: 'raze',
        message: `CATASTROPHE: ${c.senderName} (Offence: ${totalOffence} Power) has razed the port of ${targetPort.name} owned by ${defenderName} (Defence: ${totalDefence} Power)! Massive casualties reported, and docks are burning! Production is crippled for 72 Ticks.`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Raze FAILED
      const ratio = totalDefence / Math.max(1, totalOffence);
      const baseWinnerLoss = 0.06; // Defender base loss
      const baseLoserLoss = 0.30; // Attacker base loss (tuned down from 60% to 30%)
      
      const winnerLossRatio = Math.max(0.015, baseWinnerLoss / Math.sqrt(ratio));
      const loserLossRatio = Math.max(baseLoserLoss, 1.0 - (1.0 - baseLoserLoss) / Math.pow(ratio, 0.6));
      
      const defenderSurvival = 1 - winnerLossRatio;
      const attackerSurvival = 1 - loserLossRatio;
      
      const oldAttackerTroops = c.troops;
      const oldAttackerCannons = c.cannons;
      const oldAttackerSloop = c.sloop;
      const oldAttackerSchooner = c.schooner;
      const oldAttackerFrigate = c.frigate;
      const oldAttackerGalleon = c.galleon;

      c.troops = Math.max(0, Math.floor(c.troops * attackerSurvival));
      c.cannons = Math.max(0, Math.floor(c.cannons * attackerSurvival));
      c.sloop = Math.max(0, Math.floor(c.sloop * (1 - loserLossRatio * 0.65)));
      c.schooner = Math.max(0, Math.floor(c.schooner * (1 - loserLossRatio * 0.65)));
      c.frigate = Math.max(0, Math.floor(c.frigate * (1 - loserLossRatio * 0.45)));
      c.galleon = Math.max(0, Math.floor(c.galleon * (1 - loserLossRatio * 0.35)));
      
      const lostTroops = oldAttackerTroops - c.troops;
      const lostCannons = oldAttackerCannons - c.cannons;
      const lostSloop = oldAttackerSloop - c.sloop;
      const lostSchooner = oldAttackerSchooner - c.schooner;
      const lostFrigate = oldAttackerFrigate - c.frigate;
      const lostGalleon = oldAttackerGalleon - c.galleon;

      targetPort.troops = Math.max(0, Math.floor(targetPort.troops * defenderSurvival));
      
      c.outcome = `RAZE FAILED! You were unable to breach ${targetPort.name}'s gate. Combat Strength: Offence ${totalOffence} vs Defence ${totalDefence}. CASUALTIES: ${lostTroops} crew, ${lostCannons} cannons, and ships (${lostSloop} sl / ${lostSchooner} sch / ${lostFrigate} fr / ${lostGalleon} gl) were lost.`;
      
      state.news.push({
        id: `raze_fail_${c.id}`,
        tick: state.currentTick,
        type: 'battle',
        message: `RAZE REPELLED: The brutal attempt to raze ${targetPort.name} by ${c.senderName} (Offence: ${totalOffence} Power) was stopped at the city walls by defenders (Defence: ${totalDefence} Power). Attacker lost ${lostTroops} crew & ${lostSloop + lostSchooner + lostFrigate + lostGalleon} vessels.`,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Scout Spy Resolution
function resolveScout(c: FleetCampaign) {
  const targetPort = state.ports[c.targetPortId];
  if (!targetPort) return;

  // Add spy notification if target port has more than 3 stationed counter-spies
  if (targetPort.scoutCount > 3) {
    state.news.push({
      id: `spy_alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      tick: state.currentTick,
      type: 'battle',
      message: `SPY DETECTED: Covert spies from Lord ${c.senderName} were detected scouting your port of ${targetPort.name}! Your garrison of ${targetPort.scoutCount} counter-spies successfully intercepted their operations and recorded the intrusion.`,
      timestamp: new Date().toISOString(),
      senderPlayerId: c.senderId,
      targetPlayerId: targetPort.ownerId || undefined
    });
  }

  // Compile intelligence
  // Determine if port has active outgoing fleets
  const activeFleets = state.campaigns
    .filter(cam => cam.originPortId === targetPort.id)
    .map(cam => ({
      type: cam.type,
      status: cam.status,
      ticksRemaining: cam.ticksRemaining,
      destination: cam.targetPortName
    }));

  const targetOwner = targetPort.ownerId ? state.players[targetPort.ownerId] : null;
  const reportGold = targetOwner ? targetOwner.gold : (targetPort.gold || 0);
  const reportGoods = targetOwner ? targetOwner.goods : (targetPort.goods || 0);

  const report: ScoutReport = {
    id: `report_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    senderId: c.senderId,
    targetPortId: targetPort.id,
    targetPortName: targetPort.name,
    scoutTick: state.currentTick,
    troops: targetPort.troops,
    cannons: targetPort.cannons,
    sloop: targetPort.sloop,
    schooner: targetPort.schooner,
    frigate: targetPort.frigate,
    galleon: targetPort.galleon,
    fortificationLevel: targetPort.fortificationLevel,
    activeFleets,
    gold: reportGold,
    goods: reportGoods
  };

  state.scoutReports.push(report);
  c.outcome = `SCOUTING COMPLETED! Your spies successfully mapped out defences at ${targetPort.name} and are returning with detailed blueprints.`;
  saveDb();
}

// REST APIs
const app = express();
app.use(express.json());

// Global request execution queue to serialize all API reads and writes on this instance,
// preventing asynchronous race conditions that cause data loss / disappeared players.
let requestQueue: Promise<any> = Promise.resolve();

const queueMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let resolved = false;
  
  const nextPromise = new Promise<void>((resolve) => {
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Timeout after 15 seconds to prevent any deadlock
    const timeout = setTimeout(() => {
      console.warn(`Request to ${req.method} ${req.originalUrl} timed out in execution queue`);
      done();
    }, 15000);

    requestQueue.then(async () => {
      // Intercept the response end method to resolve when response is fully completed
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        clearTimeout(timeout);
        const endResult = originalEnd.apply(this, args);
        done();
        return endResult;
      };

      req.on('close', () => {
        clearTimeout(timeout);
        done();
      });

      try {
        next();
      } catch (err) {
        console.error('Error in queued request:', err);
        clearTimeout(timeout);
        done();
      }
    });
  });
  
  requestQueue = nextPromise.catch(() => {});
};

// Middleware to ensure game state is perfectly synchronized with Firestore
const syncStateMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await loadStateFromFirestore(false);
    next();
  } catch (err) {
    console.error('Error in syncStateMiddleware:', err);
    next();
  }
};

app.use('/api', queueMiddleware, syncStateMiddleware);

// Auth middleware helper
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const player = state.players[token];
  if (!player) {
    return res.status(403).json({ error: 'Session expired or invalid token' });
  }
  
  // Track activity
  player.lastActiveTime = new Date().toISOString();
  (req as any).player = player;
  next();
}

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, flagId, flagColor } = req.body;
  
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'Valid Username is required (min 2 characters)' });
  }
  const name = username.trim();

  let recoveryEmail = '';
  if (email && typeof email === 'string' && email.trim().length > 0) {
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required if you provide one' });
    }
    recoveryEmail = email.trim().toLowerCase();
  }

  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }
  
  // Cap at 40 active players
  if (Object.keys(state.players).length >= 40) {
    return res.status(400).json({ error: 'The waters are full! Maximum of 40 players reached.' });
  }
  
  // Check duplicate name
  const isDuplicate = Object.values(state.players).some(p => p.username.toLowerCase() === name.toLowerCase());
  if (isDuplicate) {
    return res.status(400).json({ error: 'This pirate name is already feared on these waters!' });
  }

  // Create Player ID (Token)
  const playerId = `pirate_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Find a suitable starting port (Unowned independent port, or any NPC independent port)
  const candidatePorts = Object.values(state.ports).filter(p => p.ownerId === 'npc_independent' || p.ownerId === null);
  
  if (candidatePorts.length === 0) {
    return res.status(500).json({ error: 'No islands left to colonize! Try plundering.' });
  }
  
  // Pick random candidate starting port
  const startPort = candidatePorts[Math.floor(Math.random() * candidatePorts.length)];
  
  // Initialize starting port
  startPort.ownerId = playerId;
  startPort.ownerName = name;
  startPort.type = 'port';
  startPort.troops = 15; // handfull of men
  startPort.cannons = 4;
  startPort.sloop = 1; // 1 small boat
  startPort.schooner = 0;
  startPort.frigate = 0;
  startPort.galleon = 0;
  startPort.fortificationLevel = 1;

  // Add player to register
  const newPlayer: Player = {
    id: playerId,
    username: name,
    flagId: Number(flagId) || 1,
    flagColor: flagColor || '#e11d48',
    score: 1100, // 1000 for starting port + military
    gold: 1500, // starting funds
    goods: 600, // starting cargo
    lastActiveTime: new Date().toISOString()
  };
  
  state.players[playerId] = newPlayer;

  // Hash & Save password
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  if (!state.authStore) state.authStore = {};
  state.authStore[name.toLowerCase()] = {
    passwordHash,
    salt,
    email: recoveryEmail
  };
  
  state.news.push({
    id: `new_player_${playerId}`,
    tick: state.currentTick,
    type: 'system',
    message: `NEW PIRATE LORD: ${name} has sailed into these waters, claiming ${startPort.name} as their dread fortress!`,
    timestamp: new Date().toISOString()
  });

  calculateScores();
  saveDb();
  
  res.json({ token: playerId, player: newPlayer });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  const player = Object.values(state.players).find(
    p => p.username.toLowerCase() === username.trim().toLowerCase()
  );
  
  if (!player) {
    return res.status(404).json({ error: 'Dread pirate not found. Register an account!' });
  }

  // Handle credentials check
  if (!state.authStore) state.authStore = {};
  let authData = state.authStore[player.username.toLowerCase()];
  if (!authData) {
    // Graceful onboarding for legacy accounts: set their password upon first login!
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    state.authStore[player.username.toLowerCase()] = {
      passwordHash,
      salt,
      email: 'legacy_recovery@example.com'
    };
    authData = state.authStore[player.username.toLowerCase()];
  } else {
    // Verify password
    const checkHash = hashPassword(password, authData.salt);
    if (checkHash !== authData.passwordHash) {
      return res.status(401).json({ error: 'Invalid secret key (password), Captain!' });
    }
  }
  
  player.lastActiveTime = new Date().toISOString();
  saveDb();
  
  res.json({ token: player.id, player });
});

app.post('/api/auth/recover', (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !email || !newPassword) {
    return res.status(400).json({ error: 'Username, recovery email and new password are required' });
  }

  if (!state.authStore) state.authStore = {};
  const authData = state.authStore[username.trim().toLowerCase()];
  
  if (!authData || authData.email.toLowerCase() !== email.trim().toLowerCase()) {
    return res.status(400).json({ error: 'Captain, the pirate name and recovery email do not match our ship logs!' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  // Update password credentials
  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  state.authStore[username.trim().toLowerCase()] = {
    passwordHash,
    salt,
    email: email.trim().toLowerCase()
  };

  saveDb();
  res.json({ success: true, message: 'Password reset successfully, Captain!' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json((req as any).player);
});

// Game state retrieval
app.get('/api/game/state', (req, res) => {
  // Client polls or loads full game state
  // Calculate dynamic tick progression (lazy ticks!)
  const now = new Date().getTime();
  
  if (state.isPaused) {
    // Keep bumping lastTickTime to current time so there's no catch-up ticks upon unpausing
    state.lastTickTime = new Date().toISOString();
  } else {
    const lastTick = new Date(state.lastTickTime).getTime();
    let tickDuration = 15 * 60 * 1000; // 15 mins in normal
    if (state.tickSpeedMode === 'fast') {
      tickDuration = 30000; // 30s in fast
    } else if (state.tickSpeedMode === 'debug') {
      tickDuration = 5 * 60 * 1000; // 5 mins in debug
    }
    
    const elapsed = now - lastTick;
    if (elapsed >= tickDuration) {
      const ticksToRun = Math.floor(elapsed / tickDuration);
      // Limit tick catch-up to prevent huge loops (max 10 ticks per request)
      const runs = Math.min(ticksToRun, 10);
      for (let i = 0; i < runs; i++) {
        processGameTick();
      }
      saveDb();
    }
  }

  // Direct message security filtering
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const player = token ? state.players[token] : null;

  if (player) {
    const filteredDMs = (state.directMessages || []).filter(
      dm => dm.senderId === player.id || dm.receiverId === player.id
    );
    res.json({
      ...state,
      directMessages: filteredDMs
    });
  } else {
    res.json({
      ...state,
      directMessages: []
    });
  }
});

// Port Economy Command APIs
app.post('/api/game/train', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { portId, type, count } = req.body; // type: 'troops' | 'cannons' | 'governors' | 'scout' | 'fort'
  
  const port = state.ports[portId];
  if (!port || port.ownerId !== player.id) {
    return res.status(403).json({ error: 'You do not own this port!' });
  }

  if (port.razedTicksRemaining > 24) {
    return res.status(400).json({ error: 'Docks are heavily damaged from a recent raze! Cannot train or build.' });
  }

  const num = Math.floor(Number(count));
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Invalid count' });
  }

  let totalCost = 0;
  let description = '';

  if (type === 'troops') {
    totalCost = num * COST_TROOP;
    if (player.gold < totalCost) {
      return res.status(400).json({ error: `Insufficient Gold. Needs ${totalCost} Gold.` });
    }
    player.gold -= totalCost;
    if (!port.buildQueue) {
      port.buildQueue = [];
    }
    port.buildQueue.push({
      id: `train_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'troops',
      count: num,
      ticksRemaining: 8,
      totalTicks: 8
    });
    description = `Drafted ${num} troops at ${port.name} (will complete training in 8 ticks)`;
  } else if (type === 'cannons') {
    totalCost = num * COST_CANNON;
    if (player.gold < totalCost) {
      return res.status(400).json({ error: `Insufficient Gold. Needs ${totalCost} Gold.` });
    }
    player.gold -= totalCost;
    if (!port.buildQueue) {
      port.buildQueue = [];
    }
    port.buildQueue.push({
      id: `train_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'cannons',
      count: num,
      ticksRemaining: 8,
      totalTicks: 8
    });
    description = `Ordered ${num} cannons at ${port.name} (will complete construction in 8 ticks)`;
  } else if (type === 'governors') {
    totalCost = num * COST_GOVERNOR;
    if (player.gold < totalCost) {
      return res.status(400).json({ error: `Insufficient Gold. Needs ${totalCost} Gold.` });
    }
    player.gold -= totalCost;
    port.governors += num;
    description = `Recruited ${num} Governor at ${port.name}`;
  } else if (type === 'scout') {
    totalCost = num * COST_SCOUT;
    if (player.gold < totalCost) {
      return res.status(400).json({ error: `Insufficient Gold. Needs ${totalCost} Gold.` });
    }
    player.gold -= totalCost;
    port.scoutCount += num;
    description = `Hired ${num} scouts at ${port.name}`;
  } else if (type === 'fort') {
    // Fortification up to max 5
    if (port.fortificationLevel >= 5) {
      return res.status(400).json({ error: 'Fortifications are already at maximum strength (Level 5)!' });
    }
    // Check if there's already a fort upgrade in the queue to prevent overflow or overlapping upgrades
    const isUpgrading = port.buildQueue?.some(item => item.type === 'fort');
    if (isUpgrading) {
      return res.status(400).json({ error: 'There is already a fortification upgrade in progress at this port!' });
    }

    const currentFort = port.fortificationLevel;
    const upgradeLevels = Math.min(num, 5 - currentFort);
    
    const goldCost = upgradeLevels * COST_FORTIFICATION;
    const goodsCost = upgradeLevels * 100;
    
    if (player.gold < goldCost || player.goods < goodsCost) {
      return res.status(400).json({ error: `Upgrade requires ${goldCost} Gold and ${goodsCost} Goods.` });
    }
    
    player.gold -= goldCost;
    player.goods -= goodsCost;
    if (!port.buildQueue) {
      port.buildQueue = [];
    }
    port.buildQueue.push({
      id: `fort_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'fort',
      count: upgradeLevels,
      ticksRemaining: 12,
      totalTicks: 12
    });
    description = `Commissioned fortification upgrade to Level ${currentFort + upgradeLevels} at ${port.name} (will complete in 12 ticks)`;
  } else {
    return res.status(400).json({ error: 'Invalid recruit/upgrade type' });
  }

  calculateScores();
  saveDb();
  res.json({ success: true, message: description, player, port });
});

app.post('/api/game/build', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { portId, shipSize, count } = req.body; // shipSize: 'sloop' | 'schooner' | 'frigate' | 'galleon'
  
  const port = state.ports[portId];
  if (!port || port.ownerId !== player.id) {
    return res.status(403).json({ error: 'You do not own this port!' });
  }

  if (port.razedTicksRemaining > 24) {
    return res.status(400).json({ error: 'Docks are heavily damaged from a recent raze! Shipyard is offline.' });
  }

  const shipType = shipSize as 'sloop' | 'schooner' | 'frigate' | 'galleon';
  const config = SHIP_CONFIGS[shipType];
  if (!config) {
    return res.status(400).json({ error: 'Invalid ship size' });
  }

  const num = Math.floor(Number(count));
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Invalid ship build count' });
  }

  const totalGold = num * config.costGold;
  const totalGoods = num * config.costGoods;

  if (player.gold < totalGold || player.goods < totalGoods) {
    return res.status(400).json({ error: `Insufficient materials. Building ${num} ${config.name} requires ${totalGold} Gold and ${totalGoods} Goods.` });
  }

  // Deduct resources
  player.gold -= totalGold;
  player.goods -= totalGoods;
  
  const buildTicks = {
    sloop: 6,
    schooner: 10,
    frigate: 12,
    galleon: 16
  }[shipType];

  if (!port.buildQueue) {
    port.buildQueue = [];
  }
  port.buildQueue.push({
    id: `build_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: shipType,
    count: num,
    ticksRemaining: buildTicks,
    totalTicks: buildTicks
  });

  calculateScores();
  saveDb();
  res.json({ success: true, message: `Commissioned construction of ${num} ${config.name}(s) at ${port.name}. Work will complete in ${buildTicks} ticks.`, player, port });
});

// Launch fleet campaigns (attacks or scout)
app.post('/api/game/attack', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { 
    originPortId, 
    targetPortId, 
    type, // 'attack_conquer' | 'attack_loot' | 'attack_raze'
    sloop, 
    schooner, 
    frigate, 
    galleon, 
    troops, 
    cannons, 
    governors 
  } = req.body;

  const originPort = state.ports[originPortId];
  const targetPort = state.ports[targetPortId];

  if (!originPort || originPort.ownerId !== player.id) {
    return res.status(403).json({ error: 'You do not own the departure port!' });
  }
  if (!targetPort) {
    return res.status(404).json({ error: 'Target destination port not found!' });
  }
  if (originPortId === targetPortId) {
    return res.status(400).json({ error: 'You cannot launch an armada against yourself!' });
  }

  // Validate quantities
  const s = Math.max(0, Math.floor(Number(sloop) || 0));
  const sc = Math.max(0, Math.floor(Number(schooner) || 0));
  const f = Math.max(0, Math.floor(Number(frigate) || 0));
  const g = Math.max(0, Math.floor(Number(galleon) || 0));
  const t = Math.max(0, Math.floor(Number(troops) || 0));
  const c = Math.max(0, Math.floor(Number(cannons) || 0));
  const gov = Math.max(0, Math.floor(Number(governors) || 0));

  // Verify availability in origin port
  if (originPort.sloop < s || originPort.schooner < sc || originPort.frigate < f || originPort.galleon < g) {
    return res.status(400).json({ error: 'Not enough ships available in port garrison!' });
  }
  if (originPort.troops < t || originPort.cannons < c || originPort.governors < gov) {
    return res.status(400).json({ error: 'Not enough crew, cannons, or governors in port garrison!' });
  }

  const totalShips = s + sc + f + g;
  if (totalShips === 0) {
    return res.status(400).json({ error: 'You must send at least one ship to sail the fleet!' });
  }

  // Validate capacities
  const crewCapacity = (s * SHIP_CONFIGS.sloop.crewCapacity) +
                        (sc * SHIP_CONFIGS.schooner.crewCapacity) +
                        (f * SHIP_CONFIGS.frigate.crewCapacity) +
                        (g * SHIP_CONFIGS.galleon.crewCapacity);
                        
  const cannonCapacity = (s * SHIP_CONFIGS.sloop.cannonCapacity) +
                         (sc * SHIP_CONFIGS.schooner.cannonCapacity) +
                         (f * SHIP_CONFIGS.frigate.cannonCapacity) +
                         (g * SHIP_CONFIGS.galleon.cannonCapacity);

  if (t + gov > crewCapacity) {
    return res.status(400).json({ error: `Crew capacity exceeded! Selected ships can carry up to ${crewCapacity} men (sent ${t + gov}).` });
  }
  if (c > cannonCapacity) {
    return res.status(400).json({ error: `Cannon capacity exceeded! Selected ships can fit up to ${cannonCapacity} cannons (sent ${c}).` });
  }

  if (type === 'attack_conquer' && gov < 1) {
    return res.status(400).json({ error: 'Conquering a port requires at least 1 trained Governor to administer the territory!' });
  }

  // Deduct from origin port
  originPort.sloop -= s;
  originPort.schooner -= sc;
  originPort.frigate -= f;
  originPort.galleon -= g;
  originPort.troops -= t;
  originPort.cannons -= c;
  originPort.governors -= gov;

  // Create Campaign (Total 14 ticks: 4 move, 5 battle, 5 return)
  const campaign: FleetCampaign = {
    id: `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    originPortId: originPort.id,
    originPortName: originPort.name,
    targetPortId: targetPort.id,
    targetPortName: targetPort.name,
    type: type as any,
    status: 'moving',
    ticksRemaining: 14,
    totalDuration: 14,
    sloop: s,
    schooner: sc,
    frigate: f,
    galleon: g,
    troops: t,
    cannons: c,
    governors: gov,
    outcome: null
  };

  state.campaigns.push(campaign);
  
  state.news.push({
    id: `campaign_launch_${campaign.id}`,
    tick: state.currentTick,
    type: 'system',
    message: `ARMADA SPOTTED: ${player.username} has launched a massive fleet of ${totalShips} ships from ${originPort.name} heading towards ${targetPort.name}! ETA: 4 ticks.`,
    timestamp: new Date().toISOString()
  });

  saveDb();
  res.json({ success: true, message: `Armada set sail! The voyage will take 4 ticks to arrive.`, campaign, port: originPort });
});

// Transfer Fleet between owned ports
app.post('/api/game/transfer', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { 
    originPortId, 
    targetPortId, 
    sloop, 
    schooner, 
    frigate, 
    galleon, 
    troops, 
    cannons, 
    governors 
  } = req.body;

  const originPort = state.ports[originPortId];
  const targetPort = state.ports[targetPortId];

  if (!originPort || originPort.ownerId !== player.id) {
    return res.status(403).json({ error: 'You do not own the origin port!' });
  }
  if (!targetPort || targetPort.ownerId !== player.id) {
    return res.status(403).json({ error: 'You must own the target port to transfer assets safely!' });
  }
  if (originPortId === targetPortId) {
    return res.status(400).json({ error: 'Origin and destination ports must be different!' });
  }

  // Validate quantities
  const s = Math.max(0, Math.floor(Number(sloop) || 0));
  const sc = Math.max(0, Math.floor(Number(schooner) || 0));
  const f = Math.max(0, Math.floor(Number(frigate) || 0));
  const g = Math.max(0, Math.floor(Number(galleon) || 0));
  const t = Math.max(0, Math.floor(Number(troops) || 0));
  const c = Math.max(0, Math.floor(Number(cannons) || 0));
  const gov = Math.max(0, Math.floor(Number(governors) || 0));

  // Verify availability in origin port
  if (originPort.sloop < s || originPort.schooner < sc || originPort.frigate < f || originPort.galleon < g) {
    return res.status(400).json({ error: 'Not enough ships available in port garrison!' });
  }
  if (originPort.troops < t || originPort.cannons < c || originPort.governors < gov) {
    return res.status(400).json({ error: 'Not enough crew, cannons, or governors in port garrison!' });
  }

  const totalShips = s + sc + f + g;
  if (totalShips === 0) {
    return res.status(400).json({ error: 'You must send at least one ship to sail the transfer convoy!' });
  }

  // Validate capacities
  const crewCapacity = (s * SHIP_CONFIGS.sloop.crewCapacity) +
                        (sc * SHIP_CONFIGS.schooner.crewCapacity) +
                        (f * SHIP_CONFIGS.frigate.crewCapacity) +
                        (g * SHIP_CONFIGS.galleon.crewCapacity);
                        
  const cannonCapacity = (s * SHIP_CONFIGS.sloop.cannonCapacity) +
                         (sc * SHIP_CONFIGS.schooner.cannonCapacity) +
                         (f * SHIP_CONFIGS.frigate.cannonCapacity) +
                         (g * SHIP_CONFIGS.galleon.cannonCapacity);

  if (t + gov > crewCapacity) {
    return res.status(400).json({ error: `Crew capacity exceeded! Selected ships can carry up to ${crewCapacity} men (sent ${t + gov}).` });
  }
  if (c > cannonCapacity) {
    return res.status(400).json({ error: `Cannon capacity exceeded! Selected ships can fit up to ${cannonCapacity} cannons (sent ${c}).` });
  }

  // Deduct from origin port
  originPort.sloop -= s;
  originPort.schooner -= sc;
  originPort.frigate -= f;
  originPort.galleon -= g;
  originPort.troops -= t;
  originPort.cannons -= c;
  originPort.governors -= gov;

  // Create Campaign
  const campaign: FleetCampaign = {
    id: `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    originPortId: originPort.id,
    originPortName: originPort.name,
    targetPortId: targetPort.id,
    targetPortName: targetPort.name,
    type: 'transfer',
    status: 'moving',
    ticksRemaining: 4,
    totalDuration: 4,
    sloop: s,
    schooner: sc,
    frigate: f,
    galleon: g,
    troops: t,
    cannons: c,
    governors: gov,
    outcome: null
  };

  state.campaigns.push(campaign);
  
  state.news.push({
    id: `campaign_launch_${campaign.id}`,
    tick: state.currentTick,
    type: 'system',
    message: `TRANSFER FLEET: ${player.username} has dispatched a transfer convoy of ${totalShips} ships from ${originPort.name} to reinforce ${targetPort.name}! ETA: 4 ticks.`,
    timestamp: new Date().toISOString(),
    senderPlayerId: player.id,
    targetPlayerId: player.id
  });

  saveDb();
  res.json({ success: true, message: `Transfer convoy has departed! The voyage will take 4 ticks to arrive.`, campaign, port: originPort });
});

// Scout Spies Mission
app.post('/api/game/scout', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { originPortId, targetPortId } = req.body;

  const originPort = state.ports[originPortId];
  const targetPort = state.ports[targetPortId];

  if (!originPort || originPort.ownerId !== player.id) {
    return res.status(403).json({ error: 'You do not own the source port!' });
  }
  if (!targetPort) {
    return res.status(404).json({ error: 'Target port not found!' });
  }
  if (originPort.scoutCount < 1) {
    return res.status(400).json({ error: 'You have no scouts stationed at this port! Hire some scouts first.' });
  }
  if (originPort.sloop < 1) {
    return res.status(400).json({ error: 'Scouts require at least 1 fast Sloop to reach the destination undetected!' });
  }

  // Deploy 1 scout and 1 Sloop
  originPort.scoutCount -= 1;
  originPort.sloop -= 1;

  // Create Campaign (Total 2 ticks: 1 move/spy, 1 return)
  const campaign: FleetCampaign = {
    id: `scout_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    originPortId: originPort.id,
    originPortName: originPort.name,
    targetPortId: targetPort.id,
    targetPortName: targetPort.name,
    type: 'scout',
    status: 'moving',
    ticksRemaining: 2,
    totalDuration: 2,
    sloop: 1,
    schooner: 0,
    frigate: 0,
    galleon: 0,
    troops: 1, // 1 scout acts as troop
    cannons: 0,
    governors: 0,
    outcome: null
  };

  state.campaigns.push(campaign);
  saveDb();
  res.json({ success: true, message: 'Scout sloop deployed in stealth! ETA for intel: 1 tick.', campaign });
});

// Establish Trade Route
app.post('/api/game/trade', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { portAId, portBId, shipType } = req.body; // shipType: 'sloop' | 'schooner'

  const portA = state.ports[portAId];
  const portB = state.ports[portBId];

  if (!portA || portA.ownerId !== player.id || !portB || portB.ownerId !== player.id) {
    return res.status(400).json({ error: 'You must own BOTH ports to establish a trade route!' });
  }
  if (portAId === portBId) {
    return res.status(400).json({ error: 'You cannot trade with yourself at the same port!' });
  }

  // Check if route already exists
  const exists = state.tradeRoutes.some(r => 
    (r.portAId === portAId && r.portBId === portBId) || 
    (r.portAId === portBId && r.portBId === portAId)
  );

  if (exists) {
    return res.status(400).json({ error: 'A trade route is already active between these ports!' });
  }

  if (portA[shipType] < 1) {
    return res.status(400).json({ error: `No spare ${shipType} available at ${portA.name} to run the trade route!` });
  }

  // Dedicate the ship from Port A
  portA[shipType] -= 1;

  const newRoute: TradeRoute = {
    id: `route_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    ownerId: player.id,
    portAId,
    portBId,
    shipType,
    active: true
  };

  state.tradeRoutes.push(newRoute);
  
  state.news.push({
    id: `trade_route_${newRoute.id}`,
    tick: state.currentTick,
    type: 'trade',
    message: `TRADE SECURED: ${player.username} has established a secure commercial trade route between ${portA.name} and ${portB.name} running a ${shipType}!`,
    timestamp: new Date().toISOString()
  });

  calculateScores();
  saveDb();
  res.json({ success: true, message: `Trade route established! Yields extra gold every 15 minutes.`, route: newRoute });
});

// Cancel Trade Route (Reclaim ship)
app.post('/api/game/trade/cancel', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { routeId } = req.body;

  const idx = state.tradeRoutes.findIndex(r => r.id === routeId && r.ownerId === player.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Trade route not found!' });
  }

  const route = state.tradeRoutes[idx];
  const port = state.ports[route.portAId];

  // Return ship to Port A
  if (port) {
    port[route.shipType] += 1;
  }

  state.tradeRoutes.splice(idx, 1);
  saveDb();
  res.json({ success: true, message: `Trade route dissolved and the ${route.shipType} was returned to ${port ? port.name : 'garrison'}.` });
});

// Dev manual ticks / speed-run triggers
app.post('/api/game/dev-tick', (req, res) => {
  processGameTick();
  saveDb();
  res.json({ success: true, message: `Advanced 1 game tick! Current Tick: ${state.currentTick}`, state });
});

// Set tick speed mode
app.post('/api/game/dev-speed', (req, res) => {
  const { mode } = req.body; // 'normal' | 'fast' | 'debug'
  if (mode === 'normal' || mode === 'fast' || mode === 'debug') {
    state.tickSpeedMode = mode;
    saveDb();
    let speedText = '15 minutes (Normal)';
    if (mode === 'fast') speedText = '30 seconds (Fast Testing)';
    if (mode === 'debug') speedText = '5 minutes (Debug/Testing)';
    res.json({ success: true, message: `Tick interval speed set to ${speedText}` });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

// Pause Game Loop Toggle
app.post('/api/game/dev-pause', (req, res) => {
  const { pause } = req.body; // boolean
  state.isPaused = !!pause;
  if (state.isPaused) {
    state.lastTickTime = new Date().toISOString(); // prevent huge catchups on resume
  }
  saveDb();
  res.json({ 
    success: true, 
    isPaused: state.isPaused, 
    message: state.isPaused ? 'Game ticks and database sync have been safely PAUSED. You can now develop or update without any state disruption!' : 'Game ticks and database sync have been RESUMED!' 
  });
});

// Reset Round API (Wipes the map and restarts the round, but preserves player login/registrations)
app.post('/api/game/dev-reset-round', (req, res) => {
  const freshState = createInitialState();
  const playersToKeep = { ...state.players };
  
  // Reset players statistics
  Object.keys(playersToKeep).forEach(pId => {
    const p = playersToKeep[pId];
    p.gold = 1500;
    p.goods = 600;
    p.score = 1100;
    p.lastActiveTime = new Date().toISOString();
  });

  // Re-assign starter ports to each active player
  const portsArray = Object.values(freshState.ports);
  const playerIds = Object.keys(playersToKeep);

  playerIds.forEach(pId => {
    const pName = playersToKeep[pId].username;
    
    // Find unowned or independent ports in freshState
    const candidatePorts = portsArray.filter(p => p.ownerId === 'npc_independent' || p.ownerId === null);
    if (candidatePorts.length > 0) {
      const startPort = candidatePorts[Math.floor(Math.random() * candidatePorts.length)];
      startPort.ownerId = pId;
      startPort.ownerName = pName;
      startPort.type = 'port';
      startPort.troops = 15;
      startPort.cannons = 4;
      startPort.sloop = 1;
      startPort.schooner = 0;
      startPort.frigate = 0;
      startPort.galleon = 0;
      startPort.fortificationLevel = 1;
    }
  });

  state = {
    ...freshState,
    players: playersToKeep,
    currentTick: 1,
    gameStartTime: new Date().toISOString(),
    lastTickTime: new Date().toISOString(),
    roundLimitTicks: 2000,
    isPaused: false
  };

  state.news = [
    {
      id: `round_reset_${Date.now()}`,
      tick: 1,
      type: 'system',
      message: 'ROUND RESET! A new round has officially started! All islands have been redistributed, and starting treasures have been loaded onto your galleons.',
      timestamp: new Date().toISOString()
    }
  ];

  saveDb();
  res.json({ success: true, message: 'Game round has been successfully reset! All islands cleared, players redistributed, and clock set to tick 1.', state });
});

// Download Game State Backup JSON
app.get('/api/game/dev-backup', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=piracy_lunacy_backup.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(state, null, 2));
});

// Restore Game State from Uploaded Backup
app.post('/api/game/dev-restore', (req, res) => {
  const { backupData } = req.body;
  try {
    const parsed = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    if (!parsed || typeof parsed !== 'object' || !parsed.players || !parsed.ports) {
      return res.status(400).json({ error: 'Invalid backup format! Must contain players and ports databases.' });
    }
    
    // Perform manual deep-merge/assignment to retain type compliance and override state
    state = parsed;
    // Backwards compatibility guarantees
    if (!state.forum) state.forum = [];
    if (state.isPaused === undefined) state.isPaused = false;
    Object.values(state.ports).forEach(p => {
      if (!p.buildQueue) p.buildQueue = [];
    });
    
    isStateLoaded = true; // explicitly mark as successfully loaded
    saveDb();
    res.json({ success: true, message: 'Game state successfully restored from backup! All players and islands are synchronized.', state });
  } catch (err) {
    res.status(400).json({ error: `Failed to restore state backup: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// Re-start NPC players/factions with weaker stats
app.post('/api/game/restart-npcs', (req, res) => {
  let resetCount = 0;
  
  Object.values(state.ports).forEach(port => {
    const isPlayerOwned = port.ownerId !== null && state.players[port.ownerId] !== undefined;
    if (!isPlayerOwned) {
      // Distribute NPC owners
      let ownerId = 'npc_independent';
      let ownerName = 'Independent Merchants';
      const roll = Math.random();
      if (roll < 0.25) {
        ownerId = 'npc_independent';
        ownerName = 'Independent Merchants';
      } else if (roll < 0.5) {
        ownerId = 'npc_spain';
        ownerName = 'Spanish Crown';
      } else if (roll < 0.75) {
        ownerId = 'npc_britain';
        ownerName = 'British Empire';
      } else {
        ownerId = 'npc_east_india';
        ownerName = 'East India Trading Co';
      }

      // Re-assign & make overall much weaker than players
      port.ownerId = ownerId;
      port.ownerName = ownerName;
      port.type = 'npc';
      port.troops = Math.floor(Math.random() * 8) + 4; // 4 to 11 troops (easy conquest)
      port.cannons = Math.floor(Math.random() * 3) + 1; // 1 to 3 cannons
      port.sloop = Math.random() > 0.8 ? 1 : 0; // rare sloop
      port.schooner = Math.random() > 0.95 ? 1 : 0; // extremely rare schooner
      port.frigate = 0;
      port.galleon = 0;
      port.fortificationLevel = Math.floor(Math.random() * 2) + 1; // level 1-2 fortification
      port.scoutCount = 0;
      port.buildQueue = [];
      port.razedTicksRemaining = 0;
      port.gold = Math.floor(Math.random() * 4000) + 3500;
      port.goods = Math.floor(Math.random() * 1500) + 1000;
      resetCount++;
    }
  });

  // Push news announcement
  state.news.push({
    id: `npc_restart_${Date.now()}`,
    tick: state.currentTick,
    type: 'system',
    message: `NPC FACTIONS RE-STARTED: Imperial garrisons and Independent Merchants have been re-seeded across the seas with much weaker defenses! Set sail and conquer!`,
    timestamp: new Date().toISOString()
  });

  saveDb();
  res.json({ success: true, message: `Successfully re-started NPC factions at ${resetCount} ports with weaker stats!`, state });
});

// Create Forum Post
app.post('/api/forum/post', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { title, content } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Valid post title is required' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  const newPost = {
    id: `post_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    title: title.trim(),
    content: content.trim(),
    timestamp: new Date().toISOString(),
    replies: []
  };

  if (!state.forum) {
    state.forum = [];
  }
  state.forum.push(newPost);
  saveDb();

  res.json({ success: true, post: newPost });
});

// Reply to Forum Post
app.post('/api/forum/post/:postId/reply', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { postId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Reply content cannot be empty' });
  }

  if (!state.forum) {
    state.forum = [];
  }

  const post = state.forum.find(p => p.id === postId);
  if (!post) {
    return res.status(404).json({ error: 'Forum post not found' });
  }

  const newReply = {
    id: `reply_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  post.replies.push(newReply);
  saveDb();

  res.json({ success: true, reply: newReply });
});

// Send Direct Message
app.post('/api/messages/send', authenticateToken, (req, res) => {
  const player = (req as any).player;
  const { receiverId, content } = req.body;

  if (!receiverId || typeof receiverId !== 'string') {
    return res.status(400).json({ error: 'Receiver ID is required' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content cannot be empty' });
  }

  const receiver = state.players[receiverId];
  if (!receiver) {
    return res.status(404).json({ error: 'Recipient pirate not found in these waters' });
  }

  const newDM = {
    id: `dm_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    senderId: player.id,
    senderName: player.username,
    senderFlagId: player.flagId,
    senderFlagColor: player.flagColor,
    receiverId: receiver.id,
    receiverName: receiver.username,
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  if (!state.directMessages) {
    state.directMessages = [];
  }
  state.directMessages.push(newDM);
  saveDb();

  res.json({ success: true, message: newDM });
});

// Root routing and static file serving
async function startServer() {
  // Wait for Firestore state to load initially (force check on boot)
  await loadStateFromFirestore(true);

  // Serve client assets in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite Dev Server middleware setup
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Piracy Lunacy server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
