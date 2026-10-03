import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import { fileUrl } from "@/lib/api";
import {
  LayoutDashboard, Building2, Users, CalendarClock, TrendingUp, Bell, Plus,
  User, Share2, Trash2, Settings, MoreHorizontal, LogOut, Search, Menu, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/followups", label: "Follow-ups", icon: CalendarClock },
  { to: "/deals", label: "Deals", icon: TrendingUp },
];

const bottomNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/properties", label: "Property", icon: Building2 },
  { to: "/customers", label: "Clients", icon: Users },
  { to: "/deals", label: "Deals", icon: TrendingUp },
];

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = () => api.get("/notifications").then((r) => setUnread(r.data.unread)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [loc.pathname]);

  const isActive = (to) => loc.pathname.startsWith(to);
  const onSearch = (e) => {
    e.preventDefault();
    if (search.trim()) nav(`/properties?search=${encodeURIComponent(search.trim())}`);
  };

  const menuItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Notifications", icon: Bell, to: "/notifications" },
    { label: "Shared Properties", icon: Share2, to: "/shared" },
    { label: "Bin", icon: Trash2, to: "/bin" },
    { label: "Settings", icon: Settings, to: "/settings" },
    { label: "More", icon: MoreHorizontal, to: "/more" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0" data-testid="brand-logo">
            <div className="w-9 h-9 rounded-xl bg-[#0B192C] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-head font-bold text-lg text-slate-900 hidden sm:block">PropConsult</span>
          </Link>

          <form onSubmit={onSearch} className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="global-search-input"
                placeholder="Search properties, locations..."
                className="w-full pl-9 pr-3 h-10 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-[#0B192C]/20" />
            </div>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => nav("/properties/new")} data-testid="quick-add-btn"
              className="hidden sm:flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#0B192C] hover:bg-[#1E293B] text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Property
            </button>
            <button onClick={() => nav("/notifications")} data-testid="notification-bell" className="relative w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-slate-700" />
              {unread > 0 && (
                <span data-testid="notification-unread-badge" className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="profile-avatar-btn" className="w-10 h-10 rounded-xl overflow-hidden bg-[#0B192C] text-white flex items-center justify-center font-semibold text-sm">
                  {user?.profile_photo_path ? (
                    <img src={fileUrl(user.profile_photo_path)} alt="" className="w-full h-full object-cover" />
                  ) : initials(user?.name)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2" data-testid="profile-menu">
                <div className="px-3 py-2">
                  <p className="font-semibold text-slate-900 text-sm">{user?.name || "Consultant"}</p>
                  <p className="text-xs text-slate-500">{user?.phone} · {user?.consultant_id}</p>
                </div>
                <DropdownMenuSeparator />
                {menuItems.map((m) => (
                  <DropdownMenuItem key={m.to} onClick={() => nav(m.to)} data-testid={`menu-${m.label.toLowerCase().replace(/\s/g, "-")}`} className="rounded-lg cursor-pointer gap-2 py-2">
                    <m.icon className="w-4 h-4 text-slate-500" /> {m.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); nav("/login"); }} data-testid="menu-logout" className="rounded-lg cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600">
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 pt-6 pb-24 lg:pb-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            {navItems.map((n) => (
              <button key={n.to} onClick={() => nav(n.to)} data-testid={`nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium transition-colors ${isActive(n.to) ? "bg-[#0B192C] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                <n.icon className="w-[18px] h-[18px]" /> {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 h-16 grid grid-cols-5">
        {bottomNav.map((n) => (
          <button key={n.to} onClick={() => nav(n.to)} data-testid={`bottom-nav-${n.label.toLowerCase()}`}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive(n.to) ? "text-[#0B192C]" : "text-slate-400"}`}>
            <n.icon className="w-5 h-5" /> {n.label}
          </button>
        ))}
        <button onClick={() => nav("/more")} data-testid="bottom-nav-more" className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive("/more") ? "text-[#0B192C]" : "text-slate-400"}`}>
          <MoreHorizontal className="w-5 h-5" /> More
        </button>
      </nav>

      {/* Mobile FAB */}
      <button onClick={() => nav("/properties/new")} data-testid="mobile-add-fab"
        className="sm:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-2xl bg-[#0B192C] text-white shadow-lg flex items-center justify-center">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
