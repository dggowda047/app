import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatINR } from "@/lib/format";
import { PropertyCard } from "@/components/PropertyCard";
import { Skeletons, EmptyState } from "@/components/EmptyState";
import { Building2, Users, CalendarClock, TrendingUp, ArrowUpRight, Plus } from "lucide-react";

const kpis = [
  { key: "total_properties", label: "Total Properties", icon: Building2, to: "/properties", color: "text-indigo-600 bg-indigo-50" },
  { key: "active_customers", label: "Active Customers", icon: Users, to: "/customers", color: "text-blue-600 bg-blue-50" },
  { key: "open_followups", label: "Open Follow-ups", icon: CalendarClock, to: "/followups", color: "text-amber-600 bg-amber-50" },
  { key: "pipeline_value", label: "Deal Value Pipeline", icon: TrendingUp, to: "/deals", color: "text-emerald-600 bg-emerald-50", currency: true },
];

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/summary"),
      api.get("/dashboard/recent-properties"),
      api.get("/dashboard/followups"),
    ]).then(([s, r, f]) => {
      setSummary(s.data); setRecent(r.data.items); setFollowups(f.data.items);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-400 font-medium">Welcome back{user?.name ? "," : ""}</p>
        <h1 className="font-head text-2xl sm:text-3xl font-bold text-slate-900">{user?.name || "Consultant"}</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button key={k.key} onClick={() => nav(k.to)} data-testid={`kpi-${k.label.toLowerCase().replace(/\s/g, "-")}-card`}
            className="group text-left rounded-2xl border border-slate-200/80 bg-white p-5 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}><k.icon className="w-5 h-5" /></div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <div className="mt-4 font-head text-2xl sm:text-3xl font-bold text-slate-900">
              {loading ? "—" : k.currency ? formatINR(summary?.[k.key]) : summary?.[k.key]}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{k.label}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent properties */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-head text-lg font-semibold text-slate-900">Recent Properties</h2>
            <button onClick={() => nav("/properties")} className="text-sm text-[#0B192C] font-medium">View all</button>
          </div>
          {loading ? <Skeletons count={3} /> : recent.length === 0 ? (
            <EmptyState icon={Building2} title="No properties added yet." subtitle="Create your first property to get started." actionLabel="Add Property" onAction={() => nav("/properties/new")} testId="dashboard-empty-properties" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {recent.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </div>

        {/* Follow-ups */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-head text-lg font-semibold text-slate-900">Upcoming Follow-ups</h2>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100">
            {loading ? <div className="p-6 text-sm text-slate-400">Loading…</div> : followups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No open follow-ups.</div>
            ) : followups.map((f) => (
              <div key={f.id} className="p-4 flex items-center gap-3" data-testid={`dashboard-followup-${f.id}`}>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><CalendarClock className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{f.followup_type} · {f.customer_name || "—"}</p>
                  <p className="text-xs text-slate-400">{f.date} {f.time || ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
