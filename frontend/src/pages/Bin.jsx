import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PropImage } from "@/components/PropImage";
import { EmptyState } from "@/components/EmptyState";
import { formatINR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, RotateCcw, Building2, Users } from "lucide-react";

export default function Bin() {
  const [tab, setTab] = useState("properties");
  const [props, setProps] = useState([]);
  const [custs, setCusts] = useState([]);

  const load = () => {
    api.get("/bin/properties").then((r) => setProps(r.data.items));
    api.get("/bin/customers").then((r) => setCusts(r.data.items));
  };
  useEffect(() => { load(); }, []);

  const restore = async (kind, id) => {
    try { await api.post(`/bin/${kind}/${id}/restore`); toast.success("Restored"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const perm = async (kind, id) => {
    try { await api.delete(`/bin/${kind}/${id}/permanent`); toast.success("Permanently deleted"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-head text-2xl font-bold text-slate-900">Bin</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab("properties")} data-testid="bin-tab-properties" className={`px-4 h-10 rounded-xl text-sm font-medium gap-1.5 flex items-center ${tab === "properties" ? "bg-[#0B192C] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><Building2 className="w-4 h-4" /> Properties ({props.length})</button>
        <button onClick={() => setTab("customers")} data-testid="bin-tab-customers" className={`px-4 h-10 rounded-xl text-sm font-medium gap-1.5 flex items-center ${tab === "customers" ? "bg-[#0B192C] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><Users className="w-4 h-4" /> Customers ({custs.length})</button>
      </div>

      {tab === "properties" ? (
        props.length === 0 ? <EmptyState icon={Trash2} title="Bin is empty." subtitle="Deleted properties will appear here." testId="empty-bin-properties" /> : (
          <div className="space-y-3">
            {props.map((p) => (
              <div key={p.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-4" data-testid={`bin-property-${p.id}`}>
                <PropImage path={(p.photos || [])[0]?.storage_path} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{p.title}</p><p className="text-sm text-slate-500">{p.location} · {formatINR(p.price)}</p><p className="text-xs text-slate-400">Deleted {formatDate(p.deleted_at)}</p></div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => restore("properties", p.id)} data-testid={`bin-restore-btn-${p.id}`} className="rounded-lg gap-1 text-xs h-9"><RotateCcw className="w-3.5 h-3.5" /> Restore</Button>
                  <PermDialog onConfirm={() => perm("properties", p.id)} testId={`bin-perm-delete-${p.id}`} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        custs.length === 0 ? <EmptyState icon={Trash2} title="Bin is empty." subtitle="Deleted customers will appear here." testId="empty-bin-customers" /> : (
          <div className="space-y-3">
            {custs.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-4" data-testid={`bin-customer-${c.id}`}>
                <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-semibold shrink-0">{c.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{c.name}</p><p className="text-sm text-slate-500">{c.customer_type} · {c.phone}</p><p className="text-xs text-slate-400">Deleted {formatDate(c.deleted_at)}</p></div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => restore("customers", c.id)} data-testid={`bin-restore-customer-${c.id}`} className="rounded-lg gap-1 text-xs h-9"><RotateCcw className="w-3.5 h-3.5" /> Restore</Button>
                  <PermDialog onConfirm={() => perm("customers", c.id)} testId={`bin-perm-delete-customer-${c.id}`} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function PermDialog({ onConfirm, testId }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button size="sm" variant="outline" data-testid={testId} className="rounded-lg gap-1 text-xs h-9 text-rose-600 border-rose-200 hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader><AlertDialogTitle>Permanently delete?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. The record and its relationships will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="rounded-xl bg-rose-600 hover:bg-rose-700">Permanently Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
