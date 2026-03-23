## [HEAD] 現在地 — 2026-03-23
プロジェクト: こそだてMAP | フェーズ: 実装
完了: オンボーディングに各子どもの年齢＋入園状況（保活中/在籍中/家庭保育）を追加・useOnboarding hookで全画面共通化・チェックリストへペルソナ自動反映
次: 入園後タイムライン実装（入園月可変・イベントテンプレートJSON設計→画面実装）
ブロッカー: なし

## [LOG] 最新決定（最新10件）
- 2026-03-23 入園後タイムライン方針決定: 転居→入園後1年まで夫婦の情報非対称性を解消するプロダクトに拡張（理由: JTBD整理）
- 2026-03-23 オンボーディングStep4を個別子ども情報入力に刷新・useOnboarding hook新設（理由: チェックリスト共通化）
- 2026-03-23 オンボーディングをフェーズベースに再設計（理由: UX改善）
- 2026-03-23 未就学児人数ステップ追加・4ステップ化（理由: パーソナライズ強化）
- 2026-03-22 チェックリスト起点を転居決定日に変更（理由: 計画支援）
- 2026-03-22 パートナー共有URL機能追加（理由: 世帯内共有）
- 2026-03-19 デュアルタイムライン（転居決定日/引越日）導入（理由: 事前計画対応）
- 2026-03-19 チェックリスト世帯共有（Supabase）リリース（理由: MVP機能）

## [REF] 参照先
- コード: /Users/pero/kosodate-map/src/
- Supabase: project lbjrlrneqhaeucifkxeq / checklist_sessions テーブル
- 本番: kosodate-map.vercel.app
- オンボーディング: src/components/onboarding/OnboardingModal.tsx
- useOnboarding hook: src/hooks/useOnboarding.ts
