import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PropImage } from "@/components/PropImage";
import { EmptyState } from "@/components/EmptyState";
import { formatINR, formatINRFull, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2, MapPin, CheckCircle2, Plus } from "lucide-react";

export default function SharedProperties() {
  const nav = useNavigate();
  const [tab, setTab] = useState("received");
  const [data, setData] = useState({ received: [], sent: [] });

  const load = () => api.get("/shared-properties").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  const act = async (shareId, type) => {
    try { await api.post(`/property-shares/${shareId}/${type}`); toast.success(type === "accept" ? "Added to My Properties" : "Kept in Shared Properties"); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const list = tab === "received" ? data.received : data.sent;

  return (
    <div className="space-y-6">
      <h1 className="font-head text-2xl font-bold text-slate-900">Shared Properties</h1>
      <div className="flex gap-2">
        {[["received", "Shared with me"], ["sent", "Shared by me"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} data-testid={`shared-tab-${k}`} className={`px-4 h-10 rounded-xl text-sm font-medium ${tab === k ? "bg-[#0B192C] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l} ({(k === "received" ? data.received : data.sent).length})</button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Share2} title="No shared properties yet." subtitle={tab === "received" ? "Properties shared with you will appear here." : "Share a property from its detail page."} testId="empty-shared" />
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.share.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-4" data-testid={`shared-item-${p.share.id}`}>
              <PropImage path={(p.photos || [])[0]?.storage_path} className="w-20 h-20 rounded-xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900 truncate">{p.title}</h3><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /></div>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {p.custom_location || p.location} · {formatINR(p.price)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === "received" ? `From ${p.share.sender_name} (${p.share.sender_phone})` : `To ${p.share.recipient_name} (${p.share.recipient_phone})`}
                  {" · "}Commission {formatINRFull(p.share.commission)} · {formatDate(p.share.shared_at)}
                </p>
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <span className={`text-xs px-2 py-1 rounded-md text-center ${p.share.status === "accepted" ? "bg-emerald-100 text-emerald-700" : p.share.status === "kept" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{p.share.status}</span>
                {tab === "received" && p.share.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => act(p.share.id, "accept")} data-testid={`accept-share-${p.share.id}`} className="rounded-lg bg-[#0B192C] hover:bg-[#1E293B] text-xs h-8">Add to Mine</Button>
                    <Button size="sm" variant="outline" onClick={() => act(p.share.id, "keep")} data-testid={`keep-share-${p.share.id}`} className="rounded-lg text-xs h-8">Keep</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
