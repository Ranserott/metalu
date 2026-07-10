import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-lg shadow-sm bg-gradient-to-r from-[var(--theme-dark)] to-[var(--theme-primary)] px-6 py-5 flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon ? (
          <div className="flex-shrink-0 w-10 h-10 rounded-md bg-white/15 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
          {description ? (
            <p className="text-sm text-white/80 truncate">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}