import { useState } from "react";
import { X, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { compactMoney } from "../../lib/format";

function NewClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ company_name: "", contact_person: "", email: "", phone: "", gstin: "", pan: "", billing_address: "", shipping_address: "", payment_terms: "Net 30", credit_limit: 0, account_manager: "", notes: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api("post", "/clients", { ...form, credit_limit: Number(form.credit_limit) });
      toast.success("Client added");
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Please complete client details");
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="new-client-form">
        <div className="modal-head"><div><div className="small-label">ACCOUNTS</div><h2>Add client</h2></div><button type="button" className="icon-btn" onClick={onClose} data-testid="new-client-close-button"><X size={18} /></button></div>
        <div className="form-grid">
          <label>Company name<input required value={form.company_name} onChange={(e) => set("company_name", e.target.value)} data-testid="new-client-company-input" /></label>
          <label>Contact person<input required value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} data-testid="new-client-contact-input" /></label>
          <label>Email<input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="new-client-email-input" /></label>
          <label>Phone<input required value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="new-client-phone-input" /></label>
          <label>GSTIN<input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} data-testid="new-client-gstin-input" /></label>
          <label>PAN<input value={form.pan} onChange={(e) => set("pan", e.target.value)} data-testid="new-client-pan-input" /></label>
          <label>Payment terms<input value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} data-testid="new-client-terms-input" /></label>
          <label>Credit limit<input type="number" value={form.credit_limit} onChange={(e) => set("credit_limit", e.target.value)} data-testid="new-client-credit-input" /></label>
          <label>Account manager<input value={form.account_manager} onChange={(e) => set("account_manager", e.target.value)} data-testid="new-client-manager-input" /></label>
        </div>
        <label className="full">Billing address<input value={form.billing_address} onChange={(e) => set("billing_address", e.target.value)} data-testid="new-client-billing-input" /></label>
        <label className="full">Shipping address<input value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} data-testid="new-client-shipping-input" /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary-btn wide" data-testid="new-client-submit-button">Add client <ChevronRight size={16} /></button>
      </form>
    </div>
  );
}

export default function Clients({ clients, onOpen, onChange, user }) {
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const canCreate = ["admin", "sales"].includes(user.role);

  const load = (id) => api("get", `/clients/${id}`).then((r) => setSelected(r.data));
  const filtered = clients.filter((c) => `${c.company_name} ${c.contact_person} ${c.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">DIRECTORY</div>
          <h1>Clients</h1>
          <p className="muted">Every client is connected to every downstream record.</p>
        </div>
        {canCreate && <button className="primary-btn compact" data-testid="clients-new-button" onClick={() => setShowNew(true)}>+ Add client</button>}
      </div>
      <div className="toolbar">
        <div className="search-box"><Search size={17} /><input placeholder="Search client, contact, email" value={q} onChange={(e) => setQ(e.target.value)} data-testid="clients-search-input" /></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All clients <span className="count">{filtered.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Client</th><th>Contact</th><th>GSTIN</th><th>Payment terms</th><th>Credit limit</th><th>Manager</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.client_id} data-testid={`client-row-${c.client_id}`} onClick={() => load(c.client_id)}>
                  <td><b>{c.company_name}</b><small className="mono">{c.client_id}</small></td>
                  <td>{c.contact_person}<small>{c.email}</small></td>
                  <td className="mono">{c.gstin || "—"}</td>
                  <td>{c.payment_terms}</td>
                  <td>{compactMoney(c.credit_limit)}</td>
                  <td>{c.account_manager || "—"}</td>
                  <td><span className="badge green">{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-inline">No clients match this search.</div>}
        </div>
      </section>
      {showNew && <NewClientModal onClose={() => setShowNew(false)} onCreated={onChange} />}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()} data-testid="client-detail-modal">
            <div className="modal-head">
              <div><div className="small-label">CLIENT · {selected.client_id}</div><h2>{selected.company_name}</h2><p className="muted">{selected.contact_person} · {selected.email} · {selected.phone}</p></div>
              <button className="icon-btn" onClick={() => setSelected(null)} data-testid="client-detail-close"><X size={18} /></button>
            </div>
            <div className="facts">
              <div><small>GSTIN</small><b className="mono">{selected.gstin || "—"}</b></div>
              <div><small>PAN</small><b className="mono">{selected.pan || "—"}</b></div>
              <div><small>Payment terms</small><b>{selected.payment_terms}</b></div>
              <div><small>Credit limit</small><b>{compactMoney(selected.credit_limit)}</b></div>
              <div><small>Manager</small><b>{selected.account_manager || "—"}</b></div>
              <div><small>Status</small><b>{selected.status}</b></div>
            </div>
            <div className="panel-title top-gap"><div><h3>Orders</h3></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Order</th><th>Product</th><th>Delivery</th><th>Value</th><th>Stage</th></tr></thead>
                <tbody>
                  {(selected.orders || []).map((o) => (
                    <tr key={o.order_id} onClick={() => { setSelected(null); onOpen(o.order_id); }} data-testid={`client-order-row-${o.order_id}`}>
                      <td className="mono">{o.order_id}</td>
                      <td>{o.product}</td>
                      <td>{o.required_delivery_date}</td>
                      <td>{compactMoney(o.total_value)}</td>
                      <td><span className="badge blue">{o.current_stage}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(selected.orders || []).length === 0 && <div className="empty-inline">No orders yet for this client.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
