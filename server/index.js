import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { getState, setState, getUser, saveUser } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

/* ---------------- Auth ---------------- */

const tokens = {}; // token -> username (in-memory, resets on restart)

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const username = token && tokens[token];
  if (!username) return res.status(401).json({ error: "Not authenticated" });
  req.username = username;
  next();
}

app.post("/api/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: "Username and a password of at least 4 characters are required" });
  }
  if (getUser(username)) return res.status(400).json({ error: "Username already taken" });

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  saveUser(username, {
    salt, hash,
    balance: 1000000, // PKR demo balance
    positions: [],
    pendingOrders: [],
    closedTrades: [],
  });
  const token = crypto.randomBytes(24).toString("hex");
  tokens[token] = username;
  res.json({ ok: true, token, username });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = getUser(username);
  if (!user || hashPassword(password, user.salt) !== user.hash) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  tokens[token] = username;
  res.json({ ok: true, token, username });
});

/* ---------------- Price engine ---------------- */

const FX_SEED = [
  { symbol: "EUR/USD", kind: "fx", from: "EUR", invert: true },
  { symbol: "GBP/USD", kind: "fx", from: "GBP", invert: true },
  { symbol: "USD/JPY", kind: "fx", from: "JPY", invert: false },
  { symbol: "AUD/USD", kind: "fx", from: "AUD", invert: true },
  { symbol: "NZD/USD", kind: "fx", from: "NZD", invert: true },
  { symbol: "EUR/GBP", kind: "fx", from: "EUR", to: "GBP", cross: true },
  { symbol: "USD/CHF", kind: "fx", from: "CHF", invert: false },
  { symbol: "USD/CAD", kind: "fx", from: "CAD", invert: false },
];

const CRYPTO_SEED = [
  { symbol: "BTC/USD", kind: "crypto", id: "bitcoin" },
  { symbol: "ETH/USD", kind: "crypto", id: "ethereum" },
  { symbol: "SOL/USD", kind: "crypto", id: "solana" },
  { symbol: "XRP/USD", kind: "crypto", id: "ripple" },
  { symbol: "DOGE/USD", kind: "crypto", id: "dogecoin" },
];

// No free live feed for these — simulated around a realistic anchor, same tick engine as FX
const SIM_SEED = [
  { symbol: "XAU/USD", kind: "sim" }, // Gold
];

const FALLBACK_PRICE = {
  "EUR/USD": 1.0850, "GBP/USD": 1.2700, "USD/JPY": 151.20,
  "AUD/USD": 0.6600, "NZD/USD": 0.6050, "EUR/GBP": 0.8540,
  "USD/CHF": 0.8800, "USD/CAD": 1.3600,
  "BTC/USD": 60000, "ETH/USD": 3000, "SOL/USD": 140, "XRP/USD": 0.62, "DOGE/USD": 0.14,
  "XAU/USD": 2450,
};

let instruments = [...FX_SEED, ...CRYPTO_SEED, ...SIM_SEED].map((i) => ({
  ...i,
  price: FALLBACK_PRICE[i.symbol],
  openPrice: FALLBACK_PRICE[i.symbol],
  history: [],
}));

let feedStatus = "Connecting to live data…";

async function refreshFxAnchors() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD");
    const data = await res.json();
    const rates = data.rates || {};
    instruments = instruments.map((ins) => {
      if (ins.kind !== "fx" || ins.cross) return ins;
      let raw = ins.price;
      const r = rates[ins.from];
      if (r) raw = ins.invert ? 1 / r : r;
      return { ...ins, price: raw, openPrice: raw };
    });
    // cross pairs derived from the majors we just fetched
    instruments = instruments.map((ins) => {
      if (!ins.cross) return ins;
      const eur = instruments.find((i) => i.symbol === "EUR/USD");
      const gbp = instruments.find((i) => i.symbol === "GBP/USD");
      if (ins.symbol === "EUR/GBP" && eur && gbp) {
        const raw = eur.price / gbp.price;
        return { ...ins, price: raw, openPrice: raw };
      }
      return ins;
    });
    feedStatus = "Live";
  } catch (e) {
    feedStatus = "Live data unavailable — using seed rates";
  }
}

async function refreshCrypto() {
  try {
    const ids = CRYPTO_SEED.map((c) => c.id).join(",");
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();
    instruments = instruments.map((ins) => {
      if (ins.kind !== "crypto") return ins;
      const p = data[ins.id]?.usd;
      return p ? { ...ins, price: p, openPrice: ins.openPrice || p } : ins;
    });
  } catch (e) {
    // keep last known prices on failure
  }
}

function livePnl(pos, ins) {
  if (!ins || ins.price == null) return 0;
  const dir = pos.side === "buy" ? 1 : -1;
  return (ins.price - pos.entry) * dir * pos.volume * 100000;
}

function processTick() {
  instruments = instruments.map((ins) => {
    if (ins.price == null) return ins;
    const drift = (Math.random() - 0.5) * ins.price * 0.0006;
    const next = +(ins.price + drift).toFixed(8);
    const history = [...ins.history, { p: next }].slice(-40);
    return { ...ins, price: next, history };
  });

  // Check pending orders and SL/TP for every user
  const state = getState();
  let changed = false;
  for (const username of Object.keys(state.users)) {
    const user = state.users[username];

    // Pending limit/stop orders
    const stillPending = [];
    for (const order of user.pendingOrders) {
      const ins = instruments.find((i) => i.symbol === order.symbol);
      if (!ins) { stillPending.push(order); continue; }
      let trigger = false;
      if (order.orderType === "limit") {
        trigger = order.side === "buy" ? ins.price <= order.targetPrice : ins.price >= order.targetPrice;
      } else if (order.orderType === "stop") {
        trigger = order.side === "buy" ? ins.price >= order.targetPrice : ins.price <= order.targetPrice;
      }
      if (trigger) {
        user.positions.push({
          id: order.id, symbol: order.symbol, side: order.side, volume: order.volume,
          entry: ins.price, leverage: order.leverage, stopLoss: order.stopLoss, takeProfit: order.takeProfit,
          opened: new Date().toISOString(),
        });
        changed = true;
      } else {
        stillPending.push(order);
      }
    }
    user.pendingOrders = stillPending;

    // Stop loss / take profit on open positions
    const stillOpen = [];
    for (const pos of user.positions) {
      const ins = instruments.find((i) => i.symbol === pos.symbol);
      const pnl = livePnl(pos, ins);
      let hit = null;
      if (ins && pos.stopLoss) {
        const slHit = pos.side === "buy" ? ins.price <= pos.stopLoss : ins.price >= pos.stopLoss;
        if (slHit) hit = "stop loss";
      }
      if (ins && pos.takeProfit && !hit) {
        const tpHit = pos.side === "buy" ? ins.price >= pos.takeProfit : ins.price <= pos.takeProfit;
        if (tpHit) hit = "take profit";
      }
      if (hit) {
        user.balance += pnl;
        user.closedTrades = [{ ...pos, exit: ins.price, pnl, reason: hit }, ...user.closedTrades].slice(0, 30);
        changed = true;
      } else {
        stillOpen.push(pos);
      }
    }
    user.positions = stillOpen;
  }
  if (changed) setState(state);
}

refreshFxAnchors();
refreshCrypto();
setInterval(refreshCrypto, 20000);
setInterval(processTick, 1500);

/* ---------------- Trading routes ---------------- */

function computeMargin(volume, price, leverage) {
  return (volume * 100000 * price) / leverage;
}

app.get("/api/state", requireAuth, (req, res) => {
  const user = getUser(req.username);
  if (!user) return res.status(404).json({ error: "User not found" });
  const positionsWithPnl = user.positions.map((p) => ({
    ...p, pnl: livePnl(p, instruments.find((i) => i.symbol === p.symbol)),
  }));
  const unrealized = positionsWithPnl.reduce((sum, p) => sum + p.pnl, 0);
  res.json({
    status: feedStatus,
    instruments: instruments.map(({ symbol, kind, price, openPrice, history }) => ({ symbol, kind, price, openPrice, history })),
    balance: user.balance,
    equity: user.balance + unrealized,
    positions: positionsWithPnl,
    pendingOrders: user.pendingOrders,
    closedTrades: user.closedTrades,
  });
});

app.post("/api/order", requireAuth, (req, res) => {
  const { symbol, side, volume, orderType, targetPrice, stopLoss, takeProfit, leverage } = req.body;
  const ins = instruments.find((i) => i.symbol === symbol);
  const lev = Number(leverage) || 100;
  if (!ins || !["buy", "sell"].includes(side) || !(volume > 0)) {
    return res.status(400).json({ error: "Invalid order" });
  }
  const user = getUser(req.username);
  const id = Date.now();

  if (orderType === "limit" || orderType === "stop") {
    if (!(targetPrice > 0)) return res.status(400).json({ error: "Target price required for limit/stop orders" });
    user.pendingOrders.push({ id, symbol, side, volume, orderType, targetPrice, stopLoss, takeProfit, leverage: lev });
  } else {
    user.positions.push({
      id, symbol, side, volume, entry: ins.price, leverage: lev, stopLoss, takeProfit,
      opened: new Date().toISOString(),
    });
  }
  saveUser(req.username, user);
  res.json({ ok: true, margin: computeMargin(volume, ins.price, lev) });
});

app.post("/api/close/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const user = getUser(req.username);
  const pos = user.positions.find((p) => p.id === id);
  if (!pos) return res.status(404).json({ error: "Position not found" });
  const ins = instruments.find((i) => i.symbol === pos.symbol);
  const pnl = livePnl(pos, ins);
  user.balance += pnl;
  user.positions = user.positions.filter((p) => p.id !== id);
  user.closedTrades = [{ ...pos, exit: ins?.price, pnl, reason: "manual" }, ...user.closedTrades].slice(0, 30);
  saveUser(req.username, user);
  res.json({ ok: true, pnl });
});

app.post("/api/cancel/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const user = getUser(req.username);
  user.pendingOrders = user.pendingOrders.filter((o) => o.id !== id);
  saveUser(req.username, user);
  res.json({ ok: true });
});

app.post("/api/deposit", requireAuth, (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0)) return res.status(400).json({ error: "Invalid amount" });
  const user = getUser(req.username);
  user.balance += amount;
  saveUser(req.username, user);
  res.json({ ok: true, balance: user.balance });
});

app.post("/api/withdraw", requireAuth, (req, res) => {
  const amount = Number(req.body.amount);
  const user = getUser(req.username);
  if (!(amount > 0) || amount > user.balance) return res.status(400).json({ error: "Invalid amount" });
  user.balance -= amount;
  saveUser(req.username, user);
  res.json({ ok: true, balance: user.balance });
});

/* ---------------- Static frontend ---------------- */

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => console.log(`Vantage Terminal server running on port ${PORT}`));
