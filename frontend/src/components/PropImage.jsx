import { useState } from "react";
import { fileUrl } from "@/lib/api";
import { ImageOff } from "lucide-react";

export function PropImage({ path, alt, className }) {
  const [err, setErr] = useState(false);
  if (!path || err) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`}>
        <ImageOff className="w-8 h-8" />
      </div>
    );
  }
  return <img src={fileUrl(path)} alt={alt || ""} loading="lazy" onError={() => setErr(true)} className={className} />;
}
