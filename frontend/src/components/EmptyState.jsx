import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction, testId }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6" data-testid={testId || "empty-state"}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        {Icon && <Icon className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-800 font-head">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-xs">{subtitle}</p>}
      {actionLabel && (
        <Button onClick={onAction} data-testid="empty-state-action" className="mt-6 rounded-xl bg-[#0B192C] hover:bg-[#1E293B]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function Skeletons({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
          <div className="h-44 bg-slate-100" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
            <div className="h-5 bg-slate-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
