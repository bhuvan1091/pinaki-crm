import { useEffect, useState } from "react";
import { X, Send, Paperclip, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

const TEMPLATE_LABELS = {
  design_share: "Design for review",
  approval_request: "Approval request",
  challan: "Delivery challan",
  delivery_pod: "Proof of delivery",
  invoice: "Invoice",
  payment_reminder: "Payment reminder",
  generic: "General update",
};

const DEFAULT_MESSAGES = {
  design_share: "Please find attached the latest design version for your kind approval. Do let us know if any revisions are needed.",
  approval_request: "We are awaiting your confirmation to move this order into production. Please review and approve at your earliest convenience.",
  challan: "Please find the dispatch challan attached for your records. Your consignment is on the way.",
  delivery_pod: "The order has been delivered successfully. Attached is the signed proof of delivery.",
  invoice: "Please find the invoice for the recently delivered order attached. Kindly process at your earliest convenience.",
  payment_reminder: "This is a gentle reminder for the outstanding balance against the invoice referenced below.",
  generic: "",
};

export default function SendEmailModal({ order, defaultTemplate = "generic", defaultDocuments = [], onClose }) {
  const [config, setConfig] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [template, setTemplate] = useState(defaultTemplate);
  const [recipient, setRecipient] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGES[defaultTemplate] || "");
  const [attach, setAttach] = useState(new Set(defaultDocuments));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("get", "/emails/config").then((r) => setConfig(r.data)).catch(() => setConfig({ configured: false }));
    api("get", `/orders/${order.order_id}/documents`).then((r) => setDocuments(r.data)).catch(() => setDocuments(order.documents || []));
    if (order.client_id) {
      api("get", `/clients/${order.client_id}`).then((r) => setRecipient(r.data.email || "")).catch(() => {});
    }
  }, [order.order_id, order.client_id]);

  useEffect(() => {
    setMessage(DEFAULT_MESSAGES[template] || "");
  }, [template]);

  const toggleAttach = (id) => {
    setAttach((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("post", "/emails/send", {
        order_id: order.order_id,
        recipient,
        subject,
        message,
        template,
        document_ids: Array.from(attach),
        cc: cc ? cc.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success(`Email sent to ${recipient}`);
      onClose(true);
    } catch (err) {
      const d = err.response?.data?.detail || "Could not send email";
      setError(typeof d === "string" ? d : "Could not send email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => onClose(false)}>
      <form className="modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="send-email-form">
        <div className="modal-head">
          <div><div className="small-label">CLIENT EMAIL · {order.order_id}</div><h2>Send to client</h2><p className="muted">From {config?.sender || "info@ashokatechnovations.com"}</p></div>
          <button type="button" className="icon-btn" onClick={() => onClose(false)} data-testid="send-email-close"><X size={18} /></button>
        </div>

        {config && !config.configured && (
          <div className="error" data-testid="email-not-configured">
            <AlertCircle size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Email is not configured yet. Ask an admin to add the Resend API key to enable sending.
          </div>
        )}

        <div className="form-grid">
          <label>Template
            <select value={template} onChange={(e) => setTemplate(e.target.value)} data-testid="email-template-select">
              {Object.entries(TEMPLATE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>To
            <input type="email" required value={recipient} onChange={(e) => setRecipient(e.target.value)} data-testid="email-recipient-input" />
          </label>
          <label>CC (comma-separated)
            <input value={cc} onChange={(e) => setCc(e.target.value)} data-testid="email-cc-input" placeholder="optional" />
          </label>
          <label>Subject (optional override)
            <input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="email-subject-input" placeholder="Leave blank to use template subject" />
          </label>
        </div>

        <label className="full">Message
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} data-testid="email-message-input" />
        </label>

        <div className="doc-picker" data-testid="email-attachments-picker">
          <div className="small-label" style={{ marginBottom: 8 }}><Paperclip size={12} style={{ verticalAlign: "middle" }} /> ATTACHMENTS ({attach.size})</div>
          {documents.length === 0 && <div className="empty-inline">No documents on this order yet. Upload from the Documents tab first.</div>}
          {documents.map((d) => (
            <label key={d.document_id} className="doc-pick" data-testid={`email-attach-${d.document_id}`}>
              <input type="checkbox" checked={attach.has(d.document_id)} onChange={() => toggleAttach(d.document_id)} />
              <div><b>{d.name}</b><small>{d.category} · {new Date(d.created_at).toLocaleDateString()}</small></div>
            </label>
          ))}
        </div>

        {error && <div className="error" data-testid="send-email-error">{error}</div>}
        <button className="primary-btn wide" data-testid="send-email-submit" disabled={busy || (config && !config.configured)}>
          <Send size={15} /> {busy ? "Sending…" : "Send email"}
        </button>
      </form>
    </div>
  );
}
