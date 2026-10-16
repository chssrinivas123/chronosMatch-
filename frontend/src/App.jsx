
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Gauge,
  LayoutDashboard,
  Menu,
  Pause,
  Play,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./trade-history.css";

const API_BASE = "http://127.0.0.1:8000";

const points = [
  ["10:00", 24508], ["10:05", 24511], ["10:10", 24510],
  ["10:15", 24514], ["10:20", 24513], ["10:25", 24517],
  ["10:30", 24516], ["10:35", 24520], ["10:40", 24518],
  ["10:45", 24523], ["10:50", 24521], ["10:55", 24526],
  ["11:00", 24524], ["11:05", 24528],
].map(([time, price]) => ({ time, price }));

const navigation = [
  [LayoutDashboard, "Overview"],
  [BookOpen, "Order Book"],
  [BarChart3, "Trade History"],
  [Gauge, "Performance"],
  [Cpu, "System Health"],
  [Settings2, "Settings"],
];

// Fetch live information from the FastAPI backend.
function useChronosApi() {
  const [data, setData] = useState({
    metrics: null,
    orderBook: null,
    trades: [],
    health: null,
    loading: true,
    error: "",
  });

  const refresh = useCallback(async () => {
    try {
      const endpoints = [
        `${API_BASE}/api/metrics`,
        `${API_BASE}/api/order-book`,
        `${API_BASE}/api/trades`,
        `${API_BASE}/api/health`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) => fetch(url))
      );

      if (responses.some((response) => !response.ok)) {
        throw new Error("The backend returned an unsuccessful response.");
      }

      const [metrics, orderBook, trades, health] = await Promise.all(
        responses.map((response) => response.json())
      );

      setData({
        metrics,
        orderBook,
        trades: Array.isArray(trades) ? trades : [],
        health,
        loading: false,
        error: "",
      });
    } catch {
      setData((previous) => ({
        ...previous,
        loading: false,
        error: "Cannot connect to the ChronosMatch backend.",
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...data, refresh };
}

function formatNumber(value) {
  return value == null ? "—" : Number(value).toLocaleString();
}

// Prices are represented as integer ticks by the current backend.
function formatPrice(value) {
  return value == null ? "—" : Number(value).toLocaleString();
}

function Metric({ label, value, unit, Icon }) {
  return (
    <div className="metric">
      <div className="muted metriclabel">
        {label}
        <span className="metricicon"><Icon size={17} /></span>
      </div>
      <div className="big">
        {value}
        <small>{unit}</small>
      </div>
      <div className="muted change">Live backend value</div>
    </div>
  );
}

function Panel({ title, sub, children, action }) {
  return (
    <section className="panel">
      <header className="panelhead">
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function MarketChart({ range, setRange }) {
  return (
    <Panel
      title="Market activity"
      sub="Illustrative index price — not connected to a market feed"
      action={
        <div className="ranges">
          {["1H", "6H", "1D"].map((item) => (
            <button
              className={range === item ? "sel" : ""}
              onClick={() => setRange(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      }
    >
      <div className="price"><b>Illustrative data</b></div>
      <p className="muted pricecaption">
        The simulator does not yet generate market-price history.
      </p>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#40d6ae" stopOpacity=".25" />
                <stop offset="100%" stopColor="#40d6ae" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="#253248"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#8190a7", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 4", "dataMax + 3"]}
              tick={{ fill: "#8190a7", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#111a2b",
                border: "1px solid #2b3a50",
                borderRadius: 8,
              }}
            />
            <Area
              dataKey="price"
              type="monotone"
              stroke="#40d6ae"
              strokeWidth={2}
              fill="url(#fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chartfoot">
        <span><i /> Illustrative price</span>
        <span>Not live market data</span>
      </div>
    </Panel>
  );
}

function SystemHealthPanel({ health, error, loading }) {
  const connected = !error && health?.status === "healthy";

  return (
    <Panel title="System health" sub="Backend connectivity">
      <div className="engine">
        <div className="engineicon"><Activity /></div>
        <div>
          <b>ChronosMatch API</b>
          <small>
            {loading
              ? "Checking connection..."
              : connected
                ? "Backend responding"
                : "Backend unavailable"}
          </small>
        </div>
        <span className={connected ? "pill" : "pill yellow"}>
          {connected ? "Connected" : "Offline"}
        </span>
      </div>

      {[
        [
          Radio,
          "FastAPI service",
          connected ? "Healthy" : "Unavailable",
          connected ? "green" : "yellow",
        ],
        [
          Zap,
          "Matching engine",
          health?.engine === "running" ? "Running" : "Unknown",
          health?.engine === "running" ? "green" : "yellow",
        ],
        [Database, "Persistence / IPC", "Not implemented", "gray"],
      ].map(([Icon, name, status, color]) => (
        <div className="healthrow" key={name}>
          <span><Icon size={15} />{name}</span>
          <b className={color}>{status}</b>
        </div>
      ))}

      {error && <div className="healthnote">{error}</div>}
    </Panel>
  );
}

function OrderBookPanel({ orderBook }) {
  const bids = orderBook?.bids ?? [];
  const asks = orderBook?.asks ?? [];
  const rowCount = Math.max(
    5,
    Math.min(10, Math.max(bids.length, asks.length))
  );

  return (
    <Panel title="Order book" sub="Live orders from the matching engine">
      <div className="legend">
        <span>🟢 Bids (Buy)</span>
        <span>🔴 Asks (Sell)</span>
      </div>

      <div className="bookhead">
        <span>SIZE</span>
        <span>BID PRICE</span>
        <span>ASK PRICE</span>
        <span>SIZE</span>
      </div>

      {Array.from({ length: rowCount }, (_, index) => {
        const bid = bids[index];
        const ask = asks[index];

        return (
          <div className="bookrow" key={`book-${index}`}>
            <span className="size">
              {bid ? formatNumber(bid.quantity) : "—"}
              {bid && (
                <i
                  style={{
                    width: `${Math.min(100, bid.quantity)}%`,
                  }}
                />
              )}
            </span>
            <b className="bid">{bid ? formatPrice(bid.price) : "—"}</b>
            <b className="ask">{ask ? formatPrice(ask.price) : "—"}</b>
            <span className="size right">
              {ask ? formatNumber(ask.quantity) : "—"}
              {ask && (
                <i
                  style={{
                    width: `${Math.min(100, ask.quantity)}%`,
                  }}
                />
              )}
            </span>
          </div>
        );
      })}

      <div className="spread">
        Spread <b>{formatPrice(orderBook?.spread)}</b>
        <span>Ticks</span>
      </div>

      {!orderBook && (
        <div className="history-empty">
          Waiting for order-book data...
        </div>
      )}
    </Panel>
  );
}

function RecentTradesPanel({ trades }) {
  const recent = [...trades].reverse().slice(0, 5);

  return (
    <Panel title="Recent trades" sub="Latest executed trades from the API">
      <div className="tradehead">
        <span>TRADE</span>
        <span>BUY ID</span>
        <span>SELL ID</span>
        <span>QTY</span>
      </div>

      {recent.map((trade) => (
        <div className="traderow" key={trade.trade_id}>
          <span>#{trade.trade_id}</span>
          <b className="buy">{trade.buy_order_id}</b>
          <b className="sell">{trade.sell_order_id}</b>
          <span>{formatNumber(trade.quantity)}</span>
        </div>
      ))}

      {recent.length === 0 && (
        <div className="history-empty">
          <b>No trades yet</b>
          <p>Submit matching BUY and SELL orders to create a trade.</p>
        </div>
      )}

      <div className="chartfoot">
        Execution prices use integer ticks. Timestamps are not yet provided.
      </div>
    </Panel>
  );
}

function Footer() {
  return (
    <footer>
      <span>© 2026 ChronosMatch · Educational trading simulator</span>
      <span>Mock orders only · No live exchange connection</span>
    </footer>
  );
}

function OverviewPage({
  metrics,
  orderBook,
  trades,
  health,
  error,
  loading,
  range,
  setRange,
}) {
  return (
    <>
      <div className="titleline">
        <div>
          <div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
          <h1>Trading overview</h1>
          <p className="subtitle">
            Monitor your matching engine and simulated orders.
          </p>
        </div>
      </div>

      <div className="notice">
        <ShieldCheck size={20} />
        <div>
          <b>Safe demo environment</b>
          <p>
            {error
              ? "Backend connection failed. Displayed API values may be unavailable."
              : loading
                ? "Connecting to the backend..."
                : "Connected to the local ChronosMatch API."}
          </p>
        </div>
        <span>{error ? "BACKEND OFFLINE" : loading ? "CONNECTING" : "API CONNECTED"}</span>
      </div>

      <div className="metrics">
        <Metric
          label="Orders processed"
          value={formatNumber(metrics?.processed_orders)}
          unit=""
          Icon={Activity}
        />
        <Metric
          label="Throughput"
          value="—"
          unit="orders/s"
          Icon={Zap}
        />
        <Metric
          label="Matching latency"
          value="—"
          unit="µs"
          Icon={Clock3}
        />
        <Metric
          label="Trades executed"
          value={formatNumber(metrics?.trade_count)}
          unit=""
          Icon={ArrowUpRight}
        />
      </div>

      <div className="grid">
        <MarketChart range={range} setRange={setRange} />
        <SystemHealthPanel health={health} error={error} loading={loading} />
      </div>

      <div className="grid lower">
        <OrderBookPanel orderBook={orderBook} />
        <RecentTradesPanel trades={trades} />
      </div>

      <Footer />
    </>
  );
}

function HistorySummary({ label, value, Icon }) {
  return (
    <div className="history-summary">
      <span className="history-summary-icon"><Icon size={17} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TradeHistoryPage({ trades }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...trades]
      .reverse()
      .filter((trade) => {
        return (
          !query ||
          String(trade.trade_id).includes(query) ||
          String(trade.buy_order_id).includes(query) ||
          String(trade.sell_order_id).includes(query)
        );
      });
  }, [search, trades]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredTrades.length / pageSize)
  );

  const visibleTrades = filteredTrades.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalQuantity = trades.reduce(
    (total, trade) => total + trade.quantity,
    0
  );

  return (
    <>
      <div className="titleline">
        <div>
          <div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
          <h1>Trade History</h1>
          <p className="subtitle">
            Executed trades recorded by the matching engine.
          </p>
        </div>
      </div>

      <div className="history-summaries">
        <HistorySummary
          label="Total trades"
          value={trades.length.toLocaleString()}
          Icon={Activity}
        />
        <HistorySummary
          label="Total quantity"
          value={totalQuantity.toLocaleString()}
          Icon={BarChart3}
        />
        <HistorySummary
          label="BUY orders involved"
          value={new Set(trades.map((trade) => trade.buy_order_id)).size}
          Icon={ArrowUpRight}
        />
        <HistorySummary
          label="SELL orders involved"
          value={new Set(trades.map((trade) => trade.sell_order_id)).size}
          Icon={ArrowUpRight}
        />
      </div>

      <Panel title="Executions" sub="Actual trade records from the API">
        <div className="history-toolbar">
          <label className="history-search">
            <Search size={16} />
            <input
              type="search"
              value={search}
              placeholder="Search trade or order ID"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search trades by trade or order ID"
            />
          </label>
        </div>

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Buyer order</th>
                <th>Seller order</th>
                <th>Price (ticks)</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTrades.map((trade) => (
                <tr key={trade.trade_id}>
                  <td className="trade-id">{trade.trade_id}</td>
                  <td>{trade.buy_order_id}</td>
                  <td>{trade.sell_order_id}</td>
                  <td className="trade-price">{formatPrice(trade.price)}</td>
                  <td>{formatNumber(trade.quantity)}</td>
                  <td><span className="status-badge">Filled</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleTrades.length === 0 && (
            <div className="history-empty">
              <Search size={20} />
              <b>No trades found</b>
              <p>Submit matching orders or change your search.</p>
            </div>
          )}
        </div>

        <div className="history-pagination">
          <span>
            {filteredTrades.length === 0
              ? "No trades to display"
              : `Showing ${(page - 1) * pageSize + 1}-${Math.min(
                  page * pageSize,
                  filteredTrades.length
                )} of ${filteredTrades.length} trades`}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {pageCount}</span>
            <button
              aria-label="Next page"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="chartfoot">
          The current API does not yet return trade timestamps.
        </div>
      </Panel>

      <Footer />
    </>
  );
}

function PlaceholderPage({ page }) {
  const messages = {
    Performance:
      "Throughput and latency charts will be available after we add benchmark instrumentation.",
    Settings:
      "Dashboard and simulator settings will be available here.",
  };

  return (
    <>
      <div className="titleline">
        <div>
          <div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
          <h1>{page}</h1>
          <p className="subtitle">
            {page === "Performance"
              ? "Review measured engine performance."
              : "Manage your local demo preferences."}
          </p>
        </div>
      </div>

      <section className="placeholder-panel">
        <span>
          {page === "Performance" ? <Gauge size={20} /> : <Settings2 size={20} />}
        </span>
        <div>
          <b>{page} page</b>
          <p>{messages[page]}</p>
          <small>Educational simulator · Mock orders only</small>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default function App() {
  const api = useChronosApi();
  const [range, setRange] = useState("1H");
  const [nav, setNav] = useState("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  let pageContent;

  if (nav === "Overview") {
    pageContent = (
      <OverviewPage
        metrics={api.metrics}
        orderBook={api.orderBook}
        trades={api.trades}
        health={api.health}
        error={api.error}
        loading={api.loading}
        range={range}
        setRange={setRange}
      />
    );
  } else if (nav === "Order Book") {
    pageContent = (
      <>
        <div className="titleline">
          <div>
            <div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
            <h1>Order Book</h1>
            <p className="subtitle">
              Live BUY and SELL orders from the matching engine.
            </p>
          </div>
        </div>
        {api.error && <div className="healthnote">{api.error}</div>}
        <OrderBookPanel orderBook={api.orderBook} />
        <Footer />
      </>
    );
  } else if (nav === "Trade History") {
    pageContent = <TradeHistoryPage trades={api.trades} />;
  } else if (nav === "System Health") {
    pageContent = (
      <>
        <div className="titleline">
          <div>
            <div className="eyebrow">MARKET OPERATIONS · SESSION 001</div>
            <h1>System Health</h1>
            <p className="subtitle">Inspect backend and engine status.</p>
          </div>
        </div>
        <SystemHealthPanel
          health={api.health}
          error={api.error}
          loading={api.loading}
        />
        <Footer />
      </>
    );
  } else {
    pageContent = <PlaceholderPage page={nav} />;
  }

  return (
    <div className="layout">
      {mobileNavOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brandicon"><Activity /></div>
          <div>
            <b>Chronos<span>Match</span></b>
            <small>TRADING SIMULATOR</small>
          </div>
        </div>

        <button
          className="mobile-nav-close"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X size={18} />
        </button>

        <label>WORKSPACE</label>
        {navigation.slice(0, 4).map(([Icon, name]) => (
          <button
            key={name}
            className={`nav ${nav === name ? "active" : ""}`}
            aria-current={nav === name ? "page" : undefined}
            onClick={() => {
              setNav(name);
              setMobileNavOpen(false);
            }}
          >
            <Icon size={18} />{name}
          </button>
        ))}

        <div className="side-rule" />
        <label>SYSTEM</label>
        {navigation.slice(4).map(([Icon, name]) => (
          <button
            key={name}
            className={`nav ${nav === name ? "active" : ""}`}
            aria-current={nav === name ? "page" : undefined}
            onClick={() => {
              setNav(name);
              setMobileNavOpen(false);
            }}
          >
            <Icon size={18} />{name}
            {name === "System Health" && (
              <i className={`dot ${api.error ? "yellow" : ""}`} />
            )}
          </button>
        ))}

        <div className="sidebottom">
          <div className="help">
            <ShieldCheck />
            <b>Safe demo environment</b>
            <p>Mock orders only. No real exchange connection.</p>
          </div>
          <div className="profile">
            <div className="avatar">S</div>
            <div>
              <b>Solo Developer</b>
              <small>Local workspace</small>
            </div>
          </div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="crumb">Workspace <span>/</span> {nav}</div>
          <div className="topright">
            <span className="sample">
              <i />
              {api.error ? "BACKEND OFFLINE" : "API DATA"}
            </span>
            <button
              title="Refresh API data"
              aria-label="Refresh API data"
              onClick={api.refresh}
              className="refresh-button"
            >
              <Bell size={18} />
            </button>
            <div className="avatar">S</div>
          </div>
        </header>

        <div className="content">{pageContent}</div>
      </main>
    </div>
  );
}
