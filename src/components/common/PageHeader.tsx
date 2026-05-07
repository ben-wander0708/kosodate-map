import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  municipalityId: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export default function PageHeader({ title, municipalityId, subtitle, rightAction }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2 flex-shrink-0">
      <Link
        href={`/${municipalityId}`}
        className="w-8 h-8 flex items-center justify-center text-gray-400 text-xl flex-shrink-0 -ml-1"
        aria-label="ホームに戻る"
      >
        ‹
      </Link>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-800 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </div>
  );
}
