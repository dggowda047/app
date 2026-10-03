import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatINR } from "@/lib/format";
import { CUSTOMER_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Phone, Building2, X } from "lucide-react";

const TYPE_COLORS = { Buyer: "bg-blue-50 text-blue-700", Seller: "bg-emerald-50 text-emerald-700", Renter: "bg-amber-50 text-amber-700", Leaser: "bg-violet-50 text-violet-700" };

export default function Customers() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (type !== "all") params.customer_type = type;
    api.get("/customers", { params }).then((r) => { setItems(r.data.items); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [search, type]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="font-head text-2xl font-bold text-slate-900">Customers</h1><p className="text-sm text-slate-500">{total} {total === 1 ? "customer" : "customers"}</p></div>
        <Button onClick={() => nav("/customers/new")} data-testid="add-customer-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B] gap-2"><Plus className="w-4 h-4" /> Add Customer</Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="customer-search-input" placeholder="Search name or phone..." className="w-full pl-9 pr-3 h-11 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B192C]/20" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40 h-11 rounded-xl" data-testid="filter-customer-type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />)}</div> : items.length === 0 ? (
        <EmptyState icon={Users} title="No customers added yet." subtitle="Add your first customer to track requirements." actionLabel="Add Customer" onAction={() => nav("/customers/new")} testId="empty-customers" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <button key={c.id} onClick={() => nav(`/customers/${c.id}`)} data-testid={`customer-card-${c.id}`} className="text-left rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-semibold">{c.name[0]?.toUpperCase()}</div>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${TYPE_COLORS[c.customer_type] || "bg-slate-100"}`}>{c.customer_type}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mt-3">{c.name}</h3>
              <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5"><Phone className="w-3.5 h-3.5" /> {c.phone}</div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {c.property_count} linked</span>
                {c.budget_max > 0 && <span>{formatINR(c.budget_min)} - {formatINR(c.budget_max)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
