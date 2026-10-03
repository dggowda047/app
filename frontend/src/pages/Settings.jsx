import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Bell, Shield, Smartphone, RotateCcw, ChevronRight } from "lucide-react";

export default function Settings() {
  const { refreshUser } = useAuth();
  const nav = useNavigate();

  const resetOnboarding = async () => {
    await api.put("/auth/profile", { onboarded: false });
    await refreshUser();
    toast.success("Onboarding will show on next visit");
    nav("/onboarding");
  };

  const sections = [
    { icon: Bell, title: "Notification Preferences", desc: "Manage how you receive alerts", soon: true },
    { icon: Shield, title: "Security", desc: "OTP login, session management", soon: true },
    { icon: Smartphone, title: "App Preferences", desc: "Display and regional settings", soon: true },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-head text-2xl font-bold text-slate-900">Settings</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100">
        {sections.map((s) => (
          <div key={s.title} className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><s.icon className="w-5 h-5" /></div>
            <div className="flex-1"><p className="font-medium text-slate-900 text-sm">{s.title}</p><p className="text-xs text-slate-400">{s.desc}</p></div>
            {s.soon && <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-500">Coming soon</span>}
          </div>
        ))}
        <button onClick={resetOnboarding} data-testid="reset-onboarding-btn" className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><RotateCcw className="w-5 h-5" /></div>
          <div className="flex-1"><p className="font-medium text-slate-900 text-sm">Replay Onboarding</p><p className="text-xs text-slate-400">See the welcome tour again</p></div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
}
