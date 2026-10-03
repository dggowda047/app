import { useNavigate } from "react-router-dom";
import { PropImage } from "@/components/PropImage";
import { formatINR } from "@/lib/format";
import { MapPin, Users, CheckCircle2 } from "lucide-react";

export function PropertyCard({ p, onClick }) {
  const nav = useNavigate();
  const primary = (p.photos || []).find((x) => x.is_primary) || (p.photos || [])[0];
  const go = () => (onClick ? onClick(p) : nav(`/properties/${p.id}`));

  return (
    <div onClick={go} data-testid={`property-card-${p.id}`}
      className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.15)] hover:-translate-y-1 transition-all duration-300">
      <div className="relative h-44 overflow-hidden">
        <PropImage path={primary?.storage_path} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          {(p.transaction_types || []).slice(0, 2).map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-lg bg-[#0B192C]/90 text-white text-[11px] font-medium backdrop-blur-sm">{t.replace("For ", "")}</span>
          ))}
        </div>
        {p.is_shared && (
          <span data-testid="green-shared-tick-badge" className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md" title="Shared">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">{p.category} · {p.subcategory}</div>
        <h3 className="font-semibold text-slate-900 mt-1 truncate">{p.title}</h3>
        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1"><MapPin className="w-3.5 h-3.5" /> {p.custom_location || p.location}</div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-head font-bold text-lg text-[#0B192C]">{formatINR(p.price)}</span>
          <span className="flex items-center gap-1 text-xs text-slate-400"><Users className="w-3.5 h-3.5" /> {p.customer_count || 0}</span>
        </div>
        {p.rental_income > 0 && <div className="text-xs text-emerald-600 mt-1">Rental: {formatINR(p.rental_income)}/mo</div>}
      </div>
    </div>
  );
}
