import { useMemo } from "react";
import { compactMoney, badgeTone } from "../../lib/format";

export default function StageQueue({ title, subtitle, stages, orders, onOpen }) {
  const filtered = useMemo(() => {
    if (!stages) return orders;
    return orders.filter((o) => stages.includes(o.current_stage));
  }, [orders, stages]);

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">QUEUE</div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
      </div>
      <div className="metrics-grid">
        <MetricBox label="In this queue" value={filtered.length} />
        <MetricBox label="Urgent" value={filtered.filter((o) => o.priority === "Urgent").length} tone="red" />
        <MetricBox label="High priority" value={filtered.filter((o) => o.priority === "High").length} tone="amber" />
        <MetricBox label="Total value" value={compactMoney(filtered.reduce((s, o) => s + (o.total_value || 0), 0))} tone="green" />
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>Orders in {title.toLowerCase()} <span className="count">{filtered.length}</span></h3></div><span className="muted">Click a row to advance the workflow</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Product</th><th>Delivery</th><th>Value</th><th>Priority</th><th>Stage</th></tr></thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.order_id} onClick={() => onOpen(o.order_id)} data-testid={`queue-row-${o.order_id}`}>
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
          {filtered.length === 0 && <div className="empty-inline">Nothing pending in this queue — good work.</div>}
        </div>
      </section>
    </div>
  );
}

function MetricBox({ label, value, tone = "blue" }) {
  return <div className={`metric ${tone}`} data-testid={`stage-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><div className="metric-top"><span>{label}</span></div><strong>{value}</strong></div>;
}
