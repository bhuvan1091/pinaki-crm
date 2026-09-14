import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { api } from "../../lib/api";
import { money, compactMoney } from "../../lib/format";

export default function Reports() {
  const [r, setR] = useState(null);
  useEffect(() => { api("get", "/reports").then((r) => setR(r.data)); }, []);
  if (!r) return <div className="content"><div className="loading-screen">Loading reports…</div></div>;

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">INSIGHTS</div><h1>Management reports</h1><p className="muted">Volume, pipeline, cash & cycle times at a glance.</p></div>
      </div>
      <div className="metrics-grid">
        <Kpi label="Order volume" value={r.order_volume} />
        <Kpi label="Revenue booked" value={compactMoney(r.revenue)} tone="green" />
        <Kpi label="Outstanding" value={compactMoney(r.outstanding_total)} tone="red" />
        <Kpi label="Avg order → delivery" value={`${r.avg_order_to_delivery}d`} tone="amber" />
      </div>
      <div className="metrics-grid">
        <Kpi label="Pending approvals" value={r.pending_approvals} tone="amber" />
        <Kpi label="Production pending" value={r.production_pending} />
        <Kpi label="Dispatch pending" value={r.dispatch_pending} />
        <Kpi label="Delivery pending" value={r.delivery_pending} />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-title"><div><h3>Top clients by revenue</h3></div></div>
          <div style={{ width: "100%", height: 260 }} data-testid="report-clients-chart">
            <ResponsiveContainer>
              <BarChart data={r.by_client} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="client" stroke="#94a3b8" fontSize={11} width={120} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><div><h3>Top products by revenue</h3></div></div>
          <div style={{ width: "100%", height: 260 }} data-testid="report-products-chart">
            <ResponsiveContainer>
              <BarChart data={r.by_product} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="product" stroke="#94a3b8" fontSize={11} width={140} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "blue" }) {
  return <div className={`metric ${tone}`} data-testid={`report-kpi-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><div className="metric-top"><span>{label}</span></div><strong>{value}</strong></div>;
}
