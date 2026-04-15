"use client";

import { useState, useRef, useEffect } from "react";

interface FeedbackButtonProps {
  municipalityId?: string;
}

const STORAGE_KEY = "kosodate_feedback_sent";

export default function FeedbackButton({ municipalityId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // モーダルが開いたらテキストエリアにフォーカス
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setStatus("idle");
    setMessage("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage("");
    setStatus("idle");
  };

  const handleSubmit = async () => {
    if (!message.trim() || status === "sending") return;

    setStatus("sending");

    try {
      // anonymous_id を localStorage から取得
      const anonymousId =
        typeof window !== "undefined"
          ? localStorage.getItem("kosodate_anon_id")
          : null;

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymous_id: anonymousId,
          municipality_id: municipalityId ?? null,
          message: message.trim(),
        }),
      });

      if (res.ok) {
        setStatus("done");
        // 送信済みフラグ（再表示抑制には使わないが将来の拡張用）
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        }
        // 2秒後に自動クローズ
        setTimeout(() => handleClose(), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-4 z-40 flex items-center gap-1.5 bg-white border border-gray-200 shadow-lg rounded-full px-3 py-2 text-xs text-gray-600 font-medium hover:bg-gray-50 active:scale-95 transition-all"
        aria-label="ご意見・改善要望を送る"
      >
        <span className="text-base">💬</span>
        <span>ご意見</span>
      </button>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* モーダル */}
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            {status === "done" ? (
              // 送信完了
              <div className="text-center py-4 space-y-2">
                <div className="text-4xl">🙏</div>
                <p className="font-bold text-gray-800">ありがとうございます！</p>
                <p className="text-sm text-gray-500">いただいたご意見は改善に活かします。</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-gray-900">
                    ご意見をお聞かせください
                  </h2>
                  <p className="text-xs text-gray-500">
                    改善要望・ご感想など、なんでもお気軽にどうぞ。
                  </p>
                </div>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="例：○○の情報を追加してほしい、使いにくい部分がある…など"
                  rows={4}
                  maxLength={1000}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#4CAF82] focus:border-transparent"
                />

                {status === "error" && (
                  <p className="text-xs text-red-500">
                    送信に失敗しました。もう一度お試しください。
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || status === "sending"}
                    className="flex-1 py-2.5 rounded-xl bg-[#4CAF82] text-white text-sm font-bold disabled:opacity-40 hover:bg-[#3d9e73] active:scale-95 transition-all"
                  >
                    {status === "sending" ? "送信中…" : "送信する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
