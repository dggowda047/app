import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Users, CalendarClock, Share2, ArrowRight } from "lucide-react";

const slides = [
  { icon: Building2, title: "Manage Every Property", text: "List residential, commercial and land properties with photos, pricing and amenities." },
  { icon: Users, title: "Connect Customers to Properties", text: "Link many customers to many properties and track every requirement." },
  { icon: CalendarClock, title: "Never Miss a Follow-up", text: "Schedule reminders and move deals through your pipeline with ease." },
  { icon: Share2, title: "Share Properties With Consultants", text: "Collaborate with other brokers and set commission per share." },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const last = i === slides.length;

  const finish = async () => {
    await api.put("/auth/profile", { name: name.trim() || user?.name || "Consultant", onboarded: true });
    await refreshUser();
    nav("/dashboard");
  };

  const S = slides[i]?.icon;

  return (
    <div className="min-h-screen bg-[#0B192C] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-up">
        {!last ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-8">
              <S className="w-10 h-10" />
            </div>
            <h1 className="font-head text-3xl font-bold">{slides[i].title}</h1>
            <p className="text-slate-300 mt-3">{slides[i].text}</p>
            <div className="flex items-center justify-center gap-2 mt-10">
              {slides.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-1.5 bg-white/30"}`} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-10">
              <button onClick={() => (i === 0 ? nav("/dashboard") : setI(i - 1))} data-testid="onboarding-skip-btn" className="text-slate-400 text-sm">
                {i === 0 ? "Skip" : "Back"}
              </button>
              <Button onClick={() => setI(i + 1)} data-testid="onboarding-next-btn" className="rounded-xl bg-white text-[#0B192C] hover:bg-slate-100 gap-2 h-11 px-6">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="font-head text-3xl font-bold">You're all set</h1>
            <p className="text-slate-300 mt-3">What should we call you?</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="onboarding-name-input"
              placeholder="Your name" className="mt-8 h-12 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-center" />
            <Button onClick={finish} data-testid="onboarding-finish-btn" className="w-full mt-6 h-12 rounded-xl bg-white text-[#0B192C] hover:bg-slate-100">
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
