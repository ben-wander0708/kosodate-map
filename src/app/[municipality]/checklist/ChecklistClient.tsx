"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { MunicipalityChecklist, ChecklistItem } from "@/lib/data/types";

interface ChecklistClientProps {
  checklist: MunicipalityChecklist;
  municipalityName: string;
}

const LOCAL_SHARE_KEY = "kosodate_share_id";

function getShareIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("share");
}

function generateId(): string {
  return crypto.randomUUID();
}

function getDaysLeft(movingDate: Date, daysFromMoving: number): number {
  const deadline = new Date(movingDate);
  deadline.setDate(deadline.getDate() + daysFromMoving);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineDate(movingDate: Date, daysFromMoving: number): string {
  const deadline = new Date(movingDate);
  deadline.setDate(deadline.getDate() + daysFromMoving);
  return `${deadline.getMonth() + 1}月${deadline.getDate()}日まで`;
}

export default function ChecklistClient({ checklist, municipalityName }: ChecklistClientProps) {
  const [shareId, setShareId] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [decisionDateStr, setDecisionDateStr] = useState<string>("");
  const [movingDateStr, setMovingDateStr] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // Supabaseから読み込み
  const loadFromSupabase = useCallback(async (id: string) => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("checklist_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        if (data.persona_id) setSelectedPersonaId(data.persona_id);
        if (data.checked_items) setCheckedItems(new Set(data.checked_items as string[]));
        if (data.moving_date) setMovingDateStr(data.moving_date);
        if (data.decision_date) setDecisionDateStr(data.decision_date);
      }
    } catch {
      // Supabase失敗時はlocalStorageにフォールバック
    }
  }, []);

  // Supabaseに保存
  const saveToSupabase = useCallback(async (
    id: string,
    updates: { persona_id?: string | null; checked_items?: string[]; moving_date?: string; decision_date?: string }
  ) => {
    try {
      const supabase = getSupabase();
      await supabase.from("checklist_sessions").upsert({
        id,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // サイレントに失敗
    }
  }, []);

  useEffect(() => {
    const urlShareId = getShareIdFromUrl();

    if (urlShareId) {
      // パートナーの共有URLで開いた
      setShareId(urlShareId);
      setIsShared(true);
      loadFromSupabase(urlShareId).then(() => setLoaded(true));
    } else {
      // 自分のセッション
      let id = localStorage.getItem(LOCAL_SHARE_KEY);
      if (!id) {
        id = generateId();
        localStorage.setItem(LOCAL_SHARE_KEY, id);
      }
      setShareId(id);
      setIsShared(false);

      // Supabaseから読み込み（なければlocalStorageから）
      loadFromSupabase(id).then(() => {
        // Supabaseにデータがなかった場合はlocalStorageの値を使う
        try {
          const savedPersona = localStorage.getItem("kosodate_checklist_persona");
          const savedChecked = localStorage.getItem("kosodate_checklist_checked");
          const savedDate = localStorage.getItem("kosodate_moving_date");
          if (savedPersona) setSelectedPersonaId((prev) => prev ?? savedPersona);
          if (savedChecked) setCheckedItems((prev) => prev.size > 0 ? prev : new Set(JSON.parse(savedChecked)));
          if (savedDate) setMovingDateStr((prev) => prev || savedDate);
          const savedDecision = localStorage.getItem("kosodate_decision_date");
          if (savedDecision) setDecisionDateStr((prev) => prev || savedDecision);
        } catch {}
        setLoaded(true);
      });
    }
  }, [loadFromSupabase]);

  const handlePersonaSelect = useCallback((personaId: string) => {
    setSelectedPersonaId(personaId);
    try { localStorage.setItem("kosodate_checklist_persona", personaId); } catch {}
    if (shareId) saveToSupabase(shareId, { persona_id: personaId });
  }, [shareId, saveToSupabase]);

  const handleToggle = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      try { localStorage.setItem("kosodate_checklist_checked", JSON.stringify([...next])); } catch {}
      if (shareId) saveToSupabase(shareId, { checked_items: [...next] });
      return next;
    });
  }, [shareId, saveToSupabase]);

  const handleDecisionDateChange = useCallback((value: string) => {
    setDecisionDateStr(value);
    try { localStorage.setItem("kosodate_decision_date", value); } catch {}
    if (shareId) saveToSupabase(shareId, { decision_date: value });
  }, [shareId, saveToSupabase]);

  const handleMovingDateChange = useCallback((value: string) => {
    setMovingDateStr(value);
    try { localStorage.setItem("kosodate_moving_date", value); } catch {}
    if (shareId) saveToSupabase(shareId, { moving_date: value });
  }, [shareId, saveToSupabase]);

  const handleReset = useCallback(() => {
    if (!window.confirm("チェックをすべてリセットしますか？")) return;
    setCheckedItems(new Set());
    try { localStorage.removeItem("kosodate_checklist_checked"); } catch {}
    if (shareId) saveToSupabase(shareId, { checked_items: [] });
  }, [shareId, saveToSupabase]);

  const handleShare = useCallback(async () => {
    if (!shareId) return;
    await saveToSupabase(shareId, {
      persona_id: selectedPersonaId,
      checked_items: [...checkedItems],
      moving_date: movingDateStr,
      decision_date: decisionDateStr,
    });
    const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      prompt("このURLをパートナーに送ってください:", url);
    }
  }, [shareId, saveToSupabase, selectedPersonaId, checkedItems, movingDateStr]);

  const decisionDate = decisionDateStr ? new Date(decisionDateStr) : null;
  const movingDate = movingDateStr ? new Date(movingDateStr) : null;
  const selectedPersona = checklist.personas.find((p) => p.id === selectedPersonaId);
  const totalItems = selectedPersona
    ? selectedPersona.sections.reduce((sum, s) => sum + s.items.length, 0) : 0;
  const doneItems = selectedPersona
    ? selectedPersona.sections.flatMap((s) => s.items).filter((item) => checkedItems.has(item.id)).length : 0;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

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
      <div className="bg-gradient-to-r from-[#2d9e6b] to-[#1a7a52] rounded-xl p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold mb-1">転入チェックリスト</h2>
            <p className="text-xs text-green-200">
              {municipalityName}に転入したらやること。転入日を入力するとカウントダウン表示されます。
            </p>
          </div>
        </div>

        {/* 共有バナー */}
        {isShared ? (
          <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-xs text-green-100">
            👥 パートナーと共有中のリストです
          </div>
        ) : (
          <button
            onClick={handleShare}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-xs text-white font-semibold flex items-center justify-center gap-2 transition-all"
          >
            {isCopied ? "✅ URLをコピーしました！" : "👫 パートナーと共有する"}
          </button>
        )}
      </div>

      {/* 日付入力 */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">🏠 転居を決めた日（物件契約日）</p>
          <input
            type="date"
            value={decisionDateStr}
            onChange={(e) => handleDecisionDateChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
          />
          {decisionDate && (
            <p className="text-xs text-[#2d9e6b] mt-1 font-medium">
              ✅ 転居前のやることリストが表示されます
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">📅 引越し予定日</p>
          <input
            type="date"
            value={movingDateStr}
            onChange={(e) => handleMovingDateChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#4CAF82]"
          />
          {movingDate && (
            <p className="text-xs text-[#2d9e6b] mt-1 font-medium">
              ✅ {movingDate.getMonth() + 1}月{movingDate.getDate()}日から転入後の期限を計算中
            </p>
          )}
        </div>
      </div>

      {/* ペルソナ選択 */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-3">あなたの家族構成は？</p>
        <div className="grid grid-cols-3 gap-2">
          {checklist.personas.map((persona) => {
            const isSelected = selectedPersonaId === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => handlePersonaSelect(persona.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected ? "border-[#2d9e6b] bg-[#f0faf5] shadow-sm" : "border-gray-200 bg-white"
                }`}
              >
                <span className="text-2xl">{persona.icon}</span>
                <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-[#2d9e6b]" : "text-gray-700"}`}>
                  {persona.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-tight">{persona.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* チェックリスト本体 */}
      {selectedPersona ? (
        <>
          {/* 進捗バー */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                {selectedPersona.icon} {selectedPersona.label}の進捗
              </span>
              <span className="text-sm font-bold" style={{ color: selectedPersona.color }}>
                {doneItems}/{totalItems}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: selectedPersona.color }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{progress}% 完了</span>
              {doneItems > 0 && (
                <button onClick={handleReset} className="text-xs text-gray-400 underline">
                  リセット
                </button>
              )}
            </div>
          </div>

          {/* セクション別チェックリスト */}
          {selectedPersona.sections.map((section) => {
            const isPreMove = section.id === "pre-move";
            // 転居前セクションは転居決定日がないと非表示
            if (isPreMove && !decisionDate) return (
              <div key={section.id} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-400">🏠 転居を決めた日を入力すると<br />転居前にやることが表示されます</p>
              </div>
            );
            return (
              <div key={section.id}>
                <h3 className="text-sm font-bold text-gray-700 mb-2">{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <ChecklistItemCard
                      key={item.id}
                      item={item}
                      checked={checkedItems.has(item.id)}
                      onToggle={handleToggle}
                      accentColor={selectedPersona.color}
                      movingDate={movingDate}
                      decisionDate={isPreMove ? decisionDate : null}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* 完了メッセージ */}
          {progress === 100 && (
            <div className="bg-[#f0faf5] border border-[#c8ead8] rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-bold text-[#2d9e6b]">すべての手続きが完了しました！</p>
              <p className="text-xs text-green-600 mt-1">{municipalityName}での新生活をお楽しみください</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl p-6 text-center border border-gray-100">
          <p className="text-3xl mb-3">☝️</p>
          <p className="text-sm font-semibold text-gray-600 mb-1">上から家族構成を選んでください</p>
          <p className="text-xs text-gray-400">あなたに必要な手続き・設定が表示されます</p>
        </div>
      )}

      {/* 注意書き */}
      <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-700 border border-yellow-200">
        <p className="font-semibold mb-1">⚠ ご注意</p>
        <ul className="space-y-1 text-yellow-600">
          <li>・ 手続きの期限・内容は変更されることがあります。</li>
          <li>・ 詳細は各窓口に直接ご確認ください。</li>
          <li>・ チェック状態はクラウドに保存され共有URLで同期されます。</li>
        </ul>
      </div>
    </div>
  );
}

function ChecklistItemCard({
  item,
  checked,
  onToggle,
  accentColor,
  movingDate,
  decisionDate,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (id: string) => void;
  accentColor: string;
  movingDate: Date | null;
  decisionDate?: Date | null;
}) {
  const urgencyBadge: Record<string, { label: string; bg: string; text: string }> = {
    high: { label: "急ぎ", bg: "bg-red-50", text: "text-red-600" },
    medium: { label: "優先", bg: "bg-orange-50", text: "text-orange-600" },
    low: { label: "", bg: "", text: "" },
  };
  const badge = urgencyBadge[item.urgency];

  let countdownBadge: { label: string; bg: string; text: string } | null = null;
  let deadlineDateStr: string | null = null;

  // 転居前タスク（decisionDateベース）
  if (decisionDate && item.days_from_decision !== null && item.days_from_decision !== undefined) {
    const daysLeft = getDaysLeft(decisionDate, item.days_from_decision);
    deadlineDateStr = getDeadlineDate(decisionDate, item.days_from_decision);
    if (daysLeft < 0) {
      countdownBadge = { label: "対応済み確認を", bg: "bg-gray-100", text: "text-gray-500" };
    } else if (daysLeft === 0) {
      countdownBadge = { label: "今日やろう", bg: "bg-red-100", text: "text-red-700" };
    } else if (daysLeft <= 7) {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-red-50", text: "text-red-600" };
    } else {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-blue-50", text: "text-blue-600" };
    }
  } else if (movingDate && item.days_from_moving !== null && item.days_from_moving !== undefined) {
    const daysLeft = getDaysLeft(movingDate, item.days_from_moving);
    deadlineDateStr = getDeadlineDate(movingDate, item.days_from_moving);
    if (daysLeft < 0) {
      countdownBadge = { label: "期限切れ", bg: "bg-gray-100", text: "text-gray-500" };
    } else if (daysLeft === 0) {
      countdownBadge = { label: "今日まで！", bg: "bg-red-100", text: "text-red-700" };
    } else if (daysLeft <= 3) {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-red-50", text: "text-red-600" };
    } else if (daysLeft <= 14) {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-orange-50", text: "text-orange-600" };
    } else {
      countdownBadge = { label: `あと${daysLeft}日`, bg: "bg-blue-50", text: "text-blue-600" };
    }
  }

  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        checked ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
            checked ? "border-gray-300 bg-gray-200" : "border-gray-300"
          }`}
          style={checked ? {} : { borderColor: accentColor }}
        >
          {checked && <span className="text-gray-400 text-xs">✓</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${checked ? "line-through text-gray-400" : "text-gray-800"}`}>
              {item.text}
            </span>
            {badge.label && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            {countdownBadge && !checked && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${countdownBadge.bg} ${countdownBadge.text}`}>
                {countdownBadge.label}
              </span>
            )}
          </div>

          {(deadlineDateStr || item.deadline) && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-gray-400">🗓</span>
              <span className={`text-[11px] font-semibold ${item.urgency === "high" ? "text-red-500" : "text-gray-500"}`}>
                {deadlineDateStr ?? item.deadline}
              </span>
            </div>
          )}

          {item.note && (
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{item.note}</p>
          )}
        </div>
      </div>
    </button>
  );
}
