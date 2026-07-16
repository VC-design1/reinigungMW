import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-5 w-5 shrink-0 rounded border-slate-300 accent-[#0f766e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40",
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";
