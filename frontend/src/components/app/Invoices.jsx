import { useEffect, useState } from "react";
import { Download, BellOff, Bell, X } from "lucide-react";
import { toast } from "sonner";
import { api, downloadDocument } from "../../lib/api";
import { money, badgeTone } from "../../lib/format";

export default function Invoices({ onOpen }) {
  const [invoices, setInvoices] = useState([]);
  const [snoozeFor, setSnoozeFor] = useState(null);

  const load = () => api("get", "/invoices").then((r) => setInvoices(r.data));
  useEffect(() => { load(); }, []);

  const clearSnooze = async (invoice_id) => {
    try {
      await api("post", `/invoices/${invoice_id}/unsnooze`);
      toast.success("Snooze cleared — reminders resumed");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not clear snooze");
    }
  };

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">ACCOUNTS</div><h1>Invoices</h1><p className="muted">Auto-generated PDF invoices, auto reminders when overdue.</p></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All invoices <span className="count">{invoices.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Client</th><th>Order</th><th>Due</th><th>Total</th><th>Outstanding</th><th>Status</th><th>Reminders</th><th>Actions</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.invoice_id} data-testid={`invoice-row-${i.invoice_number}`}>
                  <td onClick={() => onOpen(i.order_id)}><b className="mono">{i.invoice_number}</b></td>
                  <td onClick={() => onOpen(i.order_id)}>{i.client_name}</td>
                  <td onClick={() => onOpen(i.order_id)} className="mono">{i.order_id}</td>
                  <td onClick={() => onOpen(i.order_id)}>{i.due_date}</td>
                  <td onClick={() => onOpen(i.order_id)}><b>{money(i.total)}</b></td>
                  <td onClick={() => onOpen(i.order_id)}><b>{money(i.outstanding || 0)}</b></td>
                  <td onClick={() => onOpen(i.order_id)}><span className={`badge ${badgeTone(i.status)}`}>{i.status}</span></td>
                  <td>
                    {i.snoozed_until ? (
                      <span className="badge amber" data-testid={`invoice-snooze-badge-${i.invoice_number}`} title={i.snooze_note}>Snoozed to {i.snoozed_until}</span>
                    ) : i.status === "Paid" ? "—" : <span className="muted" style={{ fontSize: 11 }}>Active</span>}
                  </td>
                  <td className="row-actions">
                    {i.pdf_document_id && <a className="text-btn" href={downloadDocument(i.pdf_document_id)} target="_blank" rel="noreferrer" data-testid={`invoice-list-pdf-${i.invoice_number}`}><Download size={13} /> PDF</a>}
                    {i.status !== "Paid" && !i.snoozed_until && (
                      <button className="text-btn" data-testid={`invoice-snooze-${i.invoice_number}`} onClick={() => setSnoozeFor(i)}><BellOff size={13} /> Snooze</button>
                    )}
                    {i.snoozed_until && (
                      <button className="text-btn" data-testid={`invoice-unsnooze-${i.invoice_number}`} onClick={() => clearSnooze(i.invoice_id)}><Bell size={13} /> Resume</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="empty-inline">No invoices generated yet. Deliver an order and it will appear here.</div>}
        </div>
      </section>
      {snoozeFor && <SnoozeModal invoice={snoozeFor} onClose={(refreshed) => { setSnoozeFor(null); if (refreshed) load(); }} />}
    </div>
  );
}

function SnoozeModal({ invoice, onClose }) {
  const [days, setDays] = useState(7);
  const [promised, setPromised] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api("post", `/invoices/${invoice.invoice_id}/snooze`, { days: Number(days), promised_date: promised, note });
      toast.success(`Reminders paused for ${days} days`);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not snooze");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="snooze-modal">
        <div className="modal-head">
          <div><div className="small-label">SNOOZE REMINDERS · {invoice.invoice_number}</div><h2>Pause reminders</h2><p className="muted">Client promised a date? Silence reminders until they do.</p></div>
          <button type="button" className="icon-btn" onClick={() => onClose(false)}><X size={18} /></button>
        </div>
        <div className="form-grid">
          <label>Snooze for (days)<input type="number" min="1" max="60" value={days} onChange={(e) => setDays(e.target.value)} data-testid="snooze-days-input" required /></label>
          <label>Client promised date<input type="date" value={promised} onChange={(e) => setPromised(e.target.value)} data-testid="snooze-promised-input" /></label>
        </div>
        <label className="full">Internal note<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-testid="snooze-note-input" placeholder="e.g. Finance team confirmed transfer by 20th on call" /></label>
        {error && <div className="error" data-testid="snooze-error">{error}</div>}
        <button className="primary-btn wide" data-testid="snooze-submit-button" disabled={busy}>{busy ? "Snoozing…" : `Snooze for ${days} days`}</button>
      </form>
    </div>
  );
}
