import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const ROLE_ACCESS = {
  admin: "Full access to every module.",
  sales: "Clients, contacts, orders, communication.",
  design: "Assigned orders, design versions, approval status.",
  production: "Approved orders and the production floor.",
  dispatch: "Completed production orders, dispatch, challan, delivery.",
  accounts: "Delivered orders, invoices, payments.",
  management: "Read access across all data, dashboards & reports.",
};

export default function UsersRoles() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("get", "/users").then((r) => setUsers(r.data)).catch((e) => setError(e.response?.data?.detail || "Restricted to admin"));
  }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">ACCESS</div><h1>Users & roles</h1><p className="muted">Each department only sees the workflow they own.</p></div>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        <div className="panel-title"><div><h3>Team members <span className="count">{users.length}</span></h3></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                  <td><b>{u.name}</b><small className="mono">{u.user_id}</small></td>
                  <td>{u.email}</td>
                  <td><span className="badge blue">{u.role}</span></td>
                  <td className="muted">{ROLE_ACCESS[u.role] || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !error && <div className="empty-inline">Loading team…</div>}
        </div>
      </section>
    </div>
  );
}
