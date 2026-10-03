import { Sparkles } from "lucide-react";

export default function More() {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-head text-2xl font-bold text-slate-900 mb-6">More</h1>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center" data-testid="more-coming-soon">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5"><Sparkles className="w-8 h-8 text-indigo-500" /></div>
        <h2 className="font-head text-xl font-bold text-slate-900">Coming Soon</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">New features will be added here in future updates. Stay tuned!</p>
      </div>
    </div>
  );
}
