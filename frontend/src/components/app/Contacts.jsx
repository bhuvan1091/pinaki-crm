import { useEffect, useState } from "react";
import { X, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function Contacts({ clients, user }) {
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const canCreate = ["admin", "sales"].includes(user.role);

  const load = () => api("get", "/contacts").then((r) => setContacts(r.data));
  useEffect(() => { load(); }, []);

  const filtered = contacts.filter((c) => `${c.name} ${c.email} ${c.designation}`.toLowerCase().includes(q.toLowerCase()));
  const clientName = (id) => clients.find((c) => c.client_id === id)?.company_name || "—";

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">DIRECTORY</div>
          <h1>Contacts</h1>
          <p className="muted">Every stakeholder linked to their client account.</p>
        </div>
        {canCreate && <button className="primary-btn compact" data-testid="contacts-new-button" onClick={() => setShowNew(true)}>+ Add contact</button>}
      </div>
      <div className="toolbar">
        <div className="search-box"><Search size={17} /><input placeholder="Search contact, email, designation" value={q} onChange={(e) => setQ(e.target.value)} data-testid="contacts-search-input" /></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All contacts <span className="count">{filtered.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Designation</th><th>Client</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.contact_id} data-testid={`contact-row-${c.contact_id}`}>
                  <td><b>{c.name}</b><small className="mono">{c.contact_id}</small></td>
                  <td>{c.designation || "—"}</td>
                  <td>{clientName(c.client_id)}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="empty-inline">No contacts yet. Add one to start tracking stakeholders.</div>}
        </div>
      </section>
      {showNew && <NewContactModal clients={clients} onClose={() => setShowNew(false)} onCreated={load} />}
    </div>
  );
}

function NewContactModal({ clients, onClose, onCreated }) {
  const [form, setForm] = useState({ client_id: clients[0]?.client_id || "", name: "", designation: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api("post", "/contacts", form);
      toast.success("Contact added");
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Please complete contact details");
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="new-contact-form">
        <div className="modal-head"><div><div className="small-label">CONTACT</div><h2>Add contact</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="form-grid">
          <label>Client<select value={form.client_id} onChange={(e) => set("client_id", e.target.value)} data-testid="new-contact-client-select">{clients.map((c) => <option key={c.client_id} value={c.client_id}>{c.company_name}</option>)}</select></label>
          <label>Name<input required value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="new-contact-name-input" /></label>
          <label>Designation<input value={form.designation} onChange={(e) => set("designation", e.target.value)} data-testid="new-contact-designation-input" /></label>
          <label>Email<input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} data-testid="new-contact-email-input" /></label>
          <label>Phone<input value={form.phone} onChange={(e) => set("phone", e.target.value)} data-testid="new-contact-phone-input" /></label>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="primary-btn wide" data-testid="new-contact-submit-button">Add contact <ChevronRight size={16} /></button>
      </form>
    </div>
  );
}
