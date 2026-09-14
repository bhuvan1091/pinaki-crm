import { useEffect, useState } from "react";
import { Copy, Download, CheckCircle2 } from "lucide-react";
import { API, downloadDocument } from "../../lib/api";

export default function PayPage({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch(`${API}/public/pay/${token}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).detail || "Invalid link"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  const copy = (label, val) => {
    navigator.clipboard.writeText(String(val)).then(() => { setCopied(label); setTimeout(() => setCopied(""), 1500); });
  };

  if (error) return (
    <div className="public-page"><div className="public-card"><div className="brand-mark">PS</div><h1>Link unavailable</h1><p className="muted">{error}</p></div></div>
  );
  if (!data) return <div className="public-page"><div className="public-card"><p className="muted">Loading invoice…</p></div></div>;

  const inv = data.invoice; const o = data.order; const b = data.bank_details;
  const paid = data.outstanding <= 0;

  return (
    <div className="public-page">
      <div className="public-card wide">
        <div className="brand-mark">PS</div>
        <div className="small-label">INVOICE · {inv.invoice_number}</div>
        <h1>Pay ₹{(data.outstanding || 0).toLocaleString("en-IN")}</h1>
        <p className="muted">
          {paid ? "This invoice has been fully paid — thank you." : `Please arrange payment before ${inv.due_date}.`}
        </p>
        <div className="facts">
          <div><small>Order</small><b>{o.order_id}</b></div>
          <div><small>Product</small><b>{o.product}</b></div>
          <div><small>Invoice date</small><b>{inv.invoice_date}</b></div>
          <div><small>Due date</small><b>{inv.due_date}</b></div>
          <div><small>Total invoiced</small><b>₹{(inv.total || 0).toLocaleString("en-IN")}</b></div>
          <div><small>Received so far</small><b>₹{(data.amount_paid || 0).toLocaleString("en-IN")}</b></div>
        </div>

        {inv.pdf_document_id && (
          <a className="outline-btn wide top-gap" href={downloadDocument(inv.pdf_document_id)} target="_blank" rel="noreferrer" data-testid="pay-invoice-pdf">
            <Download size={15} /> Download tax invoice (PDF)
          </a>
        )}

        {!paid && (
          <>
            <h2 style={{ marginTop: 32, fontSize: 18, color: "#0f172a" }}>Bank transfer details</h2>
            <div className="bank-grid">
              {[
                ["Account name", b.account_name],
                ["Bank", `${b.bank_name} · ${b.branch}`],
                ["Account number", b.account_number],
                ["IFSC", b.ifsc],
                ["UPI", b.upi_id],
                ["SWIFT (for overseas)", b.swift],
              ].map(([k, v]) => (
                <div key={k} className="bank-row" data-testid={`bank-row-${k.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  <div><small>{k}</small><b>{v}</b></div>
                  <button className="text-btn" onClick={() => copy(k, v)}>{copied === k ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 20, fontSize: 12 }}>
              Please quote invoice number <b>{inv.invoice_number}</b> in your payment narration. Reply to the email you received with the payment reference once done.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
