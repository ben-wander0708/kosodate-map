-- ===================================
-- checklist_sessions RLS設定
-- マイグレーション: 002_checklist_sessions_rls.sql
-- ===================================
-- 目的: checklist_sessionsテーブルに適切なRLSポリシーを設定する
-- 設計: 匿名アプリのため、UUIDを共有秘密として使用する
--      - INSERT: 誰でも新規セッションを作成可能
--      - SELECT/UPDATE: 誰でも可能（セキュリティはUUIDの秘密性に依存）
--      - DELETE: 禁止（クライアントからセッションを削除させない）
-- ===================================

-- RLSを有効化
ALTER TABLE checklist_sessions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをクリア（再実行に備えて）
DROP POLICY IF EXISTS "checklist_sessions_insert_anon" ON checklist_sessions;
DROP POLICY IF EXISTS "checklist_sessions_select_anon" ON checklist_sessions;
DROP POLICY IF EXISTS "checklist_sessions_update_anon" ON checklist_sessions;

-- INSERT: anonロールは新規セッションを作成できる
CREATE POLICY "checklist_sessions_insert_anon"
  ON checklist_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

-- SELECT: anonロールはセッションを読み取れる（UUIDが秘密として機能）
CREATE POLICY "checklist_sessions_select_anon"
  ON checklist_sessions FOR SELECT
  TO anon
  USING (true);

-- UPDATE: anonロールはセッションを更新できる
CREATE POLICY "checklist_sessions_update_anon"
  ON checklist_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: ポリシーなし = anonロールは削除不可（デフォルトで禁止）

-- service_role（管理者）はRLSをバイパスするため追加設定不要
