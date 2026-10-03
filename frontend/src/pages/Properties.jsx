import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { Skeletons, EmptyState } from "@/components/EmptyState";
import { CATEGORIES, TRANSACTION_TYPES } from "@/lib/constants";
import { Building2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Properties() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(sp.get("search") || "");
  const [category, setCategory] = useState(sp.get("category") || "all");
  const [txn, setTxn] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category !== "all") params.category = category;
    if (txn !== "all") params.transaction_type = txn;
    api.get("/properties", { params }).then((r) => { setItems(r.data.items); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [search, category, txn]);

  useEffect(() => { load(); }, [load]);

  const clear = () => { setSearch(""); setCategory("all"); setTxn("all"); setSp({}); };
  const active = search || category !== "all" || txn !== "all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-head text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500">{total} {total === 1 ? "property" : "properties"}</p>
        </div>
        <Button onClick={() => nav("/properties/new")} data-testid="add-property-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B] gap-2">
          <Plus className="w-4 h-4" /> Add Property
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="property-search-input"
            placeholder="Search by location, type..." className="w-full pl-9 pr-3 h-11 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#0B192C]/20" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40 h-11 rounded-xl" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(CATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={txn} onValueChange={setTxn}>
          <SelectTrigger className="w-40 h-11 rounded-xl" data-testid="filter-txn"><SelectValue placeholder="Transaction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {active && <button onClick={clear} className="flex items-center gap-1 text-sm text-slate-500 h-11 px-3"><X className="w-4 h-4" /> Clear</button>}
      </div>

      {loading ? <Skeletons /> : items.length === 0 ? (
        <EmptyState icon={Building2} title="No properties added yet." subtitle={active ? "Try adjusting your filters." : "Create your first property listing."} actionLabel="Add Property" onAction={() => nav("/properties/new")} testId="empty-properties" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
