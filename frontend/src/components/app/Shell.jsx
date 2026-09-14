import { useEffect, useState } from "react";
import { Bell, ChevronRight, ClipboardList, CreditCard, FileText, LayoutDashboard, LogOut, Menu, PackageCheck, Search, Settings as Cog, Truck, Users, X, BarChart3, ShieldCheck, ContactRound, Palette, CheckCircle2, Factory, Send, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { testid } from "../../lib/format";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: Sparkles },
  { label: "Clients", icon: Users },
  { label: "Contacts", icon: ContactRound },
  { label: "Orders", icon: ClipboardList },
  { label: "Design", icon: Palette },
  { label: "Approvals", icon: CheckCircle2 },
  { label: "Production", icon: Factory },
  { label: "Dispatch", icon: Send },
  { label: "Challans", icon: FileText },
  { label: "Delivery", icon: Truck },
  { label: "Accounts", icon: CreditCard },
  { label: "Invoices", icon: FileText },
  { label: "Payments", icon: CreditCard },
  { label: "Reports", icon: BarChart3 },
  { label: "Users & Roles", icon: ShieldCheck },
];

export default function Shell({ user, page, setPage, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = () => api("get", "/notifications").then((r) => mounted && setNotifs(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!q) { setResults(null); return; }
    const handle = setTimeout(async () => {
      try {
        const r = await api("get", `/search?q=${encodeURIComponent(q)}`);
        setResults(r.data);
      } catch { /* noop */ }
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  const go = (label) => { setPage(label); setMenuOpen(false); };
  const initials = (user.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const unread = notifs.filter((n) => !n.read).length;

  const markRead = async (id) => {
    await api("post", `/notifications/${id}/read`).catch(() => {});
    setNotifs((prev) => prev.map((n) => (n.notif_id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark small">PS</div>
          <div><b>Pinaki</b><small>Solutions CRM</small></div>
          <button className="mobile-close" data-testid="mobile-close-button" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {NAV.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={page === label ? "nav-item active" : "nav-item"}
              data-testid={`nav-${testid(label)}`}
              onClick={() => go(label)}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" data-testid="nav-settings" onClick={() => go("Settings")}>
            <Cog size={17} /> Settings
          </button>
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div><b>{user.name}</b><small>{user.role}</small></div>
            <button data-testid="logout-button" onClick={onLogout}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" data-testid="mobile-menu-button" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumbs">
            <span>Pinaki Solutions</span><ChevronRight size={14} /><b>{page.replace("OrderDetail", "Order")}</b>
          </div>
          <div className="top-actions">
            <button className="global-search" data-testid="global-search-open" onClick={() => setSearchOpen(true)}>
              <Search size={15} /> Search orders, clients, invoices…
            </button>
            <button className="icon-btn" data-testid="notifications-button" onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={18} />
              {unread > 0 && <i data-testid="notifications-badge">{unread}</i>}
            </button>
          </div>
        </header>

        {notifOpen && (
          <div className="notif-drawer" data-testid="notifications-drawer">
            <div className="notif-head">
              <b>Notifications</b>
              <button onClick={() => setNotifOpen(false)}><X size={16} /></button>
            </div>
            <div className="notif-list">
              {notifs.length === 0 && <div className="notif-empty">You're all caught up.</div>}
              {notifs.map((n) => (
                <button
                  key={n.notif_id}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                  data-testid={`notification-${n.notif_id}`}
                  onClick={() => markRead(n.notif_id)}
                >
                  <span className="dot amber" />
                  <div><b>{n.message}</b><small>{new Date(n.created_at).toLocaleString()}</small></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchOpen && (
          <div className="search-modal" data-testid="global-search-modal" onClick={() => setSearchOpen(false)}>
            <div className="search-panel" onClick={(e) => e.stopPropagation()}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, clients, invoices, challans…" data-testid="global-search-input" />
              <div className="search-results">
                {results && Object.entries(results).map(([key, arr]) => (
                  arr.length > 0 && (
                    <div key={key} className="search-group">
                      <div className="small-label">{key.toUpperCase()}</div>
                      {arr.map((r, i) => (
                        <div key={i} className="search-hit" data-testid={`search-hit-${key}-${i}`}>
                          <b>{r.order_id || r.company_name || r.invoice_number || r.challan_number}</b>
                          <small>{r.client_name || r.contact_person || r.total || r.tracking_number}</small>
                        </div>
                      ))}
                    </div>
                  )
                ))}
                {q && results && Object.values(results).every((a) => a.length === 0) && (
                  <div className="notif-empty">No matches</div>
                )}
              </div>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
