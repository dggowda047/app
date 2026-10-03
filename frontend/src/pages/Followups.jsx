import { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { FOLLOWUP_TYPES, FOLLOWUP_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Plus, Check, RotateCcw, X, Trash2 } from "lucide-react";

const STATUS_COLORS = { Open: "bg-amber-100 text-amber-700", Completed: "bg-emerald-100 text-emerald-700", Rescheduled: "bg-blue-100 text-blue-700", Cancelled: "bg-slate-100 text-slate-500" };

export default function Followups() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", date: "", time: "", followup_type: "Call", status: "Open", notes: "", reminder: true });

  const load = useCallback(() => {
    setLoading(true);
    const params = filter !== "all" ? { status: filter } : {};
    api.get("/followups", { params }).then((r) => setItems(r.data.items)).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/customers", { params: { limit: 100 } }).then((r) => setCustomers(r.data.items)); }, []);

  const create = async () => {
    if (!form.date) return toast.error("Please select a date");
    try { await api.post("/followups", { ...form, customer_id: form.customer_id || null }); toast.success("Follow-up created"); setOpen(false); setForm({ customer_id: "", date: "", time: "", followup_type: "Call", status: "Open", notes: "", reminder: true }); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const setStatus = async (f, status) => {
    try { await api.put(`/followups/${f.id}`, { ...f, status }); toast.success(`Marked ${status}`); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const del = async (f) => { try { await api.delete(`/followups/${f.id}`); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-head text-2xl font-bold text-slate-900">Follow-ups</h1>
        <Button onClick={() => setOpen(true)} data-testid="add-followup-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B] gap-2"><Plus className="w-4 h-4" /> New Follow-up</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", ...FOLLOWUP_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} data-testid={`followup-filter-${s.toLowerCase()}`} className={`px-4 h-9 rounded-xl text-sm font-medium ${filter === s ? "bg-[#0B192C] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{s === "all" ? "All" : s}</button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white border border-slate-200 animate-pulse" />)}</div> : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No open follow-ups." subtitle="Create a follow-up to stay on top of your leads." actionLabel="New Follow-up" onAction={() => setOpen(true)} testId="empty-followups" />
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-4" data-testid={`followup-${f.id}`}>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-slate-900">{f.followup_type}</p><span className={`text-xs px-2 py-0.5 rounded-md ${STATUS_COLORS[f.status]}`}>{f.status}</span></div>
                <p className="text-sm text-slate-500 mt-0.5">{f.customer_name || "General"} · {f.date} {f.time || ""}{f.property_title ? ` · ${f.property_title}` : ""}</p>
                {f.notes && <p className="text-xs text-slate-400 mt-1">{f.notes}</p>}
              </div>
              {f.status === "Open" && (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setStatus(f, "Completed")} data-testid={`complete-followup-${f.id}`} className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Complete"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setStatus(f, "Rescheduled")} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="Reschedule"><RotateCcw className="w-4 h-4" /></button>
                  <button onClick={() => setStatus(f, "Cancelled")} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Cancel"><X className="w-4 h-4" /></button>
                </div>
              )}
              <button onClick={() => del(f)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl" data-testid="followup-dialog">
          <DialogHeader><DialogTitle>New Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={form.customer_id} onValueChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="followup-customer"><SelectValue placeholder="Customer (optional)" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500">Date</label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} data-testid="followup-date" className="h-11 rounded-xl" /></div>
              <div><label className="text-xs text-slate-500">Time</label><Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="h-11 rounded-xl" /></div>
            </div>
            <Select value={form.followup_type} onValueChange={(v) => setForm((f) => ({ ...f, followup_type: v }))}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="followup-type"><SelectValue /></SelectTrigger>
              <SelectContent>{FOLLOWUP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="rounded-xl" />
            <Button onClick={create} data-testid="save-followup-btn" className="w-full h-11 rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
