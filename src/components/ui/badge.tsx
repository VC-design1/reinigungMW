import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
        blue: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200",
        amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
        green: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
        red: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
