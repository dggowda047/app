import { formatINRFull } from "@/lib/format";
import { MAX_BUDGET } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export function CurrencyRange({ min, max, onChange, label = "Budget" }) {
  const set = (vals) => onChange(vals[0], vals[1]);
  return (
    <div className="space-y-3" data-testid="currency-range">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{formatINRFull(min)} — {formatINRFull(max)}</span>
      </div>
      <Slider min={0} max={MAX_BUDGET} step={100000} value={[min, max]} onValueChange={set} className="py-2" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500">Minimum</label>
          <Input type="number" value={min} min={0} max={MAX_BUDGET} data-testid="range-min-input"
            onChange={(e) => onChange(Number(e.target.value), max)} className="rounded-xl" />
        </div>
        <div>
          <label className="text-xs text-slate-500">Maximum</label>
          <Input type="number" value={max} min={0} max={MAX_BUDGET} data-testid="range-max-input"
            onChange={(e) => onChange(min, Number(e.target.value))} className="rounded-xl" />
        </div>
      </div>
    </div>
  );
}
