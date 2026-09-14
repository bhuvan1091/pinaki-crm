import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Upload, Download, FileText, Send } from "lucide-react";
import { api, uploadFile, downloadDocument } from "../../lib/api";
import { stages, money, compactMoney, badgeTone, testid } from "../../lib/format";
import SendEmailModal from "./SendEmailModal";

const TABS = ["Overview", "Design", "Approval", "Production", "Dispatch", "Delivery", "Invoice", "Payment", "Documents", "Emails", "Activity"];

function StatusBadge({ children }) {
  return <span className={`badge ${badgeTone(children)}`}>{children}</span>;
}

export default function OrderDetail({ orderId, onBack, onChange, user }) {
  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [emailModal, setEmailModal] = useState(null); // { template, docs }
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await api("get", `/orders/${orderId}`);
      setOrder(r.data);
    } catch (e) {
      toast.error("Could not load order");
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const call = async (name, method, path, data, ok) => {
    setBusy(name);
    setMessage("");
    try {
      await api(method, path, data);
      toast.success(ok || "Updated");
      await load();
      onChange && onChange();
    } catch (e) {
      const d = e.response?.data?.detail || "Action not allowed";
      setMessage(typeof d === "string" ? d : "Action not allowed");
      toast.error(typeof d === "string" ? d : "Action not allowed");
    } finally {
      setBusy("");
    }
  };

  if (!order) return <div className="content"><div className="loading-screen">Loading order…</div></div>;

  const current = stages.indexOf(order.current_stage);

  const handleUpload = async (file, category) => {
    if (!file) return;
    setBusy("upload");
    try {
      await uploadFile(order.order_id, file, category);
      toast.success("Document uploaded");
      await load();
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="content detail-content">
      <button className="back-btn" data-testid="order-detail-back-button" onClick={onBack}>← Back to orders</button>
      <div className="detail-head">
        <div>
          <div className="small-label">ORDER / {order.order_id}</div>
          <h1>{order.product}</h1>
          <p className="muted">{order.client_name} · {(order.quantity || 0).toLocaleString()} units · Due {order.required_delivery_date} · {compactMoney(order.total_value)}</p>
        </div>
        <div className="stack" style={{ alignItems: "flex-end", gap: 10 }}>
          <StatusBadge>{order.current_stage}</StatusBadge>
          <button className="outline-btn" data-testid="order-send-email-button" onClick={() => setEmailModal({ template: "generic", docs: [] })}><Send size={14} /> Email client</button>
        </div>
      </div>

      <section className="timeline" data-testid="order-lifecycle-timeline">
        {stages.map((s, i) => (
          <div key={s} className={`timeline-step ${i < current ? "done" : ""} ${i === current ? "current" : ""}`} data-testid={`timeline-step-${testid(s)}`}>
            <div className="step-circle">{i < current ? "✓" : i + 1}</div>
            <span>{s}</span>
          </div>
        ))}
      </section>

      {message && <div className="error" data-testid="workflow-error">{message}</div>}

      <div className="tabs" data-testid="order-tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "tab active" : "tab"} data-testid={`tab-${testid(t)}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="detail-grid">
          <section className="panel">
            <div className="panel-title"><div><h3>Order overview</h3><p className="muted">Data entered once, reused everywhere.</p></div><span className="secure-label">● CENTRAL RECORD</span></div>
            <div className="facts">
              <div><small>Client</small><b>{order.client_name}</b></div>
              <div><small>Order value</small><b>{money(order.total_value)}</b></div>
              <div><small>Order date</small><b>{order.order_date}</b></div>
              <div><small>Priority</small><b>{order.priority}</b></div>
              <div><small>GST</small><b>{money(order.gst)}</b></div>
              <div><small>PO number</small><b>{order.po_number || "—"}</b></div>
              <div><small>Approval</small><b><StatusBadge>{order.approval_status}</StatusBadge></b></div>
              <div><small>Production</small><b><StatusBadge>{order.production_status}</StatusBadge></b></div>
              <div><small>Dispatch</small><b><StatusBadge>{order.dispatch_status}</StatusBadge></b></div>
              <div><small>Delivery</small><b><StatusBadge>{order.delivery_status}</StatusBadge></b></div>
              <div><small>Invoice</small><b><StatusBadge>{order.invoice_status}</StatusBadge></b></div>
              <div><small>Outstanding</small><b>{money(order.outstanding_amount || 0)}</b></div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-title"><div><h3>Next action</h3><p className="muted">Advance this order when ready.</p></div></div>
            <NextAction order={order} user={user} call={call} busy={busy} />
          </section>
        </div>
      )}

      {tab === "Design" && (
        <DesignTab order={order} call={call} busy={busy} onUpload={handleUpload} fileInput={fileInput} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Approval" && (
        <ApprovalTab order={order} call={call} busy={busy} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Production" && (
        <ProductionTab order={order} call={call} busy={busy} user={user} />
      )}

      {tab === "Dispatch" && (
        <DispatchTab order={order} call={call} busy={busy} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Delivery" && (
        <DeliveryTab order={order} call={call} busy={busy} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Invoice" && (
        <InvoiceTab order={order} call={call} busy={busy} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Payment" && (
        <PaymentTab order={order} call={call} busy={busy} user={user} openEmail={setEmailModal} />
      )}

      {tab === "Documents" && (
        <DocumentsTab order={order} onUpload={handleUpload} busy={busy} openEmail={setEmailModal} />
      )}

      {tab === "Emails" && (
        <EmailsTab order={order} />
      )}

      {tab === "Activity" && (
        <section className="panel">
          <div className="panel-title"><div><h3>Activity & history</h3><p className="muted">A complete audit trail for this order.</p></div></div>
          {(order.history || []).map((h, i) => (
            <div className="history-row" key={i} data-testid={`history-row-${i}`}>
              <div className="history-icon">↗</div>
              <div><b>{h.event}</b><p>{h.by} · {new Date(h.at).toLocaleString()}{h.remarks ? ` — ${h.remarks}` : ""}</p></div>
            </div>
          ))}
        </section>
      )}

      {emailModal && (
        <SendEmailModal
          order={order}
          defaultTemplate={emailModal.template}
          defaultDocuments={emailModal.docs}
          onClose={(sent) => { setEmailModal(null); if (sent) load(); }}
        />
      )}
    </div>
  );
}

function NextAction({ order, user, call, busy }) {
  if (order.current_stage === "Order Received") {
    return <button className="primary-btn wide" data-testid="action-share-design" disabled={busy === "design"} onClick={() => call("design", "post", `/orders/${order.order_id}/designs`, { comments: "Initial design shared" }, "Design shared")}>Share design version <ChevronRight size={16} /></button>;
  }
  if (order.current_stage === "Design" || (order.current_stage === "Client Approval" && order.approval_status === "Pending Approval")) {
    return <div className="stack">
      <button className="primary-btn wide" data-testid="action-approve" disabled={busy === "approve"} onClick={() => call("approve", "post", `/orders/${order.order_id}/approvals`, { status: "Approved", approver: user.name }, "Approval recorded")}>Record client approval</button>
      <button className="outline-btn wide" data-testid="action-revision" disabled={busy === "revision"} onClick={() => call("revision", "post", `/orders/${order.order_id}/approvals`, { status: "Revision Required", approver: user.name }, "Revision requested")}>Request revision</button>
    </div>;
  }
  if (order.current_stage === "Production" && order.production_status !== "Completed") {
    return <div className="stack">
      {order.production_status === "Not Started" && <button className="primary-btn wide" data-testid="action-start-production" disabled={busy === "prod-start"} onClick={() => call("prod-start", "patch", `/orders/${order.order_id}/production`, { status: "In Progress" }, "Production started")}>Start production</button>}
      <button className="primary-btn wide" data-testid="action-complete-production" disabled={busy === "prod-done"} onClick={() => call("prod-done", "patch", `/orders/${order.order_id}/production`, { status: "Completed" }, "Production completed")}>Mark production completed</button>
    </div>;
  }
  if (order.current_stage === "Dispatch" || (order.production_status === "Completed" && order.dispatch_status !== "Dispatched")) {
    return <button className="primary-btn wide" data-testid="action-dispatch" disabled={busy === "dispatch"} onClick={() => call("dispatch", "post", `/orders/${order.order_id}/dispatches`, { dispatch_date: new Date().toISOString().slice(0, 10), quantity: order.quantity, transporter: "Bluedart Surface", tracking_number: `TR-${Math.floor(Math.random() * 90000 + 10000)}`, delivery_address: "" }, "Dispatched and challan created")}>Release to dispatch & auto-challan</button>;
  }
  if (order.dispatch_status === "Dispatched" && order.delivery_status !== "Delivered") {
    return <button className="primary-btn wide" data-testid="action-mark-delivered" disabled={busy === "deliver"} onClick={() => call("deliver", "post", `/orders/${order.order_id}/deliveries`, { actual_date: new Date().toISOString().slice(0, 10), received_by: order.client_name, status: "Delivered" }, "Delivery confirmed")}>Confirm delivery</button>;
  }
  if (order.delivery_status === "Delivered" && !order.invoice_number) {
    return <button className="primary-btn wide" data-testid="action-generate-invoice" disabled={busy === "invoice"} onClick={() => call("invoice", "post", `/orders/${order.order_id}/invoices`, { invoice_date: new Date().toISOString().slice(0, 10), payment_terms: "Net 30", due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }, "Invoice generated")}>Generate invoice</button>;
  }
  return <div className="waiting"><span className="dot amber" /> Waiting on {stages[Math.min(stages.indexOf(order.current_stage) + 1, stages.length - 1)]}</div>;
}

function DesignTab({ order, call, busy, onUpload, user, openEmail }) {
  const [comments, setComments] = useState("");
  const canAct = ["admin", "sales", "design"].includes(user.role);
  const latestDesign = (order.designs || [])[0];
  const designDocs = (order.documents || []).filter((d) => d.category === "Design File").map((d) => d.document_id);
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Design versions</h3><p className="muted">Every version stays attached to the order.</p></div>
        {latestDesign && <button className="outline-btn" data-testid="design-send-email-button" onClick={() => openEmail({ template: "design_share", docs: designDocs })}><Send size={14} /> Share with client</button>}
      </div>
      <div className="version-list">
        {(order.designs || []).length === 0 && <div className="empty-inline">No design versions yet.</div>}
        {(order.designs || []).map((d) => (
          <div className="version-row" key={d.design_id} data-testid={`design-version-${d.version}`}>
            <div className="version-badge">V{d.version}</div>
            <div>
              <b>{d.file_name || `Design version ${d.version}`}</b>
              <small>{d.designer} · {new Date(d.created_at).toLocaleString()}</small>
              {d.comments && <p className="muted">{d.comments}</p>}
            </div>
            <StatusBadge>{d.status}</StatusBadge>
          </div>
        ))}
      </div>
      {canAct && (
        <div className="stack top-gap">
          <label>Comments for this version<textarea value={comments} onChange={(e) => setComments(e.target.value)} data-testid="design-comments" /></label>
          <button className="primary-btn" data-testid="design-share-button" disabled={busy === "design"} onClick={() => call("design", "post", `/orders/${order.order_id}/designs`, { comments, designer: user.name }, "Design shared with client")}>Share new design version</button>
        </div>
      )}
    </section>
  );
}

function ApprovalTab({ order, call, busy, user, openEmail }) {
  const canAct = ["admin", "sales", "design"].includes(user.role);
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Client approval</h3><p className="muted">Approvals unlock production. Rejections return the order to design.</p></div>
        <button className="outline-btn" data-testid="approval-send-email-button" onClick={() => openEmail({ template: "approval_request", docs: [] })}><Send size={14} /> Request approval</button>
      </div>
      <div className="version-list">
        {(order.approvals || []).length === 0 && <div className="empty-inline">No approvals recorded yet.</div>}
        {(order.approvals || []).map((a) => (
          <div className="version-row" key={a.approval_id}>
            <StatusBadge>{a.status}</StatusBadge>
            <div><b>{a.approver}</b><small>{new Date(a.created_at).toLocaleString()}</small>{a.comments && <p className="muted">{a.comments}</p>}</div>
          </div>
        ))}
      </div>
      {canAct && (
        <div className="stack top-gap">
          <div className="row-3">
            <button className="primary-btn" data-testid="approval-approved-button" disabled={busy === "ap-a"} onClick={() => call("ap-a", "post", `/orders/${order.order_id}/approvals`, { status: "Approved", approver: user.name })}>Mark approved</button>
            <button className="outline-btn" data-testid="approval-revision-button" disabled={busy === "ap-r"} onClick={() => call("ap-r", "post", `/orders/${order.order_id}/approvals`, { status: "Revision Required", approver: user.name })}>Revision required</button>
            <button className="outline-btn danger" data-testid="approval-rejected-button" disabled={busy === "ap-x"} onClick={() => call("ap-x", "post", `/orders/${order.order_id}/approvals`, { status: "Rejected", approver: user.name })}>Reject</button>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductionTab({ order, call, busy, user }) {
  const canAct = ["admin", "production"].includes(user.role);
  const [status, setStatus] = useState("In Progress");
  const [assigned, setAssigned] = useState("");
  const [remarks, setRemarks] = useState("");
  return (
    <section className="panel">
      <div className="panel-title"><div><h3>Production</h3><p className="muted">Approval is required to start production.</p></div><StatusBadge>{order.production_status}</StatusBadge></div>
      <div className="facts">
        <div><small>Assigned to</small><b>{order.assigned_producer || "—"}</b></div>
        <div><small>Started</small><b>{order.production_start_date || "—"}</b></div>
        <div><small>Expected</small><b>{order.production_expected || order.required_delivery_date}</b></div>
        <div><small>Actual completion</small><b>{order.production_actual || "—"}</b></div>
      </div>
      {canAct && order.approval_status === "Approved" && (
        <div className="stack top-gap">
          <div className="row-3">
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="production-status-select"><option>In Progress</option><option>Completed</option><option>On Hold</option><option>Cancelled</option></select></label>
            <label>Assign to<input value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Team member" data-testid="production-assign-input" /></label>
            <label>Remarks<input value={remarks} onChange={(e) => setRemarks(e.target.value)} data-testid="production-remarks-input" /></label>
          </div>
          <button className="primary-btn" data-testid="production-update-button" disabled={busy === "prod"} onClick={() => call("prod", "patch", `/orders/${order.order_id}/production`, { status, assigned_to: assigned, remarks, start_date: new Date().toISOString().slice(0, 10) }, "Production updated")}>Update production</button>
        </div>
      )}
      {order.approval_status !== "Approved" && <div className="waiting"><span className="dot amber" /> Client approval required before production can begin.</div>}
    </section>
  );
}

function DispatchTab({ order, call, busy, user, openEmail }) {
  const canAct = ["admin", "dispatch"].includes(user.role);
  const [form, setForm] = useState({ dispatch_date: new Date().toISOString().slice(0, 10), quantity: order.quantity, transporter: "Bluedart Surface", tracking_number: "", delivery_address: "", remarks: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const challanDocs = (order.documents || []).filter((d) => d.category === "Challan").map((d) => d.document_id);
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Dispatch & challan</h3><p className="muted">Production must be completed before dispatch.</p></div>
        <div className="stack" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatusBadge>{order.dispatch_status}</StatusBadge>
          {order.challan_number && <button className="outline-btn" data-testid="dispatch-send-email-button" onClick={() => openEmail({ template: "challan", docs: challanDocs })}><Send size={14} /> Email challan</button>}
        </div>
      </div>
      <div className="facts">
        <div><small>Challan #</small><b className="mono">{order.challan_number || "—"}</b></div>
        <div><small>Tracking</small><b>{order.tracking_number || "—"}</b></div>
        <div><small>Dispatch date</small><b>{order.dispatch_date || "—"}</b></div>
      </div>
      {(order.dispatches || []).map((d) => (
        <div key={d.dispatch_id} className="version-row" data-testid={`dispatch-row-${d.dispatch_id}`}>
          <StatusBadge>{d.status}</StatusBadge>
          <div><b>{d.transporter}</b><small>{d.dispatch_date} · {d.tracking_number || "no tracking"}</small></div>
        </div>
      ))}
      {(order.challans || []).map((ch) => (
        <div key={ch.challan_id} className="version-row" data-testid={`challan-row-${ch.challan_id}`}>
          <div className="version-badge">{ch.challan_number}</div>
          <div><b>{ch.quantity?.toLocaleString()} units</b><small>Challan · {ch.challan_date} · {ch.transporter || "—"}</small></div>
          {ch.pdf_document_id && <a className="text-btn" href={downloadDocument(ch.pdf_document_id)} target="_blank" rel="noreferrer" data-testid={`challan-pdf-${ch.challan_id}`}><Download size={14} /> PDF</a>}
        </div>
      ))}
      {canAct && order.production_status === "Completed" && order.dispatch_status !== "Dispatched" && (
        <div className="stack top-gap">
          <div className="form-grid">
            <label>Dispatch date<input type="date" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} data-testid="dispatch-date-input" /></label>
            <label>Quantity<input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} data-testid="dispatch-qty-input" /></label>
            <label>Transporter<input value={form.transporter} onChange={(e) => set("transporter", e.target.value)} data-testid="dispatch-transporter-input" /></label>
            <label>Tracking / LR #<input value={form.tracking_number} onChange={(e) => set("tracking_number", e.target.value)} data-testid="dispatch-tracking-input" /></label>
          </div>
          <button className="primary-btn" data-testid="dispatch-submit-button" disabled={busy === "disp"} onClick={() => call("disp", "post", `/orders/${order.order_id}/dispatches`, { ...form, quantity: Number(form.quantity) }, "Order dispatched, challan created")}>Dispatch & auto-create challan</button>
        </div>
      )}
      {order.production_status !== "Completed" && <div className="waiting"><span className="dot amber" /> Production must be completed to dispatch.</div>}
    </section>
  );
}

function DeliveryTab({ order, call, busy, user, openEmail }) {
  const canAct = ["admin", "dispatch", "accounts"].includes(user.role);
  const [form, setForm] = useState({ actual_date: new Date().toISOString().slice(0, 10), received_by: order.client_name, status: "Delivered", remarks: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const podDocs = (order.documents || []).filter((d) => d.category === "Proof of Delivery").map((d) => d.document_id);
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Delivery</h3><p className="muted">Confirm receipt to release the order to Accounts.</p></div>
        <div className="stack" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatusBadge>{order.delivery_status}</StatusBadge>
          {order.delivery_status === "Delivered" && <button className="outline-btn" data-testid="delivery-send-email-button" onClick={() => openEmail({ template: "delivery_pod", docs: podDocs })}><Send size={14} /> Email POD</button>}
        </div>
      </div>
      {(order.deliveries || []).map((d) => (
        <div key={d.delivery_id} className="version-row" data-testid={`delivery-row-${d.delivery_id}`}>
          <StatusBadge>{d.status}</StatusBadge>
          <div><b>Received by {d.received_by}</b><small>{d.actual_date}</small>{d.remarks && <p className="muted">{d.remarks}</p>}</div>
        </div>
      ))}
      {canAct && order.dispatch_status === "Dispatched" && order.delivery_status !== "Delivered" && (
        <div className="stack top-gap">
          <div className="form-grid">
            <label>Actual delivery<input type="date" value={form.actual_date} onChange={(e) => set("actual_date", e.target.value)} data-testid="delivery-date-input" /></label>
            <label>Received by<input value={form.received_by} onChange={(e) => set("received_by", e.target.value)} data-testid="delivery-recipient-input" /></label>
            <label>Status<select value={form.status} onChange={(e) => set("status", e.target.value)} data-testid="delivery-status-select"><option>Delivered</option><option>In Transit</option><option>Failed</option></select></label>
            <label>Remarks<input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} data-testid="delivery-remarks-input" /></label>
          </div>
          <button className="primary-btn" data-testid="delivery-submit-button" disabled={busy === "deliver"} onClick={() => call("deliver", "post", `/orders/${order.order_id}/deliveries`, form, "Delivery confirmed")}>Confirm delivery</button>
        </div>
      )}
    </section>
  );
}

function InvoiceTab({ order, call, busy, user, openEmail }) {
  const canAct = ["admin", "accounts"].includes(user.role);
  const [form, setForm] = useState({ invoice_date: new Date().toISOString().slice(0, 10), payment_terms: "Net 30", due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const invoiceDocs = (order.documents || []).filter((d) => d.category === "Invoice").map((d) => d.document_id);
  const invoiceExists = (order.invoices || []).length > 0;
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Invoice</h3><p className="muted">Invoices unlock only after delivery is confirmed.</p></div>
        <div className="stack" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <StatusBadge>{order.invoice_status}</StatusBadge>
          {invoiceExists && <button className="outline-btn" data-testid="invoice-send-email-button" onClick={() => openEmail({ template: "invoice", docs: invoiceDocs })}><Send size={14} /> Email invoice</button>}
        </div>
      </div>
      {(order.invoices || []).map((i) => (
        <div key={i.invoice_id} className="version-row" data-testid={`invoice-row-${i.invoice_id}`}>
          <div className="version-badge">{i.invoice_number}</div>
          <div><b>{money(i.total)}</b><small>Due {i.due_date} · {i.payment_terms}</small></div>
          <StatusBadge>{i.status}</StatusBadge>
          {i.pdf_document_id && <a className="text-btn" href={downloadDocument(i.pdf_document_id)} target="_blank" rel="noreferrer" data-testid={`invoice-pdf-${i.invoice_id}`}><Download size={14} /> PDF</a>}
        </div>
      ))}
      {canAct && order.delivery_status === "Delivered" && (order.invoices || []).length === 0 && (
        <div className="stack top-gap">
          <div className="form-grid">
            <label>Invoice date<input type="date" value={form.invoice_date} onChange={(e) => set("invoice_date", e.target.value)} data-testid="invoice-date-input" /></label>
            <label>Due date<input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} data-testid="invoice-due-input" /></label>
            <label>Payment terms<input value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} data-testid="invoice-terms-input" /></label>
          </div>
          <button className="primary-btn" data-testid="invoice-submit-button" disabled={busy === "inv"} onClick={() => call("inv", "post", `/orders/${order.order_id}/invoices`, form, "Invoice generated")}>Generate invoice</button>
        </div>
      )}
    </section>
  );
}

function PaymentTab({ order, call, busy, user, openEmail }) {
  const canAct = ["admin", "accounts"].includes(user.role);
  const invoice = (order.invoices || [])[0];
  const [form, setForm] = useState({ amount: order.total_value, date: new Date().toISOString().slice(0, 10), mode: "Bank Transfer", reference: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Payments</h3><p className="muted">Track receipts against every generated invoice.</p></div>
        {invoice && order.invoice_status !== "Paid" && <button className="outline-btn" data-testid="payment-send-email-button" onClick={() => openEmail({ template: "payment_reminder", docs: [] })}><Send size={14} /> Send reminder</button>}
      </div>
      {(order.payments || []).length === 0 && <div className="empty-inline">No payments recorded.</div>}
      {(order.payments || []).map((p) => (
        <div key={p.payment_id} className="version-row" data-testid={`payment-row-${p.payment_id}`}>
          <StatusBadge>{p.mode}</StatusBadge>
          <div><b>{money(p.amount)}</b><small>{p.date} · {p.reference || "no ref"}</small></div>
        </div>
      ))}
      {canAct && invoice && (
        <div className="stack top-gap">
          <div className="form-grid">
            <label>Amount<input type="number" min="1" value={form.amount} onChange={(e) => set("amount", e.target.value)} data-testid="payment-amount-input" /></label>
            <label>Date<input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} data-testid="payment-date-input" /></label>
            <label>Mode<select value={form.mode} onChange={(e) => set("mode", e.target.value)} data-testid="payment-mode-select"><option>Bank Transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></label>
            <label>Reference<input value={form.reference} onChange={(e) => set("reference", e.target.value)} data-testid="payment-reference-input" /></label>
          </div>
          <button className="primary-btn" data-testid="payment-submit-button" disabled={busy === "pay"} onClick={() => call("pay", "post", `/payments`, { ...form, invoice_id: invoice.invoice_id, amount: Number(form.amount) }, "Payment recorded")}>Record payment</button>
        </div>
      )}
    </section>
  );
}

function DocumentsTab({ order, onUpload, busy, openEmail }) {
  const [category, setCategory] = useState("Client PO");
  return (
    <section className="panel">
      <div className="panel-title">
        <div><h3>Documents</h3><p className="muted">Every attachment stays linked to this order.</p></div>
        {(order.documents || []).length > 0 && <button className="outline-btn" data-testid="documents-send-email-button" onClick={() => openEmail({ template: "generic", docs: (order.documents || []).map((d) => d.document_id) })}><Send size={14} /> Email selected</button>}
      </div>
      <div className="upload-row">
        <select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="document-category-select">
          <option>Client PO</option>
          <option>Design File</option>
          <option>Approval Proof</option>
          <option>Challan</option>
          <option>Proof of Delivery</option>
          <option>Invoice</option>
          <option>Other</option>
        </select>
        <label className="upload-btn" data-testid="document-upload-label">
          <Upload size={16} /> {busy === "upload" ? "Uploading…" : "Upload document"}
          <input type="file" hidden data-testid="document-upload-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, category); e.target.value = ""; }} />
        </label>
      </div>
      <div className="doc-list">
        {(order.documents || []).length === 0 && <div className="empty-inline">No documents attached yet.</div>}
        {(order.documents || []).map((d) => (
          <div key={d.document_id} className="doc-row" data-testid={`document-row-${d.document_id}`}>
            <FileText size={17} />
            <div>
              <b>{d.name}</b>
              <small>{d.category} · {d.uploaded_by} · {new Date(d.created_at).toLocaleDateString()}</small>
            </div>
            <a className="text-btn" href={downloadDocument(d.document_id)} target="_blank" rel="noreferrer" data-testid={`document-download-${d.document_id}`}><Download size={14} /> Download</a>
          </div>
        ))}
      </div>
    </section>
  );
}


function EmailsTab({ order }) {
  const [emails, setEmails] = useState([]);
  useEffect(() => {
    api("get", `/orders/${order.order_id}/emails`).then((r) => setEmails(r.data)).catch(() => {});
  }, [order.order_id]);
  return (
    <section className="panel">
      <div className="panel-title"><div><h3>Client emails</h3><p className="muted">Every email sent from this order.</p></div></div>
      {emails.length === 0 && <div className="empty-inline">No emails have been sent from this order yet.</div>}
      <div className="version-list">
        {emails.map((e) => (
          <div className="version-row" key={e.email_id} data-testid={`email-row-${e.email_id}`}>
            <div className="version-badge">✉</div>
            <div>
              <b>{e.subject}</b>
              <small>To {e.recipient}{e.cc?.length ? ` · CC ${e.cc.join(", ")}` : ""} · sent by {e.sent_by}</small>
              <small>{new Date(e.created_at).toLocaleString()} · {(e.document_ids || []).length} attachment(s)</small>
            </div>
            <span className="badge blue">{e.template.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
