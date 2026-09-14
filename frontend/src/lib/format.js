export const stages = ["Order Received", "Design", "Client Approval", "Production", "Dispatch", "Challan", "Delivery", "Accounts", "Invoice", "Payment"];

export const money = (n) =>
  (n || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const compactMoney = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

export const badgeTone = (stage) => {
  if (["Production", "Delivered", "Paid"].includes(stage)) return "green";
  if (["Client Approval", "In Transit", "Due", "Partially Paid"].includes(stage)) return "amber";
  if (["Rejected", "Failed", "Overdue"].includes(stage)) return "red";
  return "blue";
};

export const testid = (s) => String(s).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
