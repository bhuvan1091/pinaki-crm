import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { stages, compactMoney, badgeTone, testid } from "../../lib/format";

function NewOrderModal({ clients, onClose, onCreated }) {
  const [form, setForm] = useState({
    client_id: clients[0]?.client_id || "",
    product: "",
    product_code: "",
    quantity: 100,
    unit_price: 100,
    required_delivery_date: "",
    po_number: "",
    po_date: "",
    priority: "Normal",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("post", "/orders", { ...form, quantity: Number(form.quantity), unit_price: Number(form.unit_price) });
      toast.success(`Order ${r.data.order_id} created`);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Please complete the order details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="new-order-form">
        <div className="modal-head">
          <div><div className="small-label">CENTRAL RECORD</div><h2>Create new order</h2></div>
          <button type="button" className="icon-btn" data-testid="new-order-close-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label>Client<select data-testid="new-order-client-select" value={form.client_id} onChange={(e) => set("client_id", e.target.value)} required>{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select></label>
          <label>Product / service<input data-testid="new-order-product-input" value={form.product} onChange={(e) => set("product", e.target.value)} required /></label>
          <label>Product code<input data-testid="new-order-product-code-input" value={form.product_code} onChange={(e) => set("product_code", e.target.value)} /></label>
          <label>PO number<input data-testid="new-order-po-input" value={form.po_number} onChange={(e) => set("po_number", e.target.value)} /></label>
          <label>Quantity<input data-testid="new-order-quantity-input" type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required /></label>
          <label>Unit price (₹)<input data-testid="new-order-price-input" type="number" min="1" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} required /></label>
          <label>Required delivery<input data-testid="new-order-delivery-date-input" type="date" value={form.required_delivery_date} onChange={(e) => set("required_delivery_date", e.target.value)} required /></label>
          <label>Priority<select data-testid="new-order-priority-select" value={form.priority} onChange={(e) => set("priority", e.target.value)}><option>Normal</option><option>High</option><option>Urgent</option></select></label>
        </div>
        <label className="full">Notes<textarea data-testid="new-order-notes-input" value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} /></label>
        {error && <div className="error" data-testid="new-order-error">{error}</div>}
        <button className="primary-btn wide" data-testid="new-order-submit-button" disabled={busy}>{busy ? "Creating…" : "Create order"} <ChevronRight size={16} /></button>
      </form>
    </div>
  );
}

export default function Orders({ orders, clients, onOpen, onCreated, user }) {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [showNew, setShowNew] = useState(false);
  const canCreate = ["admin", "sales"].includes(user.role);

  const filtered = useMemo(
    () => orders.filter((o) => {
      const matchS = !stage || o.current_stage === stage;
      const matchQ = !search || `${o.order_id} ${o.client_name} ${o.product} ${o.po_number || ""}`.toLowerCase().includes(search.toLowerCase());
      return matchS && matchQ;
    }),
    [orders, search, stage]
  );

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">OPERATIONS / CENTRAL REGISTER</div>
          <h1>Orders</h1>
          <p className="muted">The central reference for every client commitment.</p>
        </div>
        {canCreate && <button className="primary-btn compact" data-testid="orders-new-button" onClick={() => setShowNew(true)}>+ New order</button>}
      </div>
      <div className="toolbar">
        <div className="search-box"><Search size={17} /><input data-testid="orders-search-input" placeholder="Search order, client, PO or product" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select data-testid="orders-stage-filter" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {stages.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <section className="panel">
        <div className="panel-title">
          <div><h3>All orders <span className="count">{filtered.length}</span></h3></div>
          <span className="muted">Updated moments ago</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Product</th><th>Delivery</th><th>Value</th><th>Priority</th><th>Stage</th></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.order_id} onClick={() => onOpen(o.order_id)} data-testid={`order-row-${o.order_id}`}>
                  <td><b className="mono">{o.order_id}</b><small>{o.order_date}</small></td>
                  <td><b>{o.client_name}</b><small>{o.po_number || "—"}</small></td>
                  <td>{o.product}<small>{(o.quantity || 0).toLocaleString()} units</small></td>
                  <td>{o.required_delivery_date}</td>
                  <td><b>{compactMoney(o.total_value)}</b></td>
                  <td><span className={`badge ${o.priority === "Urgent" ? "red" : o.priority === "High" ? "amber" : "blue"}`}>{o.priority}</span></td>
                  <td><span className={`badge ${badgeTone(o.current_stage)}`}>{o.current_stage}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-inline">No orders match this view.</div>}
        </div>
      </section>
      {showNew && <NewOrderModal clients={clients} onClose={() => setShowNew(false)} onCreated={onCreated} />}
    </div>
  );
}
