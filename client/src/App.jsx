import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const GOLD = "#C9A64A";
const BUY = "#2FBF8F";
const SELL = "#E05263";
const BG = "#0A0D12";
const PANEL = "#12161F";
const BORDER = "#1F2530";
const TEXT_MUTED = "#7A8296";

const GLOBAL_STYLE = `
  .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
  .display { font-family: 'Space Grotesk', sans-serif; }
  .row:hover { background: #171C27; }
  button { cursor: pointer; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 2px; }
  input, select { background: ${PANEL}; border: 1px solid ${BORDER}; color: #E4E7EC; border-radius: 6px; padding: 8px 10px; font-size: 13px; }
`;

function fmt(price, symbol) {
  if (price == null) return "—";
  const dp = symbol.includes("JPY") ? 3 : ["BTC", "ETH", "SOL", "XAU"].some((p) => symbol.startsWith(p)) ? 2 : symbol.startsWith("DOGE") || symbol.startsWith("XRP") ? 4 : 5;
  return price.toFixed(dp);
}

function pct(change) {
  if (change == null) return "—";
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function money(n) {
  return `Rs ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <div style={{ width: 64, height: 26 }} />;
  return (
    <div style={{ width: 64, height: 26 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="p" stroke={positive ? BUY : SELL} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ==================== Landing ==================== */

function Landing({ onLogin, onSignup }) {
  return (
    <div style={{ background: BG, color: "#E4E7EC", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: BG }}>V</div>
          <span className="display" style={{ fontSize: 19, fontWeight: 600 }}>Vantage Terminal</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onLogin} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>Log in</button>
          <button onClick={onSignup} style={{ background: GOLD, border: "none", color: BG, padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>Get started</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "90px 24px 60px", textAlign: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: BG, background: GOLD, padding: "3px 10px", borderRadius: 999, letterSpacing: 0.4 }}>DEMO — NO REAL MONEY</span>
        <h1 className="display" style={{ fontSize: 44, fontWeight: 700, margin: "22px 0 14px", lineHeight: 1.15 }}>
          Practice trading FX, crypto, and gold — with real prices, zero risk.
        </h1>
        <p style={{ color: TEXT_MUTED, fontSize: 16, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 32px" }}>
          Live crypto prices, FX pairs anchored to real reference rates, market/limit/stop orders,
          leverage, and a full account — all running on a fake balance so you can learn without the stakes.
        </p>
        <button onClick={onSignup} style={{ background: GOLD, border: "none", color: BG, padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>
          Create free account
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "8px 20px", fontSize: 10, color: "#4B5262", textAlign: "center" }}>
        Simulated demo environment. No real orders are placed and no real funds move.
      </div>
    </div>
  );
}

/* ==================== Auth form ==================== */

function AuthForm({ mode, onSuccess, onSwitch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Something went wrong");
        return data;
      })
      .then((data) => onSuccess(data.token, data.username))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <div style={{ background: BG, color: "#E4E7EC", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{GLOBAL_STYLE}</style>
      <form onSubmit={submit} style={{ width: 320, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: BG, fontSize: 13 }}>V</div>
          <span className="display" style={{ fontSize: 16, fontWeight: 600 }}>Vantage Terminal</span>
        </div>
        <h2 className="display" style={{ fontSize: 18, marginBottom: 18 }}>{mode === "login" ? "Log in" : "Create your account"}</h2>

        <label style={{ display: "block", fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", marginBottom: 14, boxSizing: "border-box" }} autoFocus />

        <label style={{ display: "block", fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 18, boxSizing: "border-box" }} />

        {error && <div style={{ color: SELL, fontSize: 12, marginBottom: 14 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ width: "100%", background: GOLD, border: "none", color: BG, padding: "11px", borderRadius: 6, fontWeight: 700, fontSize: 14 }}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: TEXT_MUTED }}>
          {mode === "login" ? (
            <>New here? <span onClick={() => onSwitch("signup")} style={{ color: GOLD, cursor: "pointer" }}>Create an account</span></>
          ) : (
            <>Already have an account? <span onClick={() => onSwitch("login")} style={{ color: GOLD, cursor: "pointer" }}>Log in</span></>
          )}
        </div>
      </form>
    </div>
  );
}

/* ==================== Deposit/Withdraw modal ==================== */

function CashModal({ mode, onClose, onDone, token }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  function submit() {
    setError("");
    fetch(`/api/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: parseFloat(amount) }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        onDone();
        onClose();
      })
      .catch((e) => setError(e.message));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ width: 300, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <h3 className="display" style={{ fontSize: 16, marginBottom: 4, textTransform: "capitalize" }}>{mode}</h3>
        <p style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>Simulated — no real money moves.</p>
        <input type="number" placeholder="Amount (Rs)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", boxSizing: "border-box", marginBottom: 12 }} />
        {error && <div style={{ color: SELL, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", padding: "9px", borderRadius: 6 }}>Cancel</button>
          <button onClick={submit} style={{ flex: 1, background: GOLD, border: "none", color: BG, padding: "9px", borderRadius: 6, fontWeight: 700 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ==================== Terminal ==================== */

function Terminal({ token, username, onLogout }) {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState("EUR/USD");
  const [volume, setVolume] = useState(0.1);
  const [orderType, setOrderType] = useState("market");
  const [targetPrice, setTargetPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [leverage, setLeverage] = useState(100);
  const [cashModal, setCashModal] = useState(null);
  const [orderError, setOrderError] = useState("");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const poll = useCallback(() => {
    fetch("/api/state", { headers: authHeaders })
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
    // eslint-disable-next-line
  }, [token]);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [poll]);

  if (!state) {
    return <div style={{ background: BG, color: TEXT_MUTED, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Vantage Terminal…</div>;
  }

  const instruments = state.instruments;
  const active = instruments.find((i) => i.symbol === selected);
  const positive = active && active.openPrice ? active.price >= active.openPrice : true;
  const changePct = active && active.openPrice ? ((active.price - active.openPrice) / active.openPrice) * 100 : 0;
  const margin = active ? (volume * 100000 * active.price) / leverage : 0;

  function placeOrder(side) {
    setOrderError("");
    if (!active || volume <= 0) return;
    if ((orderType === "limit" || orderType === "stop") && !(parseFloat(targetPrice) > 0)) {
      setOrderError("Enter a target price for this order type");
      return;
    }
    fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        symbol: active.symbol, side, volume, orderType,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
        leverage,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        poll();
      })
      .catch((e) => setOrderError(e.message));
  }

  function closePosition(id) {
    fetch(`/api/close/${id}`, { method: "POST", headers: authHeaders }).then(poll);
  }

  function cancelOrder(id) {
    fetch(`/api/cancel/${id}`, { method: "POST", headers: authHeaders }).then(poll);
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: BG, color: "#E4E7EC", minHeight: "100vh" }}>
      <style>{GLOBAL_STYLE}</style>

      {cashModal && <CashModal mode={cashModal} token={token} onClose={() => setCashModal(null)} onDone={poll} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, background: "#0D1119", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: BG }}>V</div>
          <span className="display" style={{ fontSize: 17, fontWeight: 600 }}>Vantage Terminal</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: BG, background: GOLD, padding: "2px 7px", borderRadius: 999, marginLeft: 6 }}>DEMO</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: TEXT_MUTED }}>Balance</div>
            <div className="mono" style={{ fontWeight: 600 }}>{money(state.balance)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: TEXT_MUTED }}>Equity</div>
            <div className="mono" style={{ fontWeight: 600, color: state.equity >= state.balance ? BUY : SELL }}>{money(state.equity)}</div>
          </div>
          <button onClick={() => setCashModal("deposit")} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>Deposit</button>
          <button onClick={() => setCashModal("withdraw")} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>Withdraw</button>
          <span style={{ color: TEXT_MUTED }}>{username}</span>
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>Log out</button>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)", flexWrap: "wrap" }}>
        {/* Watchlist */}
        <div style={{ width: 220, borderRight: `1px solid ${BORDER}`, padding: "10px 0" }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, padding: "0 14px 8px", letterSpacing: 0.5 }}>WATCHLIST</div>
          {instruments.map((ins) => {
            const up = ins.openPrice ? ins.price >= ins.openPrice : true;
            const chg = ins.openPrice ? ((ins.price - ins.openPrice) / ins.openPrice) * 100 : 0;
            return (
              <div key={ins.symbol} className="row" onClick={() => setSelected(ins.symbol)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", cursor: "pointer", background: selected === ins.symbol ? "#171C27" : "transparent", borderLeft: selected === ins.symbol ? `2px solid ${GOLD}` : "2px solid transparent" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ins.symbol}</div>
                  <div className="mono" style={{ fontSize: 11, color: up ? BUY : SELL }}>{pct(chg)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkline data={ins.history} positive={up} />
                  <div className="mono" style={{ fontSize: 13, minWidth: 56, textAlign: "right" }}>{fmt(ins.price, ins.symbol)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart + order ticket */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 320 }}>
          <div style={{ padding: "16px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{selected}</span>
              <span className="mono" style={{ fontSize: 20 }}>{active ? fmt(active.price, active.symbol) : "—"}</span>
              <span className="mono" style={{ fontSize: 13, color: positive ? BUY : SELL }}>{pct(changePct)}</span>
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{state.status} — crypto is live market data, others simulated around real reference points</div>
          </div>

          <div style={{ flex: 1, padding: "8px 12px", minHeight: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={active ? active.history : []}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="p" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} labelFormatter={() => ""} />
                <Area type="monotone" dataKey="p" stroke={GOLD} strokeWidth={2} fill="url(#fill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order ticket */}
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 20px" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                Order type
                <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ display: "block", marginTop: 4, width: 110 }}>
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                  <option value="stop">Stop</option>
                </select>
              </label>
              <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                Volume (lots)
                <input type="number" min="0.01" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value) || 0)} className="mono" style={{ display: "block", marginTop: 4, width: 90 }} />
              </label>
              <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                Leverage
                <select value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} style={{ display: "block", marginTop: 4, width: 90 }}>
                  <option value={50}>1:50</option>
                  <option value={100}>1:100</option>
                  <option value={200}>1:200</option>
                  <option value={500}>1:500</option>
                </select>
              </label>
              {orderType !== "market" && (
                <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Target price
                  <input type="number" step="0.00001" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="mono" style={{ display: "block", marginTop: 4, width: 110 }} />
                </label>
              )}
              <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                Stop loss
                <input type="number" step="0.00001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="mono" style={{ display: "block", marginTop: 4, width: 100 }} />
              </label>
              <label style={{ fontSize: 12, color: TEXT_MUTED }}>
                Take profit
                <input type="number" step="0.00001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="mono" style={{ display: "block", marginTop: 4, width: 100 }} />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button onClick={() => placeOrder("sell")} style={{ background: SELL, border: "none", color: "#fff", fontWeight: 600, fontSize: 13, padding: "10px 22px", borderRadius: 6 }}>Sell</button>
              <button onClick={() => placeOrder("buy")} style={{ background: BUY, border: "none", color: "#08130F", fontWeight: 600, fontSize: 13, padding: "10px 22px", borderRadius: 6 }}>Buy</button>
              <span className="mono" style={{ fontSize: 11, color: TEXT_MUTED }}>Required margin: {money(margin)}</span>
              {orderError && <span style={{ fontSize: 12, color: SELL }}>{orderError}</span>}
            </div>
          </div>
        </div>

        {/* Positions / pending / history */}
        <div style={{ width: 320, borderLeft: `1px solid ${BORDER}`, padding: "14px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8, letterSpacing: 0.5 }}>OPEN POSITIONS</div>
          {state.positions.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>No open positions.</div>}
          {state.positions.map((pos) => (
            <div key={pos.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: PANEL }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{pos.symbol}</span>
                <span style={{ color: pos.side === "buy" ? BUY : SELL, fontWeight: 600, fontSize: 11 }}>{pos.side.toUpperCase()} {pos.leverage}x</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{pos.volume} lots @ {fmt(pos.entry, pos.symbol)}</div>
              {(pos.stopLoss || pos.takeProfit) && (
                <div className="mono" style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                  {pos.stopLoss ? `SL ${fmt(pos.stopLoss, pos.symbol)}` : ""} {pos.takeProfit ? `TP ${fmt(pos.takeProfit, pos.symbol)}` : ""}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span className="mono" style={{ fontSize: 13, color: pos.pnl >= 0 ? BUY : SELL }}>{pos.pnl >= 0 ? "+" : ""}{money(pos.pnl)}</span>
                <button onClick={() => closePosition(pos.id)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", borderRadius: 5, padding: "4px 10px", fontSize: 11 }}>Close</button>
              </div>
            </div>
          ))}

          {state.pendingOrders.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: TEXT_MUTED, margin: "16px 0 8px", letterSpacing: 0.5 }}>PENDING ORDERS</div>
              {state.pendingOrders.map((o) => (
                <div key={o.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, background: PANEL }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{o.symbol}</span>
                    <span style={{ color: o.side === "buy" ? BUY : SELL, fontWeight: 600, fontSize: 11 }}>{o.orderType.toUpperCase()} {o.side.toUpperCase()}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{o.volume} lots @ {fmt(o.targetPrice, o.symbol)}</div>
                  <button onClick={() => cancelOrder(o.id)} style={{ marginTop: 6, background: "transparent", border: `1px solid ${BORDER}`, color: "#E4E7EC", borderRadius: 5, padding: "4px 10px", fontSize: 11 }}>Cancel</button>
                </div>
              ))}
            </>
          )}

          {state.closedTrades.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: TEXT_MUTED, margin: "16px 0 8px", letterSpacing: 0.5 }}>RECENT CLOSED</div>
              {state.closedTrades.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", color: TEXT_MUTED }}>
                  <span>{t.symbol} {t.side} <span style={{ fontSize: 10 }}>({t.reason})</span></span>
                  <span className="mono" style={{ color: t.pnl >= 0 ? BUY : SELL }}>{t.pnl >= 0 ? "+" : ""}{money(t.pnl)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "8px 20px", fontSize: 10, color: "#4B5262" }}>
        Simulated demo environment. No real orders are placed and no real funds move.
      </div>
    </div>
  );
}

/* ==================== Root ==================== */

export default function App() {
  const [view, setView] = useState(() => (localStorage.getItem("vt_token") ? "terminal" : "landing"));
  const [token, setToken] = useState(() => localStorage.getItem("vt_token"));
  const [username, setUsername] = useState(() => localStorage.getItem("vt_username"));

  function handleAuthSuccess(tok, user) {
    localStorage.setItem("vt_token", tok);
    localStorage.setItem("vt_username", user);
    setToken(tok);
    setUsername(user);
    setView("terminal");
  }

  function handleLogout() {
    localStorage.removeItem("vt_token");
    localStorage.removeItem("vt_username");
    setToken(null);
    setUsername(null);
    setView("landing");
  }

  if (view === "terminal" && token) return <Terminal token={token} username={username} onLogout={handleLogout} />;
  if (view === "login") return <AuthForm mode="login" onSuccess={handleAuthSuccess} onSwitch={setView} />;
  if (view === "signup") return <AuthForm mode="signup" onSuccess={handleAuthSuccess} onSwitch={setView} />;
  return <Landing onLogin={() => setView("login")} onSignup={() => setView("signup")} />;
}
