import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[#25354a] text-white", className)}>
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M4 18V6h3l5 8 5-8h3v12M12 14v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
