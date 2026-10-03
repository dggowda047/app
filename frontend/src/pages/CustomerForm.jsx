import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { CATEGORIES, TRANSACTION_TYPES, CUSTOMER_TYPES } from "@/lib/constants";
import { CurrencyRange } from "@/components/CurrencyRange";
import { PropImage } from "@/components/PropImage";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, X, Search, Check } from "lucide-react";

const LOCATIONS = ["Whitefield", "Sarjapur Road", "Hebbal", "Yelahanka", "HSR Layout", "Electronic City", "Devanahalli", "Indiranagar", "Koramangala", "Kanakapura Road"];

export default function CustomerForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allProps, setAllProps] = useState([]);
  const [propSearch, setPropSearch] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", customer_type: "Buyer", req_category: "", req_subcategory: "",
    req_location: "", req_transaction_types: [], budget_min: 0, budget_max: 10000000, notes: "", property_ids: [],
  });

  useEffect(() => {
    api.get("/properties", { params: { limit: 100 } }).then((r) => setAllProps(r.data.items));
    if (editing) {
      api.get(`/customers/${id}`).then((r) => {
        const c = r.data;
        setForm({ name: c.name, phone: c.phone, customer_type: c.customer_type, req_category: c.req_category || "", req_subcategory: c.req_subcategory || "",
          req_location: c.req_location || "", req_transaction_types: c.req_transaction_types || [], budget_min: c.budget_min || 0, budget_max: c.budget_max || 10000000,
          notes: c.notes || "", property_ids: (c.properties || []).map((p) => p.id) });
      }).catch((e) => toast.error(apiError(e)));
    }
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    setSaving(true);
    try {
      if (editing) { await api.put(`/customers/${id}`, form); toast.success("Customer updated"); nav(`/customers/${id}`); }
      else { const r = await api.post("/customers", form); toast.success("Customer created"); nav(`/customers/${r.data.id}`); }
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const linked = allProps.filter((p) => form.property_ids.includes(p.id));
  const filtered = allProps.filter((p) => !propSearch || (p.title + p.location + p.subcategory).toLowerCase().includes(propSearch.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="font-head text-2xl font-bold text-slate-900">{editing ? "Edit Customer" : "Add Customer"}</h1>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-sm font-medium text-slate-700">Name</label><Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="customer-name-input" className="mt-1.5 h-11 rounded-xl" /></div>
          <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))} data-testid="customer-phone-input" className="mt-1.5 h-11 rounded-xl" /></div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Customer Type</label>
          <div className="grid grid-cols-4 gap-2 mt-1.5">
            {CUSTOMER_TYPES.map((t) => (
              <button key={t} onClick={() => set("customer_type", t)} data-testid={`customer-type-${t.toLowerCase()}`} className={`p-2.5 rounded-xl border-2 text-sm transition-all ${form.customer_type === t ? "border-[#0B192C] bg-slate-50 font-medium" : "border-slate-200"}`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Requirement */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-sm font-semibold text-slate-700">Requirement</label>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Select value={form.req_category} onValueChange={(v) => { set("req_category", v); set("req_subcategory", ""); }}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="req-category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{Object.keys(CATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.req_subcategory} onValueChange={(v) => set("req_subcategory", v)} disabled={!form.req_category}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="req-subcategory"><SelectValue placeholder="Subcategory" /></SelectTrigger>
              <SelectContent>{(CATEGORIES[form.req_category] || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.req_location} onValueChange={(v) => set("req_location", v)}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="req-location"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {TRANSACTION_TYPES.map((t) => (
              <button key={t} onClick={() => toggle("req_transaction_types", t)} className={`px-3 py-1.5 rounded-lg border-2 text-xs transition-all ${form.req_transaction_types.includes(t) ? "border-[#0B192C] bg-slate-50 font-medium" : "border-slate-200"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <CurrencyRange min={form.budget_min} max={form.budget_max} onChange={(a, b) => setForm((f) => ({ ...f, budget_min: a, budget_max: b }))} label="Budget" />
        </div>

        {/* Linked properties */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">Linked Properties ({linked.length})</label>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)} data-testid="link-property-btn" className="rounded-xl gap-1"><Plus className="w-4 h-4" /> Link</Button>
          </div>
          <div className="mt-3 space-y-2">
            {linked.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50" data-testid={`linked-prop-${p.id}`}>
                <PropImage path={(p.photos || [])[0]?.storage_path} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{p.title}</p><p className="text-xs text-slate-400">{p.location} · {formatINR(p.price)}</p></div>
                <button onClick={() => toggle("property_ids", p.id)} className="p-1.5 rounded-lg hover:bg-slate-200"><X className="w-4 h-4 text-slate-500" /></button>
              </div>
            ))}
            {linked.length === 0 && <p className="text-sm text-slate-400">No properties linked.</p>}
          </div>
        </div>

        <div><label className="text-sm font-medium text-slate-700">Notes</label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="mt-1.5 rounded-xl" /></div>

        <Button onClick={save} disabled={saving} data-testid="save-customer-btn" className="w-full h-11 rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Customer"}</Button>
      </div>

      {/* Property picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="rounded-2xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="property-picker">
          <DialogHeader><DialogTitle>Link Properties</DialogTitle></DialogHeader>
          <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={propSearch} onChange={(e) => setPropSearch(e.target.value)} placeholder="Search properties..." className="w-full pl-9 pr-3 h-11 rounded-xl border border-slate-200 text-sm outline-none" /></div>
          <div className="overflow-y-auto space-y-2 flex-1 scroll-thin -mr-2 pr-2">
            {filtered.map((p) => {
              const on = form.property_ids.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle("property_ids", p.id)} data-testid={`pick-prop-${p.id}`} className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 text-left ${on ? "border-[#0B192C] bg-slate-50" : "border-slate-200"}`}>
                  <PropImage path={(p.photos || [])[0]?.storage_path} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{p.title}</p><p className="text-xs text-slate-400">{p.location} · {formatINR(p.price)}</p></div>
                  {on && <div className="w-6 h-6 rounded-full bg-[#0B192C] text-white flex items-center justify-center"><Check className="w-4 h-4" /></div>}
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No properties found.</p>}
          </div>
          <Button onClick={() => setPickerOpen(false)} className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">Done ({linked.length})</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
