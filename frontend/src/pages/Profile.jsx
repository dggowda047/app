import { useState, useRef } from "react";
import { api, apiError, fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const save = async () => {
    setSaving(true);
    try { await api.put("/auth/profile", { name, email }); await refreshUser(); toast.success("Profile updated"); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async (f) => {
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("files", f);
      const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.put("/auth/profile", { profile_photo_path: r.data.files[0].storage_path });
      await refreshUser();
      toast.success("Photo updated");
    } catch (e) { toast.error(apiError(e)); }
    finally { setUploading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-head text-2xl font-bold text-slate-900">Profile</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#0B192C] text-white flex items-center justify-center text-2xl font-bold">
              {user?.profile_photo_path ? <img src={fileUrl(user.profile_photo_path)} alt="" className="w-full h-full object-cover" /> : initials(user?.name)}
            </div>
            <button onClick={() => fileRef.current.click()} data-testid="upload-avatar-btn" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-white border border-slate-200 shadow flex items-center justify-center">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-slate-600" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadPhoto(e.target.files[0])} />
          </div>
          <div>
            <p className="font-head font-bold text-lg text-slate-900">{user?.name || "Consultant"}</p>
            <p className="text-sm text-slate-500">{user?.phone}</p>
            <p className="text-xs text-slate-400 mt-1">Consultant ID: <span className="font-mono font-medium">{user?.consultant_id}</span></p>
          </div>
        </div>

        <div className="space-y-4 mt-6 pt-6 border-t border-slate-100">
          <div><label className="text-sm font-medium text-slate-700">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name-input" className="mt-1.5 h-11 rounded-xl" /></div>
          <div><label className="text-sm font-medium text-slate-700">Email</label><Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="profile-email-input" placeholder="you@example.com" className="mt-1.5 h-11 rounded-xl" /></div>
          <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={user?.phone || ""} disabled className="mt-1.5 h-11 rounded-xl bg-slate-50" /></div>
          <Button onClick={save} disabled={saving} data-testid="save-profile-btn" className="rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  );
}
