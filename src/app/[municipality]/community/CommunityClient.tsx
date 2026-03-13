"use client";

import { useState, useEffect, useMemo } from "react";
import type { MunicipalityCommunity, CommunityLink } from "@/lib/data/types";
import { useLiff } from "@/hooks/useLiff";
import { liff } from "@/lib/liff/liffClient";

interface CommunityClientProps {
  community: MunicipalityCommunity;
  municipalityName: string;
}

const PERSONA_KEY = "kosodate_checklist_persona";

const PERSONA_LABELS: Record<string, { icon: string; label: string }> = {
  "dual-income":   { icon: "👨‍👩‍👦", label: "共働き世帯" },
  "stay-at-home":  { icon: "👩‍👧", label: "専業主婦・主夫" },
  "single-parent": { icon: "👤", label: "ひとり親" },
};

const PLATFORM_ICONS: Record<string, string> = {
  "LINE":      "💬",
  "Instagram": "📸",
  "Web":       "🌐",
  "電話":      "📞",
};

export default function CommunityClient({ community, municipalityName }: CommunityClientProps) {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERSONA_KEY);
      if (saved) setSelectedPersona(saved);
    } catch {}
    setLoaded(true);
  }, []);

  // ペルソナフィルター → カテゴリフィルター の順で絞り込み
  const filteredLinks = useMemo(() => {
    let links = community.links;
    if (selectedPersona) {
      links = links.filter((l) => l.persona_tags.includes(selectedPersona));
    }
    if (selectedCategory) {
      links = links.filter((l) => l.category === selectedCategory);
    }
    return links;
  }, [community.links, selectedPersona, selectedCategory]);

  // カテゴリ順にグルーピング
  const groupedLinks = useMemo(() => {
    const map = new Map<string, CommunityLink[]>();
    community.categories.forEach((cat) => {
      const items = filteredLinks.filter((l) => l.category === cat.id);
      if (items.length > 0) map.set(cat.id, items);
    });
    return map;
  }, [community.categories, filteredLinks]);

  if (!loaded) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* ヘッダーバナー */}
      <div className="bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] rounded-xl p-4 text-white">
        <h2 className="text-base font-bold mb-1">コミュニティ</h2>
        <p className="text-xs text-purple-200">
          {municipalityName}での子育てに役立つ地域のつながりをまとめました。
        </p>
      </div>

      {/* ペルソナ選択 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">あなたに関係するものだけ表示</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(PERSONA_LABELS).map(([id, { icon, label }]) => (
            <button
              key={id}
              onClick={() => setSelectedPersona(selectedPersona === id ? null : id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedPersona === id
                  ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              !selectedCategory
                ? "bg-[#7c3aed] text-white shadow-sm"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            すべて ({filteredLinks.length})
          </button>
          {community.categories.map((cat) => {
            const count = filteredLinks.filter((l) => l.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-[#7c3aed] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* リンク一覧（カテゴリ別） */}
      {selectedCategory ? (
        // カテゴリ選択中はフラットに表示
        <div className="space-y-3">
          {filteredLinks.map((link) => (
            <CommunityCard key={link.id} link={link} selectedPersona={selectedPersona} />
          ))}
        </div>
      ) : (
        // 全表示時はカテゴリ見出しつき
        <div className="space-y-6">
          {Array.from(groupedLinks.entries()).map(([catId, links]) => {
            const cat = community.categories.find((c) => c.id === catId);
            return (
              <div key={catId}>
                <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <span>{cat?.icon}</span>
                  <span>{cat?.label}</span>
                </h3>
                <div className="space-y-3">
                  {links.map((link) => (
                    <CommunityCard key={link.id} link={link} selectedPersona={selectedPersona} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredLinks.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          該当するコミュニティが見つかりませんでした
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <ul className="space-y-1 text-yellow-600">
          <li>・ 開館日・受付時間は変更されることがあります。</li>
          <li>・ 外部サービス（LINE・Instagram等）は各社の利用規約に従ってご利用ください。</li>
          <li>・ ✅マークは情報確認済みを示します。</li>
        </ul>
      </div>
    </div>
  );
}

function CommunityCard({
  link,
  selectedPersona,
}: {
  link: CommunityLink;
  selectedPersona: string | null;
}) {
  const platformIcon = PLATFORM_ICONS[link.platform] ?? "🔗";
  const personaNote = selectedPersona ? link.persona_notes[selectedPersona] : null;
  const { isLiff } = useLiff();

  const handleAction = () => {
    if (link.url) {
      if (isLiff) {
        liff.openWindow({ url: link.url, external: true });
      } else {
        window.open(link.url, "_blank", "noopener,noreferrer");
      }
    } else if (link.tel) {
      window.location.href = `tel:${link.tel}`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* 上段：名前 + 確認済みバッジ */}
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${link.platform_color}20` }}
        >
          <span>{platformIcon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <h3 className="font-bold text-sm text-gray-900 leading-snug">{link.name}</h3>
            {link.verified && (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold">✅ 確認済</span>
            )}
          </div>
          {/* プラットフォームバッジ */}
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: link.platform_color }}
          >
            {link.platform}
          </span>
        </div>
      </div>

      {/* 説明文 */}
      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{link.description}</p>

      {/* ペルソナ別メモ */}
      {personaNote && (
        <div className="mt-2 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
          <p className="text-xs text-purple-700">
            <span className="font-semibold">あなたへのポイント：</span>
            {personaNote}
          </p>
        </div>
      )}

      {/* 住所・電話・時間 */}
      {(link.address || link.tel || link.hours) && (
        <div className="mt-2 space-y-1">
          {link.address && (
            <div className="flex items-start gap-1.5 text-[11px] text-gray-400">
              <span>📍</span><span>{link.address}</span>
            </div>
          )}
          {link.tel && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span>📞</span>
              <a href={`tel:${link.tel}`} className="text-[#7c3aed] font-semibold underline">
                {link.tel}
              </a>
            </div>
          )}
          {link.hours && (
            <div className="flex items-start gap-1.5 text-[11px] text-gray-400">
              <span>🕐</span><span>{link.hours}</span>
            </div>
          )}
        </div>
      )}

      {/* アクションボタン */}
      <button
        onClick={handleAction}
        className="mt-3 w-full py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: link.platform_color }}
      >
        {link.action_label} →
      </button>
    </div>
  );
}
