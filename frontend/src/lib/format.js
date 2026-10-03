export function formatINR(value) {
  const n = Number(value) || 0;
  if (n >= 10000000) {
    const cr = n / 10000000;
    return `₹${(cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2))} Cr`;
  }
  if (n >= 100000) {
    const l = n / 100000;
    return `₹${(l % 1 === 0 ? l.toFixed(0) : l.toFixed(2))} L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatINRFull(value) {
  return `₹${(Number(value) || 0).toLocaleString("en-IN")}`;
}

export function initials(name) {
  if (!name) return "PC";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}
