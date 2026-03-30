"use client";

import { useState, useRef, useEffect } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

function AnswerText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s　）]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.match(/^https?:\/\//) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="underline text-[#2d9e6b]">
            詳細を見る
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (openIndex !== null && itemRefs.current[openIndex]) {
      setTimeout(() => {
        itemRefs.current[openIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    }
  }, [openIndex]);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            ref={(el) => { itemRefs.current[index] = el; }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full flex items-start gap-3 p-4 text-left active:bg-gray-50"
            >
              <span className="text-[#2d9e6b] font-bold text-sm mt-0.5 shrink-0">Q</span>
              <span className="text-sm font-semibold text-gray-800 flex-1 leading-relaxed">{item.question}</span>
              <span
                className={`text-gray-400 text-xs shrink-0 mt-1 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-4 pb-4 flex gap-3 border-t border-gray-100">
                <span className="text-orange-500 font-bold text-sm shrink-0 mt-3">A</span>
                <p className="text-sm text-gray-600 leading-relaxed mt-3"><AnswerText text={item.answer} /></p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
