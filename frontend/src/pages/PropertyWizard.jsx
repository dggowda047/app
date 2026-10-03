import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiError, fileUrl } from "@/lib/api";
import { CATEGORIES, TRANSACTION_TYPES, AMENITIES, MAX_BUDGET } from "@/lib/constants";
import { formatINRFull } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { ArrowLeft, ArrowRight, Check, Upload, Star, Trash2, GripVertical, Camera, Loader2, X } from "lucide-react";

const LOCATIONS = ["Whitefield", "Sarjapur Road", "Hebbal", "Yelahanka", "HSR Layout", "Electronic City", "Devanahalli", "Indiranagar", "Koramangala", "Kanakapura Road"];
const STEPS = ["Category", "Details", "Amenities", "Photos & Review"];

export default function PropertyWizard() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();

  const [form, setForm] = useState({
    category: "", subcategory: "", location: "", custom_location: "",
    transaction_types: [], title: "", description: "", price: 0, rental_income: 0,
    commission: 0, amenities: [], status: "Available", photos: [], bedrooms: "", area: "",
  });

  useEffect(() => {
    if (editing) {
      api.get(`/properties/${id}`).then((r) => {
        const p = r.data;
        setForm({ category: p.category, subcategory: p.subcategory, location: p.location, custom_location: p.custom_location || "",
          transaction_types: p.transaction_types || [], title: p.title || "", description: p.description || "", price: p.price || 0,
          rental_income: p.rental_income || 0, commission: p.commission || 0, amenities: p.amenities || [], status: p.status || "Available",
          photos: p.photos || [], bedrooms: p.bedrooms || "", area: p.area || "" });
      }).catch((e) => toast.error(apiError(e)));
    }
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const current = form.photos;
      const added = r.data.files.map((f, i) => ({ id: f.id, storage_path: f.storage_path, content_type: f.content_type, is_primary: current.length === 0 && i === 0, order: current.length + i }));
      set("photos", [...current, ...added]);
      toast.success(`${added.length} photo(s) added`);
    } catch (e) { toast.error(apiError(e, "Upload failed. Please retry.")); }
    finally { setUploading(false); }
  };

  const removePhoto = (pid) => {
    let ps = form.photos.filter((p) => p.id !== pid);
    if (ps.length && !ps.some((p) => p.is_primary)) ps[0].is_primary = true;
    set("photos", ps);
  };
  const makePrimary = (pid) => set("photos", form.photos.map((p) => ({ ...p, is_primary: p.id === pid })));
  const move = (idx, dir) => {
    const ps = [...form.photos];
    const j = idx + dir;
    if (j < 0 || j >= ps.length) return;
    [ps[idx], ps[j]] = [ps[j], ps[idx]];
    set("photos", ps.map((p, i) => ({ ...p, order: i })));
  };

  const canNext = () => {
    if (step === 0) return form.category && form.subcategory;
    if (step === 1) return form.location && (form.location !== "Other" || form.custom_location) && form.transaction_types.length > 0;
    return true;
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing) { await api.put(`/properties/${id}`, payload); toast.success("Property updated"); nav(`/properties/${id}`); }
      else { const r = await api.post("/properties", payload); toast.success("Property created"); nav(`/properties/${r.data.id}`); }
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
      <h1 className="font-head text-2xl font-bold text-slate-900">{editing ? "Edit Property" : "Add New Property"}</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mt-6 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i <= step ? "text-[#0B192C]" : "text-slate-300"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-[#0B192C] text-white" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? "bg-emerald-500" : "bg-slate-100"}`} />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 animate-fade-up">
        {/* STEP 0: Category */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700">Property Category</label>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {Object.keys(CATEGORIES).map((c) => (
                  <button key={c} onClick={() => { set("category", c); set("subcategory", ""); }} data-testid={`category-${c.toLowerCase()}`}
                    className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${form.category === c ? "border-[#0B192C] bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {form.category && (
              <div>
                <label className="text-sm font-semibold text-slate-700">Subcategory</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                  {CATEGORIES[form.category].map((s) => (
                    <button key={s} onClick={() => set("subcategory", s)} data-testid={`subcategory-${s.toLowerCase().replace(/\s/g, "-")}`}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${form.subcategory === s ? "border-[#0B192C] bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {[...LOCATIONS, "Other"].map((l) => (
                  <button key={l} onClick={() => set("location", l)} data-testid={`location-${l.toLowerCase().replace(/\s/g, "-")}`}
                    className={`p-2.5 rounded-xl border-2 text-sm transition-all ${form.location === l ? "border-[#0B192C] bg-slate-50 font-medium" : "border-slate-200 hover:border-slate-300"}`}>
                    {l}
                  </button>
                ))}
              </div>
              {form.location === "Other" && (
                <Input value={form.custom_location} onChange={(e) => set("custom_location", e.target.value)} data-testid="custom-location-input"
                  placeholder="Enter location" className="mt-3 h-11 rounded-xl" />
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Transaction Type <span className="text-slate-400 font-normal">(select one or more)</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {TRANSACTION_TYPES.map((t) => (
                  <button key={t} onClick={() => toggle("transaction_types", t)} data-testid={`txn-${t.toLowerCase().replace(/\s/g, "-")}`}
                    className={`p-2.5 rounded-xl border-2 text-sm transition-all ${form.transaction_types.includes(t) ? "border-[#0B192C] bg-slate-50 font-medium" : "border-slate-200 hover:border-slate-300"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500">Title</label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Auto-generated if empty" className="mt-1 h-11 rounded-xl" data-testid="title-input" /></div>
              <div><label className="text-xs text-slate-500">Bedrooms / Config</label><Input value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} placeholder="e.g. 3 BHK" className="mt-1 h-11 rounded-xl" /></div>
              <div><label className="text-xs text-slate-500">Area</label><Input value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. 1500 sqft" className="mt-1 h-11 rounded-xl" /></div>
            </div>

            {/* Financials: Price -> Rental -> Commission */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <PriceField label="Price" value={form.price} onChange={(v) => set("price", v)} testId="price-input" />
              <PriceField label="Rental Income / Returns (per month)" value={form.rental_income} onChange={(v) => set("rental_income", v)} max={5000000} testId="rental-input" />
              <PriceField label="Commission" value={form.commission} onChange={(v) => set("commission", v)} max={10000000} testId="commission-input" />
            </div>

            <div>
              <label className="text-xs text-slate-500">Description</label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Additional details" className="mt-1 rounded-xl" />
            </div>
          </div>
        )}

        {/* STEP 2: Amenities */}
        {step === 2 && (
          <div>
            <label className="text-sm font-semibold text-slate-700">Amenities <span className="text-slate-400 font-normal">(select all that apply)</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
              {AMENITIES.map((a) => {
                const Ic = Icons[a.icon] || Icons.Check;
                const on = form.amenities.includes(a.key);
                return (
                  <button key={a.key} onClick={() => toggle("amenities", a.key)} data-testid={`amenity-${a.key.toLowerCase().replace(/\s/g, "-")}`}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm transition-all ${on ? "border-[#0B192C] bg-slate-50 font-medium" : "border-slate-200 hover:border-slate-300"}`}>
                    <Ic className={`w-4 h-4 ${on ? "text-[#0B192C]" : "text-slate-400"}`} /> {a.key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Photos & Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-slate-700">Photos</label>
              <div className="flex gap-3 mt-3">
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} data-testid="photo-file-input" />
                <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
                <button onClick={() => fileRef.current.click()} disabled={uploading} data-testid="upload-gallery-btn"
                  className="flex-1 flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B192C] text-slate-500 hover:text-[#0B192C] transition-colors">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  <span className="text-sm font-medium">Upload from Gallery</span>
                </button>
                <button onClick={() => camRef.current.click()} disabled={uploading} data-testid="upload-camera-btn"
                  className="flex-1 flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0B192C] text-slate-500 hover:text-[#0B192C] transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-sm font-medium">Take Photo</span>
                </button>
              </div>

              {form.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {form.photos.map((p, i) => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-200" data-testid={`photo-thumb-${i}`}>
                      <img src={fileUrl(p.storage_path)} alt="" className="w-full h-28 object-cover" />
                      {p.is_primary && <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"><Star className="w-3 h-3" /> Primary</span>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {!p.is_primary && <button onClick={() => makePrimary(p.id)} data-testid={`make-primary-${i}`} className="p-1.5 rounded-lg bg-white/90 hover:bg-white" title="Set primary"><Star className="w-4 h-4 text-amber-500" /></button>}
                        <button onClick={() => move(i, -1)} className="p-1.5 rounded-lg bg-white/90 hover:bg-white" title="Move left"><ArrowLeft className="w-4 h-4" /></button>
                        <button onClick={() => move(i, 1)} className="p-1.5 rounded-lg bg-white/90 hover:bg-white" title="Move right"><ArrowRight className="w-4 h-4" /></button>
                        <button onClick={() => removePhoto(p.id)} data-testid={`delete-photo-${i}`} className="p-1.5 rounded-lg bg-white/90 hover:bg-white" title="Delete"><Trash2 className="w-4 h-4 text-rose-500" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review */}
            <div className="rounded-xl bg-slate-50 p-5 space-y-2.5" data-testid="property-review">
              <h3 className="font-head font-semibold text-slate-900 mb-3">Review Property</h3>
              <Row label="Category" value={`${form.category} · ${form.subcategory}`} />
              <Row label="Location" value={form.location === "Other" ? form.custom_location : form.location} />
              <Row label="Transaction" value={form.transaction_types.join(", ")} />
              <Row label="Price" value={formatINRFull(form.price)} />
              <Row label="Rental Income" value={formatINRFull(form.rental_income)} />
              <Row label="Commission" value={formatINRFull(form.commission)} />
              <Row label="Amenities" value={form.amenities.length ? form.amenities.join(", ") : "None"} />
              <Row label="Photos" value={`${form.photos.length} photo(s)`} />
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={() => step === 0 ? nav(-1) : setStep(step - 1)} data-testid="wizard-back-btn" className="rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-1" /> {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => canNext() ? setStep(step + 1) : toast.error("Please complete this step")} data-testid="wizard-next-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={save} disabled={saving} data-testid="save-property-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />} Save Property
          </Button>
        )}
      </div>
    </div>
  );
}

function PriceField({ label, value, onChange, max = MAX_BUDGET, testId }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm text-slate-500">{formatINRFull(value)}</span>
      </div>
      <Slider min={0} max={max} step={50000} value={[value]} onValueChange={(v) => onChange(v[0])} className="py-3" />
      <Input type="number" value={value} min={0} max={max} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} className="h-11 rounded-xl" />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value || "—"}</span>
    </div>
  );
}
