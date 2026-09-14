import { ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { stages, compactMoney, testid } from "../../lib/format";

const PIE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

function Metric({ label, value, caption, tone = "blue" }) {
  return (
    <div className={`metric ${tone}`} data-testid={`metric-${testid(label)}`}>
      <div className="metric-top"><span>{label}</span></div>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  );
}

function OrderRow({ o, onOpen }) {
  return (
    <tr onClick={() => onOpen(o.order_id)} data-testid={`order-row-${o.order_id}`}>
      <td><b className="mono">{o.order_id}</b><small>{o.order_date}</small></td>
      <td><b>{o.client_name}</b><small>{o.po_number || "—"}</small></td>
      <td>{o.product}<small>{(o.quantity || 0).toLocaleString()} units</small></td>
      <td>{o.required_delivery_date}</td>
      <td><b>{compactMoney(o.total_value)}</b></td>
      <td><span className="badge blue">{o.current_stage}</span></td>
    </tr>
  );
}

export default function Dashboard({ data, orders, onOpen, onNavigate }) {
  const months = data?.monthly || [];
  const deliveryData = Object.entries(data?.delivery_counts || {}).map(([name, value]) => ({ name, value }));
  const stageData = stages.map((s) => ({ stage: s.replace("Client ", "").replace("Order ", ""), count: data?.stage_counts?.[s] || 0 }));

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <div className="small-label">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</div>
          <h1>Operations dashboard</h1>
          <p className="muted">Every order, every stage, every rupee — visible at a glance.</p>
        </div>
        <button className="primary-btn compact" data-testid="new-order-button" onClick={() => onNavigate("Orders")}>+ New order</button>
      </div>

      <div className="metrics-grid">
        <Metric label="Total orders" value={data?.total_orders || 0} caption="Across all workflows" />
        <Metric label="Awaiting approval" value={data?.awaiting_approval || 0} caption="Client action pending" tone="amber" />
        <Metric label="In production" value={data?.in_production || 0} caption="On the shop floor" tone="green" />
        <Metric label="Outstanding" value={compactMoney(data?.outstanding)} caption="Across open invoices" tone="red" />
      </div>

      <div className="metrics-grid">
        <Metric label="Ready for dispatch" value={data?.ready_dispatch || 0} caption="Production complete" />
        <Metric label="In transit" value={data?.awaiting_delivery || 0} caption="Awaiting delivery" tone="amber" />
        <Metric label="Pending invoices" value={data?.pending_invoices || 0} caption="Delivered · not invoiced" tone="amber" />
        <Metric label="Overdue" value={compactMoney(data?.overdue)} caption="Past due date" tone="red" />
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-title">
            <div><h3>Revenue trend</h3><p className="muted">Monthly orders and revenue</p></div>
          </div>
          <div style={{ width: "100%", height: 220 }} data-testid="revenue-chart">
            <ResponsiveContainer>
              <LineChart data={months}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(v) => compactMoney(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <div><h3>Delivery status</h3><p className="muted">Where every order stands</p></div>
          </div>
          <div style={{ width: "100%", height: 220 }} data-testid="delivery-status-chart">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={deliveryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {deliveryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {deliveryData.map((d, i) => (
              <span key={d.name}><i style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />{d.name} · {d.value}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div><h3>Orders by stage</h3><p className="muted">Workflow pulse across the lifecycle</p></div>
        </div>
        <div style={{ width: "100%", height: 240 }} data-testid="orders-by-stage-chart">
          <ResponsiveContainer>
            <BarChart data={stageData}>
              <CartesianGrid stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="stage" stroke="#94a3b8" fontSize={10} />
              <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel recent-panel">
        <div className="panel-title">
          <div><h3>Recent orders</h3><p className="muted">Latest client work in motion</p></div>
          <button className="text-btn" data-testid="view-all-orders-button" onClick={() => onNavigate("Orders")}>View all <ChevronRight size={15} /></button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Product</th><th>Delivery</th><th>Value</th><th>Stage</th></tr></thead>
            <tbody>{orders.slice(0, 6).map((o) => <OrderRow key={o.order_id} o={o} onOpen={onOpen} />)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
