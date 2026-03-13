"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface BottomNavProps {
  municipalityId: string;
}

function BottomNavInner({ municipalityId }: BottomNavProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "nursery";

  const navItems = [
    {
      href: `/${municipalityId}`,
      icon: "🏫",
      label: "保育施設",
      tab: "nursery",
    },
    {
      href: `/${municipalityId}?tab=clinic`,
      icon: "🏥",
      label: "医療機関",
      tab: "clinic",
    },
    {
      href: `/${municipalityId}?tab=gov`,
      icon: "🏛",
      label: "支援制度",
      tab: "gov",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                isActive
                  ? "text-[#2d9e6b] font-semibold"
                  : "text-gray-500"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span className="mt-0.5 w-4 h-0.5 bg-[#2d9e6b] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function BottomNav({ municipalityId }: BottomNavProps) {
  return (
    <Suspense fallback={<div className="h-16 bg-white border-t border-gray-200" />}>
      <BottomNavInner municipalityId={municipalityId} />
    </Suspense>
  );
}
