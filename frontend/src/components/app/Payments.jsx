import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { money } from "../../lib/format";

export default function Payments({ onOpen }) {
  const [payments, setPayments] = useState([]);
  useEffect(() => { api("get", "/payments").then((r) => setPayments(r.data)); }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">ACCOUNTS</div><h1>Payments</h1><p className="muted">Every receipt against every invoice.</p></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>All payments <span className="count">{payments.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Payment</th><th>Client</th><th>Invoice</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Date</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment_id} onClick={() => onOpen(p.order_id)} data-testid={`payment-row-${p.payment_id}`}>
                  <td className="mono">{p.payment_id}</td>
                  <td>{p.client_name}</td>
                  <td className="mono">{p.invoice_number}</td>
                  <td><b>{money(p.amount)}</b></td>
                  <td>{p.mode}</td>
                  <td>{p.reference || "—"}</td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <div className="empty-inline">No payments recorded yet.</div>}
        </div>
      </section>
    </div>
  );
}
