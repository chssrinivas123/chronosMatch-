import React, { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Bell, BookOpen, ChevronLeft, ChevronRight,
  Clock3, Cpu, Database, Gauge, LayoutDashboard, Menu, Pause, Play, Radio, Search,
  Settings2, ShieldCheck, X, Zap,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "./trade-history.css";

const points = [
  ["10:00", 24508], ["10:05", 24511], ["10:10", 24510], ["10:15", 24514],
  ["10:20", 24513], ["10:25", 24517], ["10:30", 24516], ["10:35", 24520],
  ["10:40", 24518], ["10:45", 24523], ["10:50", 24521], ["10:55", 24526],
  ["11:00", 24524], ["11:05", 24528],
].map(([time, price]) => ({ time, price }));

const bids = [
  ["24,528.50", 820], ["24,528.25", 650], ["24,528.00", 940],
  ["24,527.75", 510], ["24,527.50", 720],
];
const asks = [
  ["24,528.75", 430], ["24,529.00", 780], ["24,529.25", 600],
  ["24,529.50", 890], ["24,529.75", 540],
];

const trades = [
  ["11:15:08.421", "BUY", "24,528.75", 100],
  ["11:15:08.386", "SELL", "24,528.50", 50],
  ["11:15:08.344", "BUY", "24,528.75", 250],
  ["11:15:08.301", "BUY", "24,528.25", 75],
  ["11:15:08.266", "SELL", "24,528.50", 125],
].map(([time, side, price, quantity], index) => ({
  tradeId: `SIM-${String(index + 1).padStart(5, "0")}`,
  time: `2026-10-13T${time}Z`,
  side,
  price,
  quantity,
  status: "Filled",
}));

const navigation = [
  [LayoutDashboard, "Overview"], [BookOpen, "Order Book"],
  [BarChart3, "Trade History"], [Gauge, "Performance"],
  [Cpu, "System Health"], [Settings2, "Settings"],
];

function Metric({ label, value, unit, change, Icon }) {
  return (
    <div className="metric">
      <div className="muted metriclabel">{label}<span className="metricicon"><Icon size={17} /></span></div>
      <div className="big">{value}<small>{unit}</small></div>
      <div className="green change">↗ {change} <span>vs last run</span></div>
    </div>
  );
}

function Panel({ title, sub, children, action }) {
  return (
    <section className="panel">
      <header className="panelhead"><div><h2>{title}</h2><p>{sub}</p></div>{action}</header>
      {children}
    </section>
  );
}

function MarketChart({ range, setRange }) {
  return (
    <Panel title="Market activity" sub="Simulated index price over time" action={
      <div className="ranges">
        {["1H", "6H", "1D"].map((item) => (
          <button className={range === item ? "sel" : ""} onClick={() => setRange(item)} key={item}>{item}</button>
        ))}
      </div>
    }>
      <div className="price"><b>24,528.75</b><span>↗ +0.84%</span></div>
      <p className="muted pricecaption">Last simulated price</p>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#40d6ae" stopOpacity=".25" />
              <stop offset="100%" stopColor="#40d6ae" stopOpacity="0" />
            </linearGradient></defs>
            <CartesianGrid stroke="#253248" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#8190a7", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={["dataMin - 4", "dataMax + 3"]} tick={{ fill: "#8190a7", fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={{ background: "#111a2b", border: "1px solid #2b3a50", borderRadius: 8 }} />
            <Area dataKey="price" type="monotone" stroke="#40d6ae" strokeWidth={2} fill="url(#fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chartfoot"><span><i /> Simulated price</span><span>Illustrative values</span></div>
    </Panel>
  );
}

function SystemHealthPanel({ running }) {
  return (
    <Panel title="System health" sub="Core components">
      <div className="engine">
        <div className="engineicon"><Activity /></div>
        <div><b>Matching engine</b><small>{running ? "Ready to process orders" : "Simulation paused"}</small></div>
        <span className={running ? "pill" : "pill yellow"}>{running ? "● Running" : "● Paused"}</span>
      </div>
      {[
        [Radio, "Market simulator", running ? "Active" : "Paused", "green"],
        [Zap, "Matching engine", "Demo mode", "yellow"],
        [Database, "IPC / database", "Not connected", "gray"],
      ].map(([Icon, name, status, color]) => (
        <div className="healthrow" key={name}><span><Icon size={15} />{name}</span><b className={color}>{status}</b></div>
      ))}
      <div className="healthnote">ⓘ Backend connection will be configured in a later step.</div>
    </Panel>
  );
}

function OrderBookPanel() {
  return (
    <Panel title="Order book" sub="Top 5 simulated buy and sell orders">
      <div className="legend"><span>🟢 Bids (Buy)</span><span>🔴 Asks (Sell)</span></div>
      <div className="bookhead"><span>SIZE</span><span>BID PRICE</span><span>ASK PRICE</span><span>SIZE</span></div>
      {bids.map((bid, index) => (
        <div className="bookrow" key={bid[0]}>
          <span className="size">{bid[1].toLocaleString()}<i style={{ width: `${bid[1] / 10}%` }} /></span>
          <b className="bid">{bid[0]}</b><b className="ask">{asks[index][0]}</b>
          <span className="size right">{asks[index][1].toLocaleString()}<i style={{ width: `${asks[index][1] / 10}%` }} /></span>
        </div>
      ))}
      <div className="spread">Spread <b>0.25</b><span>Price units</span></div>
    </Panel>
  );
}

function RecentTradesPanel() {
  return (
    <Panel title="Recent trades" sub="Latest simulated executions">
      <div className="tradehead"><span>TIME</span><span>SIDE</span><span>PRICE</span><span>QTY</span></div>
      {trades.map((trade) => (
        <div className="traderow" key={trade.tradeId}>
          <span>{trade.time.slice(11, 23)}</span><b className={trade.side.toLowerCase()}>{trade.side}</b>
          <strong>{trade.price}</strong><span>{trade.quantity}</span>
        </div>
      ))}
      <div className="chartfoot">● Sample executions · Not live market data</div>
    </Panel>
  );
}

function Footer() {
  return <footer><span>© 2026 ChronosMatch · Educational trading simulator</span><span>● All displayed market values are simulated</span></footer>;
}

function OverviewPage({ running, setRunning, range, setRange }) {
  return (
    <>
      <div className="titleline">
        <div><div className="eyebrow">MARKET OPERATIONS · SESSION 001</div><h1>Trading overview</h1>
          <p className="subtitle">Monitor your matching engine and simulated market activity.</p></div>
        <button className={`runbutton ${running ? "" : "paused"}`} onClick={() => setRunning(!running)}>
          {running ? <Pause size={15} /> : <Play size={15} />}{running ? "Pause simulation" : "Start simulation"}
        </button>
      </div>
      <div className="notice"><ShieldCheck size={20} /><div><b>Safe demo environment</b>
        <p>This dashboard currently uses sample data. No real orders or money are involved.</p></div>
        <span>{running ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}</span></div>
      <div className="metrics">
        <Metric label="Orders processed" value="68,421" unit="" change="+12.8%" Icon={Activity} />
        <Metric label="Throughput" value="8,742" unit="orders/s" change="+6.4%" Icon={Zap} />
        <Metric label="Average latency" value="42.6" unit="µs" change="-8.2%" Icon={Clock3} />
        <Metric label="Trades executed" value="12,806" unit="" change="+18.3%" Icon={ArrowUpRight} />
      </div>
      <div className="grid"><MarketChart range={range} setRange={setRange} /><SystemHealthPanel running={running} /></div>
      <div className="grid lower"><OrderBookPanel /><RecentTradesPanel /></div>
      <Footer />
    </>
  );
}

function HistorySummary({ label, value, Icon }) {
  return <div className="history-summary"><span className="history-summary-icon"><Icon size={17} /></span><div><p>{label}</p><strong>{value}</strong></div></div>;
}

function TradeHistoryPage() {
  const [search, setSearch] = useState("");
  const [side, setSide] = useState("All");
  const [timeRange, setTimeRange] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    const cutoff = timeRange === "hour" ? now - 3600000 : timeRange === "day" ? now - 86400000 : null;
    return trades.filter((trade) => {
      const matchesSearch = !query || trade.tradeId.toLowerCase().includes(query) || trade.side.toLowerCase().includes(query);
      const matchesSide = side === "All" || trade.side === side;
      const matchesTime = cutoff === null || new Date(trade.time).getTime() >= cutoff;
      return matchesSearch && matchesSide && matchesTime;
    });
  }, [search, side, timeRange]);
  const pageCount = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
  const visibleTrades = filteredTrades.slice((page - 1) * pageSize, page * pageSize);
  const buyCount = trades.filter((trade) => trade.side === "BUY").length;
  const sellCount = trades.filter((trade) => trade.side === "SELL").length;
  const totalQuantity = trades.reduce((total, trade) => total + trade.quantity, 0);
  const formatTime = (value) => new Date(value).toLocaleString(undefined, {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: "UTC",
  });
  const updateFilter = (update) => { setPage(1); update(); };

  return (
    <>
      <div className="titleline"><div><div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
        <h1>Trade History</h1><p className="subtitle">Review simulated executions and trade activity.</p></div></div>
      <div className="history-summaries">
        <HistorySummary label="Total trades" value={trades.length.toLocaleString()} Icon={Activity} />
        <HistorySummary label="BUY trades" value={buyCount.toLocaleString()} Icon={ArrowUpRight} />
        <HistorySummary label="SELL trades" value={sellCount.toLocaleString()} Icon={ArrowUpRight} />
        <HistorySummary label="Total quantity" value={totalQuantity.toLocaleString()} Icon={BarChart3} />
      </div>
      <Panel title="Executions" sub="Simulated trade activity">
        <div className="history-toolbar">
          <label className="history-search"><Search size={16} /><input type="search" value={search}
            placeholder="Search trade ID or side" onChange={(event) => updateFilter(() => setSearch(event.target.value))}
            aria-label="Search trades by trade ID or side" /></label>
          <div className="side-filters" aria-label="Filter trades by side">
            {["All", "BUY", "SELL"].map((option) => <button className={side === option ? "selected" : ""} key={option}
              onClick={() => updateFilter(() => setSide(option))} aria-pressed={side === option}>{option}</button>)}
          </div>
          <label className="history-time-filter"><Clock3 size={15} />
            <select value={timeRange} onChange={(event) => updateFilter(() => setTimeRange(event.target.value))} aria-label="Filter trades by time">
              <option value="all">All time</option><option value="hour">Last hour</option><option value="day">Last 24 hours</option>
            </select>
          </label>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead><tr><th>Trade ID</th><th>Time (UTC)</th><th>Side</th><th>Price</th><th>Quantity</th><th>Status</th></tr></thead>
            <tbody>{visibleTrades.map((trade) => <tr key={trade.tradeId}>
              <td className="trade-id">{trade.tradeId}</td><td className="trade-time">{formatTime(trade.time)}</td>
              <td><span className={`trade-badge ${trade.side.toLowerCase()}`}>{trade.side}</span></td>
              <td className="trade-price">{trade.price}</td><td>{trade.quantity.toLocaleString()}</td>
              <td><span className="status-badge">{trade.status}</span></td>
            </tr>)}</tbody>
          </table>
          {visibleTrades.length === 0 && <div className="history-empty"><Search size={20} />
            <b>No trades match these filters</b><p>Try a different trade ID, side, or time range.</p></div>}
        </div>
        <div className="history-pagination">
          <span>{filteredTrades.length === 0 ? "No trades to display" : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filteredTrades.length)} of ${filteredTrades.length} trades`}</span>
          <div><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={16} /></button>
            <span>Page {page} of {pageCount}</span>
            <button aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={16} /></button></div>
        </div>
        <div className="chartfoot">Sample executions · Not live market data</div>
      </Panel>
      <Footer />
    </>
  );
}

function PlaceholderPage({ page }) {
  const messages = {
    Performance: "Performance analytics for the simulated matching engine will appear here.",
    Settings: "Dashboard and simulator settings will be available here.",
  };
  return <>
    <div className="titleline"><div><div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
      <h1>{page}</h1><p className="subtitle">{page === "Performance" ? "Review simulated engine performance." : "Manage your local demo preferences."}</p></div></div>
    <section className="placeholder-panel"><span>{page === "Performance" ? <Gauge size={20} /> : <Settings2 size={20} />}</span>
      <div><b>{page} page placeholder</b><p>{messages[page]}</p><small>Sample data only · No real exchange connection</small></div></section>
    <Footer />
  </>;
}

export default function App() {
  const [running, setRunning] = useState(true);
  const [range, setRange] = useState("1H");
  const [nav, setNav] = useState("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  let pageContent;

  if (nav === "Overview") {
    pageContent = <OverviewPage running={running} setRunning={setRunning} range={range} setRange={setRange} />;
  } else if (nav === "Order Book") {
    pageContent = <><div className="titleline"><div><div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
      <h1>Order Book</h1><p className="subtitle">View simulated buy and sell liquidity.</p></div></div><OrderBookPanel /><Footer /></>;
  } else if (nav === "Trade History") {
    pageContent = <TradeHistoryPage />;
  } else if (nav === "System Health") {
    pageContent = <><div className="titleline"><div><div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
      <h1>System Health</h1><p className="subtitle">Inspect simulated engine and service status.</p></div></div><SystemHealthPanel running={running} /><Footer /></>;
  } else {
    pageContent = <PlaceholderPage page={nav} />;
  }

  return (
    <div className="layout">
      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand"><div className="brandicon"><Activity /></div>
          <div><b>Chronos<span>Match</span></b><small>TRADING SIMULATOR</small></div></div>
        <button className="mobile-nav-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        <label>WORKSPACE</label>
        {navigation.slice(0, 4).map(([Icon, name]) => <button key={name}
          className={`nav ${nav === name ? "active" : ""}`} aria-current={nav === name ? "page" : undefined}
          onClick={() => { setNav(name); setMobileNavOpen(false); }}>
          <Icon size={18} />{name}</button>)}
        <div className="side-rule" /><label>SYSTEM</label>
        {navigation.slice(4).map(([Icon, name]) => <button key={name}
          className={`nav ${nav === name ? "active" : ""}`} aria-current={nav === name ? "page" : undefined}
          onClick={() => { setNav(name); setMobileNavOpen(false); }}>
          <Icon size={18} />{name}{name === "System Health" && <i className="dot" />}</button>)}
        <div className="sidebottom">
          <div className="help"><ShieldCheck /><b>Safe demo environment</b><p>Sample data only. No real orders or money are involved.</p></div>
          <div className="profile"><div className="avatar">S</div><div><b>Solo Developer</b><small>Local workspace</small></div></div>
        </div>
      </aside>
      <main>
        <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}><Menu size={18} /></button><div className="crumb">Workspace <span>/</span> {nav}</div>
          <div className="topright"><span className="sample"><i /> SIMULATED DATA</span><Bell size={18} /><div className="avatar">S</div></div>
        </header>
        <div className="content">{pageContent}</div>
      </main>
    </div>
  );
}