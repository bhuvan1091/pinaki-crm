import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { money, badgeTone } from "../../lib/format";

export default function Invoices({ onOpen }) {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => { api("get", "/invoices").then((r) => setInvoices(r.data)); }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">ACCOUNTS</div><h1>Invoices</h1><p className="muted">Generated automatically from delivered orders.</p></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All invoices <span className="count">{invoices.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Client</th><th>Order</th><th>Date</th><th>Due</th><th>Total</th><th>Received</th><th>Outstanding</th><th>Status</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.invoice_id} onClick={() => onOpen(i.order_id)} data-testid={`invoice-row-${i.invoice_number}`}>
                  <td><b className="mono">{i.invoice_number}</b></td>
                  <td>{i.client_name}</td>
                  <td className="mono">{i.order_id}</td>
                  <td>{i.invoice_date}</td>
                  <td>{i.due_date}</td>
                  <td><b>{money(i.total)}</b></td>
                  <td>{money(i.amount_received || 0)}</td>
                  <td><b>{money(i.outstanding || 0)}</b></td>
                  <td><span className={`badge ${badgeTone(i.status)}`}>{i.status}</span></td>
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
