import { useEffect, useState, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { api } from "./lib/api";
import Login from "./components/app/Login";
import Shell from "./components/app/Shell";
import Dashboard from "./components/app/Dashboard";
import Orders from "./components/app/Orders";
import OrderDetail from "./components/app/OrderDetail";
import Clients from "./components/app/Clients";
import Contacts from "./components/app/Contacts";
import StageQueue from "./components/app/StageQueue";
import Invoices from "./components/app/Invoices";
import Payments from "./components/app/Payments";
import Reports from "./components/app/Reports";
import UsersRoles from "./components/app/UsersRoles";
import Settings from "./components/app/Settings";
import ApprovalPage from "./components/app/ApprovalPage";
import "@/App.css";

export default function App() {
  const publicMatch = window.location.pathname.match(/^\/approve\/(.+)$/);
  if (publicMatch) return (<><ApprovalPage token={publicMatch[1]} /><Toaster richColors position="top-right" /></>);
  return <AppInner />;
}

function AppInner() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("Dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);

  const loadCore = useCallback(async () => {
    try {
      const [d, o, c] = await Promise.all([
        api("get", "/dashboard"),
        api("get", "/orders"),
        api("get", "/clients"),
      ]);
      setDashboard(d.data);
      setOrders(o.data);
      setClients(c.data);
    } catch (e) {
      if (e.response?.status === 401) setUser(false);
    }
  }, []);

  useEffect(() => {
    api("get", "/auth/me")
      .then((r) => { setUser(r.data); loadCore(); })
      .catch(() => setUser(false))
      .finally(() => setChecking(false));
  }, [loadCore]);

  const openOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setPage("OrderDetail");
  };

  const goto = (nextPage) => {
    setSelectedOrderId(null);
    setPage(nextPage);
    loadCore();
  };

  const logout = async () => {
    await api("post", "/auth/logout").catch(() => {});
    setUser(false);
  };

  if (checking) return <div className="loading-screen">Loading workspace…</div>;
  if (!user) return (<><Login onLogin={(u) => { setUser(u); loadCore(); toast.success(`Welcome, ${u.name}`); }} /><Toaster richColors position="top-right" /></>);

  const shellProps = { user, page, setPage: goto, onLogout: logout };

  let content = null;
  if (page === "OrderDetail" && selectedOrderId) {
    content = <OrderDetail orderId={selectedOrderId} onBack={() => goto("Orders")} onChange={loadCore} user={user} />;
  } else if (page === "Dashboard") {
    content = <Dashboard data={dashboard} orders={orders} onOpen={openOrder} onNavigate={goto} />;
  } else if (page === "Orders") {
    content = <Orders orders={orders} clients={clients} onOpen={openOrder} onCreated={loadCore} user={user} />;
  } else if (page === "Clients") {
    content = <Clients clients={clients} onOpen={openOrder} onChange={loadCore} user={user} />;
  } else if (page === "Contacts") {
    content = <Contacts clients={clients} user={user} />;
  } else if (page === "Design") {
    content = <StageQueue title="Design" subtitle="Prepare artwork and share the latest version with the client." stages={["Order Received", "Design"]} orders={orders} onOpen={openOrder} action="design" />;
  } else if (page === "Approvals") {
    content = <StageQueue title="Client approvals" subtitle="Track approval status. Production unlocks only when a version is approved." stages={["Client Approval"]} orders={orders} onOpen={openOrder} action="approval" />;
  } else if (page === "Production") {
    content = <StageQueue title="Production" subtitle="Approved orders on the shop floor." stages={["Production"]} orders={orders} onOpen={openOrder} action="production" />;
  } else if (page === "Dispatch") {
    content = <StageQueue title="Dispatch" subtitle="Production-completed orders ready to ship." stages={["Dispatch"]} orders={orders.filter((o) => o.production_status === "Completed" && o.dispatch_status !== "Dispatched")} onOpen={openOrder} action="dispatch" />;
  } else if (page === "Challans") {
    content = <StageQueue title="Delivery challans" subtitle="Every challan links to its dispatched order." orders={orders.filter((o) => o.challan_number)} onOpen={openOrder} action="challan" />;
  } else if (page === "Delivery") {
    content = <StageQueue title="Delivery" subtitle="Confirm delivery and attach proof to close the loop with accounts." orders={orders.filter((o) => o.dispatch_status === "Dispatched")} onOpen={openOrder} action="delivery" />;
  } else if (page === "Accounts") {
    content = <StageQueue title="Accounts" subtitle="Delivered orders ready for invoicing — no re-entry." orders={orders.filter((o) => o.delivery_status === "Delivered")} onOpen={openOrder} action="invoice" />;
  } else if (page === "Invoices") {
    content = <Invoices onOpen={openOrder} />;
  } else if (page === "Payments") {
    content = <Payments onOpen={openOrder} />;
  } else if (page === "Reports") {
    content = <Reports />;
  } else if (page === "Users & Roles") {
    content = <UsersRoles />;
  } else if (page === "Settings") {
    content = <Settings user={user} />;
  }

  return (
    <>
      <Shell {...shellProps}>{content}</Shell>
      <Toaster richColors position="top-right" />
    </>
  );
}
