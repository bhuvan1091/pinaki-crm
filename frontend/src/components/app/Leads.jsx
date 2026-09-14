import { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, Search, Phone, Mail, MessageSquare, Calendar, UserPlus, Kanban, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { compactMoney, money, testid } from "../../lib/format";

const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];
const SOURCES = ["Website", "Referral", "Cold Call", "LinkedIn", "Event", "Email Inbound", "Other"];
const STATUS_TONE = { "New": "blue", "Contacted": "blue", "Qualified": "amber", "Proposal Sent": "amber", "Negotiation": "amber", "Won": "green", "Lost": "red" };

export default function Leads({ user, onOpenOrder }) {
  const [leads, setLeads] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [view, setView] = useState("table");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const canEdit = ["admin", "sales"].includes(user.role);

  const load = async () => {
    const [l, p] = await Promise.all([api("get", "/leads"), api("get", "/leads/pipeline")]);
    setLeads(l.data); setPipeline(p.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => leads.filter((l) => {
    const okS = !statusFilter || l.status === statusFilter;
    const okQ = !q || `${l.company_name} ${l.contact_person} ${l.email} ${l.product_interest}`.toLowerCase().includes(q.toLowerCase());
    return okS && okQ;
  }), [leads, q, statusFilter]);

  const totals = pipeline?.totals || {};

  const onDropCard = async (targetStatus) => {
    if (!dragging || !canEdit) { setDragging(null); setDropTarget(null); return; }
    const lead = dragging;
    setDragging(null); setDropTarget(null);
    if (lead.status === targetStatus) return;
    // optimistic update
    setPipeline((p) => {
      if (!p) return p;
      const next = { ...p, buckets: { ...p.buckets } };
      next.buckets[lead.status] = (next.buckets[lead.status] || []).filter((x) => x.lead_id !== lead.lead_id);
      next.buckets[targetStatus] = [{ ...lead, status: targetStatus }, ...(next.buckets[targetStatus] || [])];
      return next;
    });
    try {
      await api("patch", `/leads/${lead.lead_id}`, { status: targetStatus });
      toast.success(`${lead.company_name} → ${targetStatus}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not move");
      load();
    }
  };

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">SALES · PIPELINE</div>
          <h1>Leads</h1>
          <p className="muted">Track prospects from first touch to Won. Convert them into clients in one click.</p>
        </div>
        <div className="stack" style={{ flexDirection: "row", gap: 10 }}>
          <div className="view-toggle" role="tablist">
            <button className={view === "table" ? "active" : ""} data-testid="leads-view-table" onClick={() => setView("table")}><TableIcon size={14} /> Table</button>
            <button className={view === "pipeline" ? "active" : ""} data-testid="leads-view-pipeline" onClick={() => setView("pipeline")}><Kanban size={14} /> Pipeline</button>
          </div>
          {canEdit && <button className="primary-btn compact" data-testid="leads-new-button" onClick={() => setShowNew(true)}>+ New lead</button>}
        </div>
      </div>

      <div className="metrics-grid">
        <MetricBox label="Open pipeline" value={compactMoney(pipeline?.open_value)} tone="blue" />
        <MetricBox label="Qualified value" value={compactMoney(totals["Qualified"] || 0)} tone="amber" />
        <MetricBox label="Won this year" value={compactMoney(totals["Won"] || 0)} tone="green" />
        <MetricBox label="Win rate" value={`${pipeline?.win_rate || 0}%`} tone="green" />
      </div>

      {view === "table" ? (
        <>
          <div className="toolbar">
            <div className="search-box"><Search size={17} /><input placeholder="Search company, contact, product" value={q} onChange={(e) => setQ(e.target.value)} data-testid="leads-search-input" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="leads-status-filter">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <section className="panel">
            <div className="panel-title"><div><h3>All leads <span className="count">{filtered.length}</span></h3></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Company</th><th>Contact</th><th>Product interest</th><th>Value</th><th>Source</th><th>Next follow-up</th><th>Owner</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.lead_id} data-testid={`lead-row-${l.lead_id}`} onClick={() => setDetailId(l.lead_id)}>
                      <td><b>{l.company_name}</b><small className="mono">{l.lead_id}</small></td>
                      <td>{l.contact_person}<small>{l.email}</small></td>
                      <td>{l.product_interest || "—"}</td>
                      <td><b>{compactMoney(l.estimated_value)}</b></td>
                      <td>{l.source}</td>
                      <td>{l.next_follow_up || "—"}</td>
                      <td>{l.assigned_to}</td>
                      <td><span className={`badge ${STATUS_TONE[l.status] || "blue"}`}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="empty-inline">No leads match this view.</div>}
            </div>
          </section>
        </>
      ) : (
        <div className="kanban" data-testid="leads-kanban">
          {STATUSES.map((s) => (
            <div
              key={s}
              className={`kanban-col ${dropTarget === s ? "drop-hover" : ""}`}
              data-testid={`kanban-col-${testid(s)}`}
              onDragOver={(e) => { if (canEdit && dragging) { e.preventDefault(); setDropTarget(s); } }}
              onDragLeave={() => setDropTarget((t) => (t === s ? null : t))}
              onDrop={() => onDropCard(s)}
            >
              <div className="kanban-head">
                <div>
                  <span className={`badge ${STATUS_TONE[s]}`}>{s}</span>
                  <b>{(pipeline?.buckets?.[s] || []).length}</b>
                </div>
                <small>{compactMoney(totals[s] || 0)}</small>
              </div>
              <div className="kanban-cards">
                {(pipeline?.buckets?.[s] || []).map((l) => (
                  <button
                    key={l.lead_id}
                    className={`kanban-card ${dragging?.lead_id === l.lead_id ? "dragging" : ""}`}
                    onClick={() => setDetailId(l.lead_id)}
                    data-testid={`kanban-card-${l.lead_id}`}
                    draggable={canEdit}
                    onDragStart={(e) => { setDragging(l); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                  >
                    <b>{l.company_name}</b>
                    <small>{l.contact_person}</small>
                    <div className="kanban-meta"><span>{compactMoney(l.estimated_value)}</span><span>{l.next_follow_up || "—"}</span></div>
                  </button>
                ))}
                {(pipeline?.buckets?.[s] || []).length === 0 && <div className="kanban-empty">{canEdit ? "Drop here" : "—"}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewLeadModal user={user} onClose={(refreshed) => { setShowNew(false); if (refreshed) load(); }} />}
      {detailId && <LeadDetail leadId={detailId} user={user} onClose={(refreshed) => { setDetailId(null); if (refreshed) load(); }} onOpenOrder={onOpenOrder} />}
    </div>
  );
}

function MetricBox({ label, value, tone = "blue" }) {
  return <div className={`metric ${tone}`} data-testid={`lead-metric-${testid(label)}`}><div className="metric-top"><span>{label}</span></div><strong>{value}</strong></div>;
}

function NewLeadModal({ user, onClose }) {
  const [form, setForm] = useState({ company_name: "", contact_person: "", email: "", phone: "", source: "Website", estimated_value: 0, product_interest: "", next_follow_up: "", notes: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api("post", "/leads", { ...form, estimated_value: Number(form.estimated_value || 0) });
      toast.success("Lead created");
      onClose(true);
    } catch (err) { setError(err.response?.data?.detail || "Please complete lead details"); } finally { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="new-lead-form">
        <div className="modal-head"><div><div className="small-label">SALES</div><h2>New lead</h2></div><button type="button" className="icon-btn" onClick={() => onClose(false)}><X size={18} /></button></div>
        <div className="form-grid">
          <label>Company<input required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} data-testid="lead-company-input" /></label>
          <label>Contact person<input required value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} data-testid="lead-contact-input" /></label>
          <label>Email<input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="lead-email-input" /></label>
          <label>Phone<input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="lead-phone-input" /></label>
          <label>Source<select value={form.source} onChange={(e) => set("source", e.target.value)} data-testid="lead-source-select">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Estimated value (₹)<input type="number" min="0" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} data-testid="lead-value-input" /></label>
          <label>Product interest<input value={form.product_interest} onChange={(e) => set("product_interest", e.target.value)} data-testid="lead-product-input" /></label>
          <label>Next follow-up<input type="date" value={form.next_follow_up} onChange={(e) => set("next_follow_up", e.target.value)} data-testid="lead-followup-input" /></label>
        </div>
        <label className="full">Notes<textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} data-testid="lead-notes-input" /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary-btn wide" data-testid="lead-submit-button" disabled={busy}>{busy ? "Saving…" : "Create lead"} <ChevronRight size={16} /></button>
      </form>
    </div>
  );
}

function LeadDetail({ leadId, user, onClose, onOpenOrder }) {
  const [lead, setLead] = useState(null);
  const [busy, setBusy] = useState("");
  const [activity, setActivity] = useState({ type: "call", summary: "", outcome: "" });
  const [showConvert, setShowConvert] = useState(false);
  const canEdit = ["admin", "sales"].includes(user.role);

  const load = async () => { const r = await api("get", `/leads/${leadId}`); setLead(r.data); };
  useEffect(() => { load(); }, [leadId]);

  const changeStatus = async (status) => {
    setBusy("status");
    try { await api("patch", `/leads/${leadId}`, { status }); toast.success(`Moved to ${status}`); await load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Could not update"); }
    finally { setBusy(""); }
  };

  const logActivity = async (e) => {
    e.preventDefault();
    if (!activity.summary.trim()) return;
    setBusy("activity");
    try { await api("post", `/leads/${leadId}/activities`, activity); setActivity({ type: "call", summary: "", outcome: "" }); await load(); }
    catch (err) { toast.error("Could not log activity"); }
    finally { setBusy(""); }
  };

  if (!lead) return <div className="modal-backdrop"><div className="modal">Loading…</div></div>;

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} data-testid="lead-detail-modal">
        <div className="modal-head">
          <div>
            <div className="small-label">LEAD · {lead.lead_id}</div>
            <h2>{lead.company_name}</h2>
            <p className="muted">{lead.contact_person} · {lead.email} · {lead.phone || "—"}</p>
          </div>
          <button className="icon-btn" onClick={() => onClose(true)} data-testid="lead-detail-close"><X size={18} /></button>
        </div>

        <div className="facts">
          <div><small>Status</small><b><span className={`badge ${STATUS_TONE[lead.status]}`}>{lead.status}</span></b></div>
          <div><small>Source</small><b>{lead.source}</b></div>
          <div><small>Estimated value</small><b>{money(lead.estimated_value || 0)}</b></div>
          <div><small>Owner</small><b>{lead.assigned_to}</b></div>
          <div><small>Product interest</small><b>{lead.product_interest || "—"}</b></div>
          <div><small>Next follow-up</small><b>{lead.next_follow_up || "—"}</b></div>
        </div>

        {lead.notes && <div className="public-notes"><b>NOTES</b><p>{lead.notes}</p></div>}

        {canEdit && lead.status !== "Won" && lead.status !== "Lost" && (
          <div className="stack top-gap">
            <div className="small-label">MOVE STATUS</div>
            <div className="status-chips" data-testid="lead-status-chips">
              {STATUSES.map((s) => (
                <button key={s} disabled={busy === "status" || s === lead.status} className={`chip ${s === lead.status ? "active" : ""}`} data-testid={`lead-status-${testid(s)}`} onClick={() => changeStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {canEdit && !lead.converted_client_id && (
          <button className="primary-btn wide top-gap" data-testid="lead-convert-button" onClick={() => setShowConvert(true)}><UserPlus size={15} /> Convert to client</button>
        )}
        {lead.converted_client_id && (
          <div className="waiting" data-testid="lead-converted-banner">
            <span className="dot green" /> Converted to client <b style={{ marginLeft: 6 }}>{lead.client?.company_name}</b> · {lead.converted_client_id}
          </div>
        )}

        <div className="panel-title top-gap"><div><h3>Activity</h3></div></div>
        {canEdit && (
          <form className="form-grid" onSubmit={logActivity} data-testid="lead-activity-form">
            <label>Type<select value={activity.type} onChange={(e) => setActivity({ ...activity, type: e.target.value })} data-testid="activity-type-select"><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option></select></label>
            <label>Summary<input value={activity.summary} onChange={(e) => setActivity({ ...activity, summary: e.target.value })} data-testid="activity-summary-input" placeholder="Brief line — what happened?" /></label>
            <button className="primary-btn" data-testid="activity-log-button" disabled={busy === "activity" || !activity.summary.trim()}>Log</button>
          </form>
        )}
        <div className="version-list top-gap">
          {(lead.activities || []).slice().reverse().map((a, i) => (
            <div className="version-row" key={i} data-testid={`activity-row-${i}`}>
              <ActivityIcon type={a.type} />
              <div><b>{a.summary}</b><small>{a.by} · {new Date(a.at).toLocaleString()}{a.outcome ? ` — ${a.outcome}` : ""}</small></div>
              <span className="badge blue">{a.type.replace(/_/g, " ")}</span>
            </div>
          ))}
          {(lead.activities || []).length === 0 && <div className="empty-inline">No activity logged yet.</div>}
        </div>

        {showConvert && <ConvertModal lead={lead} onClose={(newClient, newOrder) => { setShowConvert(false); if (newClient) { load(); if (newOrder) onOpenOrder && onOpenOrder(newOrder.order_id); } }} />}
      </div>
    </div>
  );
}

function ActivityIcon({ type }) {
  const map = { call: Phone, email: Mail, meeting: Calendar, note: MessageSquare, status_change: ChevronRight, convert: UserPlus };
  const Icon = map[type] || MessageSquare;
  return <div className="history-icon"><Icon size={13} /></div>;
}

function ConvertModal({ lead, onClose }) {
  const [form, setForm] = useState({ gstin: "", pan: "", payment_terms: "Net 30", credit_limit: 0, billing_address: "", shipping_address: "", create_order: false, order_product: lead.product_interest || "", order_quantity: 0, order_unit_price: 0, order_required_delivery: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api("post", `/leads/${lead.lead_id}/convert`, { ...form, credit_limit: Number(form.credit_limit || 0), order_quantity: Number(form.order_quantity || 0), order_unit_price: Number(form.order_unit_price || 0) });
      toast.success(r.data.order ? `Client created · Order ${r.data.order.order_id} kicked off` : "Client created");
      onClose(r.data.client, r.data.order);
    } catch (err) { setError(err.response?.data?.detail || "Could not convert"); } finally { setBusy(false); }
  };
  return (
    <div className="modal-backdrop" onClick={() => onClose()}>
      <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="convert-lead-form">
        <div className="modal-head"><div><div className="small-label">CONVERT · {lead.lead_id}</div><h2>Convert {lead.company_name} to a client</h2><p className="muted">Their data flows automatically to design, production and accounts once you save.</p></div><button type="button" className="icon-btn" onClick={() => onClose()}><X size={18} /></button></div>
        <div className="form-grid">
          <label>GSTIN<input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} data-testid="convert-gstin-input" /></label>
          <label>PAN<input value={form.pan} onChange={(e) => set("pan", e.target.value)} data-testid="convert-pan-input" /></label>
          <label>Payment terms<input value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} data-testid="convert-terms-input" /></label>
          <label>Credit limit (₹)<input type="number" min="0" value={form.credit_limit} onChange={(e) => set("credit_limit", e.target.value)} data-testid="convert-credit-input" /></label>
        </div>
        <label className="full">Billing address<input value={form.billing_address} onChange={(e) => set("billing_address", e.target.value)} data-testid="convert-billing-input" /></label>
        <label className="full">Shipping address<input value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} data-testid="convert-shipping-input" placeholder="Same as billing if blank" /></label>
        <label className="convert-order-toggle" data-testid="convert-order-toggle">
          <input type="checkbox" checked={form.create_order} onChange={(e) => set("create_order", e.target.checked)} data-testid="convert-create-order-checkbox" />
          <span><b>Also create the first order now</b><small>Skip if you're still finalising the brief.</small></span>
        </label>
        {form.create_order && (
          <div className="form-grid">
            <label>Product<input value={form.order_product} onChange={(e) => set("order_product", e.target.value)} data-testid="convert-order-product-input" required={form.create_order} /></label>
            <label>Quantity<input type="number" min="1" value={form.order_quantity} onChange={(e) => set("order_quantity", e.target.value)} data-testid="convert-order-qty-input" required={form.create_order} /></label>
            <label>Unit price (₹)<input type="number" min="1" step="0.01" value={form.order_unit_price} onChange={(e) => set("order_unit_price", e.target.value)} data-testid="convert-order-price-input" required={form.create_order} /></label>
            <label>Required delivery<input type="date" value={form.order_required_delivery} onChange={(e) => set("order_required_delivery", e.target.value)} data-testid="convert-order-delivery-input" required={form.create_order} /></label>
          </div>
        )}
        {error && <div className="error" data-testid="convert-error">{error}</div>}
        <button className="primary-btn wide" data-testid="convert-submit-button" disabled={busy}><UserPlus size={15} /> {busy ? "Converting…" : "Convert to client"}</button>
      </form>
    </div>
  );
}
