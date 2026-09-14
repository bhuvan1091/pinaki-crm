import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api, downloadDocument } from "../../lib/api";
import { money, badgeTone } from "../../lib/format";

export default function Invoices({ onOpen }) {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { api("get", "/invoices").then((r) => setInvoices(r.data)); }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">ACCOUNTS</div><h1>Invoices</h1><p className="muted">Auto-generated PDF invoices, auto reminders when overdue.</p></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All invoices <span className="count">{invoices.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Client</th><th>Order</th><th>Date</th><th>Due</th><th>Total</th><th>Received</th><th>Outstanding</th><th>Status</th><th>PDF</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.invoice_id} data-testid={`invoice-row-${i.invoice_number}`}>
                  <td onClick={() => onOpen(i.order_id)}><b className="mono">{i.invoice_number}</b></td>
                  <td onClick={() => onOpen(i.order_id)}>{i.client_name}</td>
                  <td onClick={() => onOpen(i.order_id)} className="mono">{i.order_id}</td>
                  <td onClick={() => onOpen(i.order_id)}>{i.invoice_date}</td>
                  <td onClick={() => onOpen(i.order_id)}>{i.due_date}</td>
                  <td onClick={() => onOpen(i.order_id)}><b>{money(i.total)}</b></td>
                  <td onClick={() => onOpen(i.order_id)}>{money(i.amount_received || 0)}</td>
                  <td onClick={() => onOpen(i.order_id)}><b>{money(i.outstanding || 0)}</b></td>
                  <td onClick={() => onOpen(i.order_id)}><span className={`badge ${badgeTone(i.status)}`}>{i.status}</span></td>
                  <td>{i.pdf_document_id ? <a className="text-btn" href={downloadDocument(i.pdf_document_id)} target="_blank" rel="noreferrer" data-testid={`invoice-list-pdf-${i.invoice_number}`}><Download size={13} /> PDF</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="empty-inline">No invoices generated yet. Deliver an order and it will appear here.</div>}
        </div>
      </section>
    </div>
  );
}
