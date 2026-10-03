import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PropertyCard } from "@/components/PropertyCard";
import { PropImage } from "@/components/PropImage";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Phone, Building2, CalendarClock, TrendingUp, Loader2, Sparkles } from "lucide-react";

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [c, setC] = useState(null);

  useEffect(() => { api.get(`/customers/${id}`).then((r) => setC(r.data)).catch((e) => { toast.error(apiError(e)); nav("/customers"); }); }, [id]);

  const doDelete = async () => {
    try { await api.delete(`/customers/${id}`); toast.success("Customer moved to Bin"); nav("/customers"); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (!c) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav(`/customers/${id}/edit`)} data-testid="edit-customer-btn" className="rounded-xl gap-1.5"><Edit className="w-4 h-4" /> Edit</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" data-testid="delete-customer-btn" className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"><Trash2 className="w-4 h-4" /> Delete</Button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader><AlertDialogTitle>Delete this customer?</AlertDialogTitle><AlertDialogDescription>The customer moves to Bin. Linked properties are NOT deleted. You can restore anytime.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} data-testid="confirm-delete-customer" className="rounded-xl bg-rose-600 hover:bg-rose-700">Move to Bin</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0B192C] text-white flex items-center justify-center text-2xl font-bold">{c.name[0]?.toUpperCase()}</div>
          <div>
            <h1 className="font-head text-2xl font-bold text-slate-900">{c.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {c.phone}</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">{c.customer_type}</span>
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div><p className="text-xs text-slate-400">Requirement</p><p className="text-sm font-medium text-slate-800 mt-0.5">{[c.req_category, c.req_subcategory].filter(Boolean).join(" · ") || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Preferred Location</p><p className="text-sm font-medium text-slate-800 mt-0.5">{c.req_location || "—"}</p></div>
          <div><p className="text-xs text-slate-400">Budget</p><p className="text-sm font-medium text-slate-800 mt-0.5">{c.budget_max ? `${formatINR(c.budget_min)} - ${formatINR(c.budget_max)}` : "—"}</p></div>
        </div>
        {c.notes && <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">{c.notes}</p>}
      </div>

      {/* Linked properties */}
      <div>
        <h2 className="font-head text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2"><Building2 className="w-5 h-5" /> Linked Properties ({c.properties?.length || 0})</h2>
        {c.properties?.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{c.properties.map((p) => <PropertyCard key={p.id} p={p} />)}</div> : <p className="text-sm text-slate-400">No properties linked. Edit customer to link.</p>}
      </div>

      {/* Matching properties */}
      {c.matches?.length > 0 && (
        <div>
          <h2 className="font-head text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Matching Properties ({c.matches.length})</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{c.matches.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        </div>
      )}

      {/* Follow-ups + deals */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <h3 className="font-head font-semibold text-slate-900 mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Follow-ups</h3>
          {c.followups?.length ? c.followups.map((f) => (<div key={f.id} className="py-2 border-b border-slate-100 last:border-0 text-sm"><span className="font-medium text-slate-800">{f.followup_type}</span> · <span className="text-slate-400">{f.date}</span> · <span className="text-slate-500">{f.status}</span></div>)) : <p className="text-sm text-slate-400">No follow-ups.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <h3 className="font-head font-semibold text-slate-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Deals</h3>
          {c.deals?.length ? c.deals.map((d) => (<div key={d.id} className="py-2 border-b border-slate-100 last:border-0 text-sm"><span className="font-medium text-slate-800">{d.title || "Deal"}</span> · <span className="text-slate-400">{d.stage}</span> · <span className="text-slate-500">{formatINR(d.value)}</span></div>)) : <p className="text-sm text-slate-400">No deals.</p>}
        </div>
      </div>
    </div>
  );
}
