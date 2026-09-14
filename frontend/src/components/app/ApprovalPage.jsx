import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { API } from "../../lib/api";

export default function ApprovalPage({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [approver, setApprover] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch(`${API}/public/approval/${token}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).detail || "Invalid link"); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  const submit = async (status) => {
    if (!approver.trim()) { setError("Please enter your name so we can log the decision."); return; }
    setBusy(status); setError("");
    try {
      const r = await fetch(`${API}/public/approval/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, approver, comments }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "Could not submit");
      setDone(status);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(""); }
  };

  if (error && !data) return (
    <div className="public-page">
      <div className="public-card">
        <div className="brand-mark">PS</div>
        <h1>Link unavailable</h1>
        <p className="muted">{error}</p>
      </div>
    </div>
  );
  if (!data) return <div className="public-page"><div className="public-card"><p className="muted">Loading approval…</p></div></div>;

  if (done) return (
    <div className="public-page">
      <div className="public-card">
        <div className="brand-mark">PS</div>
        <div className={`public-status ${done === "Approved" ? "green" : "amber"}`}>
          {done === "Approved" ? <CheckCircle2 size={44} /> : done === "Rejected" ? <XCircle size={44} /> : <RotateCcw size={44} />}
        </div>
        <h1>{done === "Approved" ? "Thank you — production is unlocked" : "Feedback recorded"}</h1>
        <p className="muted">
          {done === "Approved" ? "The Pinaki team has been notified and production will start shortly." : "Our design team will get back to you with the next version."}
        </p>
      </div>
    </div>
  );

  const o = data.order;
  const d = data.design;
  return (
    <div className="public-page">
      <div className="public-card wide">
        <div className="brand-mark">PS</div>
        <div className="small-label">DESIGN APPROVAL · {o.order_id}</div>
        <h1>{o.product}</h1>
        <p className="muted">Design version <b>V{d.version}</b> by {d.designer} · {new Date(d.created_at).toLocaleDateString()}</p>
        <div className="facts">
          <div><small>Client</small><b>{o.client_name}</b></div>
          <div><small>Quantity</small><b>{(o.quantity || 0).toLocaleString()} units</b></div>
          <div><small>Order value</small><b>₹{(o.total_value || 0).toLocaleString()}</b></div>
          <div><small>Required delivery</small><b>{o.required_delivery_date}</b></div>
        </div>
        {d.comments && <div className="public-notes"><b>Designer note</b><p>{d.comments}</p></div>}
        {data.decided && <div className="waiting" data-testid="approval-already-decided">This design version has already been reviewed. Submitting again will log an additional decision.</div>}
        <div className="stack top-gap">
          <label>Your name<input value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Full name for our records" data-testid="public-approver-input" /></label>
          <label>Comments (optional)<textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} data-testid="public-comments-input" /></label>
          {error && <div className="error" data-testid="public-approval-error">{error}</div>}
          <div className="row-3">
            <button className="primary-btn" data-testid="public-approve-button" disabled={busy !== ""} onClick={() => submit("Approved")}><CheckCircle2 size={15} /> {busy === "Approved" ? "Sending…" : "Approve"}</button>
            <button className="outline-btn" data-testid="public-revision-button" disabled={busy !== ""} onClick={() => submit("Revision Required")}><RotateCcw size={15} /> Request revision</button>
            <button className="outline-btn danger" data-testid="public-reject-button" disabled={busy !== ""} onClick={() => submit("Rejected")}><XCircle size={15} /> Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
}
