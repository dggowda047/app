import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PropImage } from "@/components/PropImage";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { formatINR, formatINRFull, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, MapPin, Edit, Trash2, Share2, CheckCircle2, Users, CalendarClock,
  TrendingUp, Phone, Star, Loader2, X,
} from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [lb, setLb] = useState(-1);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharedWithOpen, setSharedWithOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");
  const [shareComm, setShareComm] = useState(0);
  const [shareNote, setShareNote] = useState("");
  const [sharing, setSharing] = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);

  const load = () => api.get(`/properties/${id}`).then((r) => setP(r.data)).catch((e) => { toast.error(apiError(e)); nav("/properties"); });
  useEffect(() => { load(); }, [id]);

  const doShare = async () => {
    if (!sharePhone.trim()) return toast.error("Enter consultant phone number");
    setSharing(true);
    try {
      await api.post(`/properties/${id}/share`, { phone: sharePhone.trim(), commission: Number(shareComm), note: shareNote });
      toast.success("Property shared successfully");
      setShareOpen(false); setSharePhone(""); setShareComm(0); setShareNote("");
      load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSharing(false); }
  };

  const doDelete = async () => {
    try { await api.delete(`/properties/${id}`); toast.success("Moved to Bin"); nav("/properties"); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (!p) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

  const photos = p.photos || [];
  const primary = photos.find((x) => x.is_primary) || photos[0];
  const rest = photos.filter((x) => x !== primary);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" /> Back</button>
        {p.is_owner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShareOpen(true)} data-testid="share-property-btn" className="rounded-xl gap-1.5"><Share2 className="w-4 h-4" /> Share</Button>
            <Button variant="outline" onClick={() => nav(`/properties/${id}/edit`)} data-testid="edit-property-btn" className="rounded-xl gap-1.5"><Edit className="w-4 h-4" /> Edit</Button>
          </div>
        )}
      </div>

      {/* Gallery */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 h-72 sm:h-96">
          <div className="col-span-4 sm:col-span-3 relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => setLb(photos.indexOf(primary))} data-testid="primary-photo">
            <PropImage path={primary?.storage_path} className="w-full h-full object-cover" />
            {p.is_shared && <span data-testid="green-shared-tick-badge" onClick={(e) => { e.stopPropagation(); setSharedWithOpen(true); }} className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md cursor-pointer"><CheckCircle2 className="w-4 h-4" /> Shared</span>}
          </div>
          <div className="hidden sm:flex flex-col gap-2">
            {rest.slice(0, 3).map((ph, i) => (
              <div key={ph.id} className="relative rounded-xl overflow-hidden cursor-pointer flex-1" onClick={() => setLb(photos.indexOf(ph))}>
                <PropImage path={ph.storage_path} className="w-full h-full object-cover" />
                {i === 2 && rest.length > 3 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">+{rest.length - 3}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-64 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">No photos</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header info */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {(p.transaction_types || []).map((t) => <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">{t}</span>)}
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">{p.status}</span>
            </div>
            <h1 className="font-head text-2xl font-bold text-slate-900">{p.title}</h1>
            <div className="flex items-center gap-1 text-slate-500 mt-1"><MapPin className="w-4 h-4" /> {p.custom_location || p.location} · {p.category} · {p.subcategory}</div>
            {p.bedrooms || p.area ? <div className="text-sm text-slate-500 mt-2">{[p.bedrooms, p.area].filter(Boolean).join(" · ")}</div> : null}
            {p.description && <p className="text-slate-600 mt-4 text-sm leading-relaxed">{p.description}</p>}
          </div>

          {/* Financials */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <h2 className="font-head font-semibold text-slate-900 mb-4">Financial Details</h2>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Price" value={formatINR(p.price)} />
              <Stat label="Rental / Returns" value={p.rental_income ? formatINR(p.rental_income) : "—"} />
              <Stat label="Commission" value={p.commission ? formatINR(p.commission) : "—"} />
            </div>
          </div>

          {/* Amenities */}
          {p.amenities?.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
              <h2 className="font-head font-semibold text-slate-900 mb-4">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {p.amenities.map((a) => <span key={a} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700">{a}</span>)}
              </div>
            </div>
          )}

          {/* Linked customers */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <h2 className="font-head font-semibold text-slate-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Linked Customers ({p.customers?.length || 0})</h2>
            {p.customers?.length ? (
              <div className="space-y-2">
                {p.customers.map((c) => (
                  <button key={c.id} onClick={() => nav(`/customers/${c.id}`)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left">
                    <div><p className="text-sm font-medium text-slate-800">{c.name}</p><p className="text-xs text-slate-400">{c.customer_type} · {c.phone}</p></div>
                    <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">No customers linked yet.</p>}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {p.is_shared && (
            <button onClick={() => setSharedWithOpen(true)} data-testid="shared-with-btn" className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold"><CheckCircle2 className="w-5 h-5" /> Shared Property</div>
              <p className="text-sm text-emerald-600 mt-1">Shared with {p.share_count} consultant(s). Tap to view.</p>
            </button>
          )}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 divide-y divide-slate-100">
            <SideStat icon={CalendarClock} label="Follow-ups" value={p.followups?.length || 0} />
            <SideStat icon={TrendingUp} label="Deals" value={p.deals?.length || 0} />
            <SideStat icon={Users} label="Customers" value={p.customers?.length || 0} />
          </div>
          {p.is_owner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="delete-property-btn" className="w-full rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"><Trash2 className="w-4 h-4" /> Delete Property</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                  <AlertDialogDescription>It will be moved to the Bin. You can restore it anytime.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={doDelete} data-testid="confirm-delete-property" className="rounded-xl bg-rose-600 hover:bg-rose-700">Move to Bin</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {lb >= 0 && <PhotoLightbox photos={photos} startIndex={lb} onClose={() => setLb(-1)} />}

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="rounded-2xl" data-testid="share-dialog">
          <DialogHeader><DialogTitle>Share Property</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-slate-700">Consultant Phone Number</label><Input value={sharePhone} onChange={(e) => setSharePhone(e.target.value.replace(/\D/g, ""))} data-testid="share-phone-input" placeholder="Enter phone number" className="mt-1.5 h-11 rounded-xl" /></div>
            <div><label className="text-sm font-medium text-slate-700">Commission for this consultant</label><Input type="number" value={shareComm} onChange={(e) => setShareComm(e.target.value)} data-testid="share-commission-input" placeholder="₹" className="mt-1.5 h-11 rounded-xl" /><p className="text-xs text-slate-400 mt-1">{formatINRFull(shareComm)}</p></div>
            <div><label className="text-sm font-medium text-slate-700">Note (optional)</label><Textarea value={shareNote} onChange={(e) => setShareNote(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <DialogFooter>
            <Button onClick={doShare} disabled={sharing} data-testid="confirm-share-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B] w-full">{sharing ? "Sharing…" : "Share Property"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared with dialog */}
      <Dialog open={sharedWithOpen} onOpenChange={(o) => { setSharedWithOpen(o); if (!o) setSelectedShare(null); }}>
        <DialogContent className="rounded-2xl" data-testid="shared-with-dialog">
          <DialogHeader><DialogTitle>{selectedShare ? "Consultant Details" : "Shared With"}</DialogTitle></DialogHeader>
          {!selectedShare ? (
            <div className="space-y-2">
              {(p.shares || []).length === 0 ? <p className="text-sm text-slate-400">Not shared yet.</p> : (p.shares || []).map((s) => (
                <button key={s.id} onClick={() => setSelectedShare(s)} data-testid={`share-consultant-${s.id}`} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-white flex items-center justify-center text-sm font-semibold">{(s.recipient_name || "C")[0]}</div>
                    <div><p className="text-sm font-medium text-slate-800">{s.recipient_name}</p><p className="text-xs text-slate-400">{s.recipient_phone}</p></div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md ${s.status === "accepted" ? "bg-emerald-100 text-emerald-700" : s.status === "kept" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setSelectedShare(null)} className="text-sm text-slate-500 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> All consultants</button>
              <Row2 label="Name" value={selectedShare.recipient_name} />
              <Row2 label="Phone" value={selectedShare.recipient_phone} />
              <Row2 label="Date Shared" value={formatDate(selectedShare.shared_at)} />
              <Row2 label="Commission" value={formatINRFull(selectedShare.commission)} />
              <Row2 label="Share Status" value={selectedShare.status} />
              <Row2 label="Accepted" value={selectedShare.accepted_at ? formatDate(selectedShare.accepted_at) : "Not yet"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Stat = ({ label, value }) => (<div><p className="text-xs text-slate-400">{label}</p><p className="font-head font-bold text-lg text-slate-900 mt-0.5">{value}</p></div>);
const SideStat = ({ icon: Icon, label, value }) => (<div className="flex items-center justify-between py-3 first:pt-0 last:pb-0"><span className="flex items-center gap-2 text-sm text-slate-500"><Icon className="w-4 h-4" /> {label}</span><span className="font-semibold text-slate-900">{value}</span></div>);
const Row2 = ({ label, value }) => (<div className="flex items-center justify-between text-sm"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-900 capitalize">{value}</span></div>);
