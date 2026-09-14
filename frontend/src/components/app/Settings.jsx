export default function Settings({ user }) {
  return (
    <div className="content">
      <div className="page-heading">
        <div><div className="small-label">WORKSPACE</div><h1>Settings</h1><p className="muted">Signed in as <b>{user.name}</b> · {user.role}</p></div>
      </div>
      <section className="panel">
        <div className="panel-title"><div><h3>Workspace</h3><p className="muted">Pinaki Solutions demo workspace.</p></div></div>
        <div className="facts">
          <div><small>Company</small><b>Pinaki Solutions Pvt. Ltd.</b></div>
          <div><small>Time zone</small><b>Asia/Kolkata (IST)</b></div>
          <div><small>Currency</small><b>INR (₹)</b></div>
          <div><small>Fiscal year</small><b>Apr — Mar</b></div>
          <div><small>Default GST</small><b>18%</b></div>
          <div><small>Default payment terms</small><b>Net 30</b></div>
        </div>
      </section>
    </div>
  );
}
