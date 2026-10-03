import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { DEAL_STAGES, ACTIVE_STAGES, STAGE_COLORS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, TrendingUp, ChevronRight } from "lucide-react";

export default function Deals() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [open, setOpen] = useState(false);
  const [pipeline, setPipeline] = useState(0);
  const [form, setForm] = useState({ title: "", customer_id: "", property_id: "", value: 0, commission: 0, stage: "New", notes: "" });

  const load = () => {
    api.get("/deals").then((r) => {
      setItems(r.data.items);
      setPipeline(r.data.items.filter((d) => ACTIVE_STAGES.includes(d.stage)).reduce((s, d) => s + (d.value || 0), 0));
    });
  };
  useEffect(() => { load(); api.get("/customers", { params: { limit: 100 } }).then((r) => setCustomers(r.data.items)); api.get("/properties", { params: { limit: 100 } }).then((r) => setProperties(r.data.items)); }, []);

  const create = async () => {
    try { await api.post("/deals", { ...form, customer_id: form.customer_id || null, property_id: form.property_id || null }); toast.success("Deal created"); setOpen(false); setForm({ title: "", customer_id: "", property_id: "", value: 0, commission: 0, stage: "New", notes: "" }); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const moveStage = async (deal, stage) => {
    try { await api.put(`/deals/${deal.id}`, { ...deal, stage }); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-head text-2xl font-bold text-slate-900">Deal Pipeline</h1>
          <p className="text-sm text-slate-500">Active pipeline value: <span className="font-semibold text-emerald-600">{formatINR(pipeline)}</span></p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="add-deal-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B] gap-2"><Plus className="w-4 h-4" /> New Deal</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20"><div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-8 h-8 text-slate-400" /></div><h3 className="font-head text-lg font-semibold text-slate-800">No deals yet</h3><p className="text-sm text-slate-500 mt-1">Create a deal to start tracking your pipeline.</p></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scroll-thin">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = items.filter((d) => d.stage === stage);
            const val = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
            return (
              <div key={stage} className="w-72 shrink-0" data-testid={`kanban-stage-${stage.toLowerCase().replace(/[\s/]+/g, "-")}`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STAGE_COLORS[stage]}`}>{stage}</span>
                  <span className="text-xs text-slate-400">{stageDeals.length} · {formatINR(val)}</span>
                </div>
                <div className="space-y-2.5 min-h-[100px]">
                  {stageDeals.map((d) => {
                    const idx = DEAL_STAGES.indexOf(stage);
                    return (
                      <div key={d.id} className="rounded-xl border border-slate-200/80 bg-white p-3.5" data-testid={`deal-card-${d.id}`}>
                        <p className="font-medium text-slate-900 text-sm">{d.title || "Untitled Deal"}</p>
                        {d.customer_name && <p className="text-xs text-slate-400 mt-0.5">{d.customer_name}</p>}
                        {d.property_title && <p className="text-xs text-slate-400 truncate">{d.property_title}</p>}
                        <p className="font-head font-bold text-[#0B192C] mt-2">{formatINR(d.value)}</p>
                        {idx < 6 && (
                          <div className="flex gap-1.5 mt-2.5">
                            <button onClick={() => moveStage(d, DEAL_STAGES[idx + 1])} data-testid={`advance-deal-${d.id}`} className="flex-1 flex items-center justify-center gap-1 text-xs h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Advance <ChevronRight className="w-3 h-3" /></button>
                            <Select value={d.stage} onValueChange={(v) => moveStage(d, v)}>
                              <SelectTrigger className="w-9 h-8 rounded-lg p-0 justify-center" data-testid={`deal-stage-select-${d.id}`}><span className="text-slate-400">⋯</span></SelectTrigger>
                              <SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl" data-testid="deal-dialog">
          <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} data-testid="deal-title-input" placeholder="Deal title" className="h-11 rounded-xl" />
            <Select value={form.customer_id} onValueChange={(v) => setForm((f) => ({ ...f, customer_id: v }))}><SelectTrigger className="h-11 rounded-xl" data-testid="deal-customer"><SelectValue placeholder="Customer" /></SelectTrigger><SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}><SelectTrigger className="h-11 rounded-xl" data-testid="deal-property"><SelectValue placeholder="Property" /></SelectTrigger><SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500">Deal Value (₹)</label><Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} data-testid="deal-value-input" className="h-11 rounded-xl" /></div>
              <div><label className="text-xs text-slate-500">Commission (₹)</label><Input type="number" value={form.commission} onChange={(e) => setForm((f) => ({ ...f, commission: Number(e.target.value) }))} className="h-11 rounded-xl" /></div>
            </div>
            <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Button onClick={create} data-testid="save-deal-btn" className="w-full h-11 rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">Create Deal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
