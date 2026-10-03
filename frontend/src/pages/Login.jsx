import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (phone.trim().length < 7) return toast.error("Enter a valid phone number");
    setLoading(true);
    try {
      const r = await api.post("/auth/send-otp", { phone: phone.trim() });
      toast.success(`Demo OTP: ${r.data.demo_otp}`, { duration: 8000 });
      setCode(r.data.demo_otp);
      setStep("otp");
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/auth/verify-otp", { phone: phone.trim(), code: code.trim() });
      login(r.data.token, r.data.user);
      if (r.data.is_new_user || !r.data.user.onboarded) nav("/onboarding");
      else nav("/dashboard");
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0B192C] text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-10 -left-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Building2 className="w-6 h-6" /></div>
          <span className="font-head font-bold text-xl">PropConsult</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-head text-4xl font-bold leading-tight">The complete toolkit for<br />property consultants.</h1>
          <p className="text-slate-300 mt-4 max-w-md">Manage properties, customers, follow-ups, deals and consultant sharing — all in one premium workspace.</p>
          <div className="flex items-center gap-2 mt-8 text-sm text-slate-300"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure OTP login · Your data stays private</div>
        </div>
        <div className="text-xs text-slate-500 relative z-10">© 2026 PropConsult CRM</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#0B192C] flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
            <span className="font-head font-bold text-xl text-slate-900">PropConsult</span>
          </div>

          {step === "phone" ? (
            <form onSubmit={sendOtp}>
              <h2 className="font-head text-2xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-slate-500 mt-1 text-sm">Enter your phone number to continue</p>
              <div className="mt-8">
                <label className="text-sm font-medium text-slate-700">Phone number</label>
                <div className="flex items-center mt-1.5 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#0B192C]/20 overflow-hidden">
                  <span className="px-3 text-slate-500 text-sm border-r border-slate-200 h-12 flex items-center">+91</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} data-testid="phone-login-input"
                    autoFocus placeholder="98765 43210" maxLength={10} className="flex-1 h-12 px-3 outline-none text-slate-900" />
                </div>
              </div>
              <Button type="submit" disabled={loading} data-testid="send-otp-btn" className="w-full mt-6 h-12 rounded-xl bg-[#0B192C] hover:bg-[#1E293B] gap-2">
                {loading ? "Sending…" : "Send OTP"} <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <h2 className="font-head text-2xl font-bold text-slate-900">Verify OTP</h2>
              <p className="text-slate-500 mt-1 text-sm">Enter the 6-digit code sent to +91 {phone}</p>
              <div className="mt-8">
                <label className="text-sm font-medium text-slate-700">OTP code</label>
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} data-testid="otp-input"
                  autoFocus maxLength={6} placeholder="••••••" className="mt-1.5 h-12 rounded-xl text-center text-lg tracking-[0.4em]" />
              </div>
              <Button type="submit" disabled={loading} data-testid="otp-submit-btn" className="w-full mt-6 h-12 rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">
                {loading ? "Verifying…" : "Verify & Continue"}
              </Button>
              <button type="button" onClick={() => setStep("phone")} data-testid="change-phone-btn" className="w-full mt-3 text-sm text-slate-500 hover:text-slate-900">
                Change phone number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
