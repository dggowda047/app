import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Bell, Share2, CheckCircle2, Building2, CalendarClock, TrendingUp, Users, CheckCheck } from "lucide-react";

const ICONS = { property_shared: Share2, share_accepted: CheckCircle2, property_added: Building2, followup_reminder: CalendarClock, customer_added: Users, deal_update: TrendingUp };

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);

  const load = () => api.get("/notifications").then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);

  const readAll = async () => { await api.put("/notifications/read-all"); load(); };
  const openNotif = async (n) => {
    if (!n.read) await api.put(`/notifications/${n.id}/read`);
    if (n.meta?.property_id) nav(`/properties/${n.meta.property_id}`);
    else if (n.meta?.customer_id) nav(`/customers/${n.meta.customer_id}`);
    else load();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-head text-2xl font-bold text-slate-900">Notifications</h1>
        {items.some((n) => !n.read) && <Button variant="outline" onClick={readAll} data-testid="read-all-btn" className="rounded-xl gap-1.5 text-sm"><CheckCheck className="w-4 h-4" /> Mark all read</Button>}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up." subtitle="New activity will show up here." testId="empty-notifications" />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Ic = ICONS[n.type] || Bell;
            return (
              <button key={n.id} onClick={() => openNotif(n)} data-testid={`notification-${n.id}`} className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${n.read ? "bg-white border-slate-200/80" : "bg-indigo-50/50 border-indigo-200"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-slate-100 text-slate-500" : "bg-[#0B192C] text-white"}`}><Ic className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
