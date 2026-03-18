"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-start gap-3 p-4 text-left"
            >
              <span className="text-[#2d9e6b] font-bold text-sm mt-0.5 shrink-0">Q</span>
              <span className="text-sm font-semibold text-gray-800 flex-1">{item.question}</span>
              <span
                className={`text-gray-400 text-xs shrink-0 mt-0.5 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 flex gap-3 border-t border-gray-50">
                <span className="text-orange-500 font-bold text-sm shrink-0 mt-3">A</span>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
