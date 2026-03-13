# こそだてマップ 引継ぎ記録（2026-03-13）

## プロジェクト基本情報

```
場所:     /Users/pero/kosodate-map
フレームワーク: Next.js 16 (App Router, SSG) + TypeScript + Tailwind CSS
デプロイ:  Vercel (GitHub連携, 自動デプロイ)
URL構造:  /{municipalityId} → 総社市は /soja
データ:   data/municipalities/soja/*.json (JSONファイル, SSG時に読み込み)
```

---

## 完成済みコミット一覧（git log）

```
f5ab16a  feat: コミュニティリンク集を追加（実在確認済みURLのみ掲載）
b6a3af7  feat: 生活インフラガイド（スーパー・ドラッグ ポイント戦略比較）を追加
c27930e  feat: 幼稚園・認可外保育施設データを追加
b34be39  feat: ペルソナ別転入チェックリスト機能を追加
5b876e7  Add age filter chips to nursery tab
16d3738  Fix drawer navigation: use useSearchParams for reactive tab switching
6dd3be0  Replace dual nav with left drawer menu (☰)
...
```

---

## 実装済み機能（フルリスト）

| 機能 | ページ | データファイル | 状態 |
|------|--------|---------------|------|
| 保育施設マップ・距離ランキング・年齢フィルター | /soja | nurseries.json (25施設) | ✅ |
| 医療機関・診療科フィルター・Google評価 | /soja?tab=clinic | clinics.json | ✅ |
| 行政サポート14制度（アコーディオン） | /soja?tab=gov | gov_support.json | ✅ |
| 左ドロワーナビゲーション | 全ページ共通 | AppHeader.tsx | ✅ |
| ペルソナ別転入チェックリスト | /soja/checklist | checklist.json | ✅ |
| 生活インフラガイド（スーパー・ポイント戦略） | /soja/shops | shops.json | ✅ |
| コミュニティリンク集 | /soja/community | community.json | ✅ |

---

## データファイル構成

```
data/municipalities/soja/
├── meta.json           自治体メタ情報（名前・座標・連絡先）
├── nurseries.json      保育施設25施設（認可保育所・幼稚園・認可外）
├── clinics.json        医療機関データ
├── gov_support.json    行政サポート14制度
├── checklist.json      転入チェックリスト（3ペルソナ×4セクション）
├── shops.json          スーパー・ドラッグ8店舗（ポイント戦略付き）
└── community.json      コミュニティリンク8件（全て実在確認済み）
```

---

## src/ 主要ファイル

```
src/
├── app/
│   ├── layout.tsx                       ← ルートレイアウト（LiffProvider未追加）
│   ├── page.tsx                         ← エリア選択ランディング
│   └── [municipality]/
│       ├── layout.tsx                   ← 自治体レイアウト（AppHeader含む）
│       ├── page.tsx + MunicipalityHome.tsx  ← 保育施設・医療・行政タブ
│       ├── checklist/page.tsx + ChecklistClient.tsx
│       ├── shops/page.tsx + ShopsClient.tsx
│       └── community/page.tsx + CommunityClient.tsx
├── components/
│   ├── layout/AppHeader.tsx             ← 左ドロワーナビ（6項目）
│   ├── nursery/NurseryCard.tsx
│   ├── nursery/AvailabilityBadge.tsx
│   └── map/LeafletMap.tsx
└── lib/
    ├── data/repository.ts               ← DataRepositoryインターフェース
    ├── data/json-adapter.ts             ← JSON読み込み実装
    ├── data/types.ts                    ← 全型定義
    └── geo/haversine.ts
```

---

## ペルソナシステム（重要：全機能で共有）

- localStorage key: `"kosodate_checklist_persona"`
- 3種類: `"dual-income"` / `"stay-at-home"` / `"single-parent"`
- checklist・shops・community の3ページが同じkeyを読み書きする
- いずれかのページでペルソナを選ぶと全ページに反映される（意図的な設計）

---

## 次にやるべきタスク

### ① LINE LIFF化（最優先・途中）

**現状:** `@line/liff ^2.27.3` はインストール済み（package.json確認済み）
**未実装:** コードは一切書いていない。以下のファイルを全て新規作成する必要がある。

#### 作成するファイル

**1. `src/lib/liff/liffClient.ts`**
LIFFシングルトン。`liff.init()` は複数回呼ばないための管理。
```typescript
// 実装方針
import liff from "@line/liff";

let initialized = false;

export async function initLiff() {
  if (initialized) return;
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
  initialized = true;
}

export { liff };
```

**2. `src/components/providers/LiffProvider.tsx`**
クライアントコンポーネント。`"use client"` 必須。
- liff.init() を呼ぶ
- LIFFIDがなければスキップ（通常ブラウザでも動くように）
- プロフィール情報をReact contextで配布

```typescript
// contextが持つ値
interface LiffContext {
  isLiff: boolean;          // LINE内で開かれているか
  isLoggedIn: boolean;
  profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null;
  loading: boolean;
}
```

**3. `src/app/layout.tsx` 修正**
現状のbody部分:
```tsx
<body className="antialiased">{children}</body>
```
↓ LiffProviderでラップ:
```tsx
<body className="antialiased">
  <LiffProvider>{children}</LiffProvider>
</body>
```
※ `"use client"` のLiffProviderをserver componentのlayout.tsxでimportするのは問題ない

**4. `src/hooks/useLiff.ts`**
```typescript
import { useContext } from "react";
import { LiffContext } from "@/components/providers/LiffProvider";

export function useLiff() {
  return useContext(LiffContext);
}
```

**5. AppHeader.tsxにLINEプロフィール表示追加**
- `useLiff()` を呼ぶ
- `isLiff && profile` のときだけアイコン表示
- ドロワーの一番下あたりに「LINEでログイン中：{displayName}」を表示

#### 環境変数（ユーザーに設定してもらう）
```
.env.local に追加:
NEXT_PUBLIC_LIFF_ID=xxxxxxxx-xxxx   ← LINE Developers ConsoleでLIFF作成後に取得
```

#### LINE Developers Console設定手順（ユーザー向け）
1. https://developers.line.biz/ でログイン
2. プロバイダー作成（or 既存選択）
3. チャネル作成 → 「LINEログイン」チャネル
4. 「LIFF」タブ → 「追加」
5. LIFF URL: `https://kosodate-map.vercel.app/soja`（Vercelの実際のURL）
6. Scope: `profile` にチェック
7. LIFF IDをコピー → `.env.local` に設定
8. Vercelのenv varsにも `NEXT_PUBLIC_LIFF_ID=xxx` を追加

#### 注意点
- `window.open`が使えないLIFF環境では `liff.openWindow({url, external: true})` を使う必要がある
- CommunityClientのhandleAction関数を修正する必要があるかもしれない
- SSGなのでliff.init()はクライアントサイドでのみ動く → `useEffect`内で呼ぶ必要がある

---

### ② お譲り機能（LIFFとSupabase設定後）

ユーザーの設計意図：
- 施設（保育園・支援センター等）が物理的な中継役
- 「譲りたい」「欲しい」をアプリで表明 → マッチング → LINE通知 → 実物は施設経由
- 段階: 情報蓄積 → マッチング → 通知（→ 物の移動は別で）

必要なもの：
- Supabase（PostgreSQL）: items テーブル、users テーブル
- LINE Messaging API: プッシュ通知用（フリープランで月200通）
- liff.getProfile().userId でユーザー識別

---

### ③ 地域イベント情報（未着手）

- 子育て関連イベント（健診・育児講座・公園イベント等）
- 静的JSONで手動更新運用
- データ収集方法: 総社市公式サイト + こども家庭センターのInstagram
- 実装コスト: データ収集1日 + 実装半日

---

### ④ 店舗情報の精度向上（低優先）

- shops.jsonの各店舗データが不正確な可能性がある（ポイント還元率・特売日等）
- ユーザーが後で精査すると言っていた
- 飲食店・衣料品をスコープに含めるかも未決定

---

## 未解決の設計議論メモ

### ドロワーナビへのコミュニティ表示
- 現在: community / shops / checklist は `/soja/xxx` 形式の別ページ
- ドロワーから遷移可能（AppHeaderに実装済み）

### liff.openWindow の使い分け
- LINE MINI App内で `window.open` は動作しない場合がある
- CommunityClient.tsx の handleAction 関数（line 194-200）を要確認・修正

---

## ビルド確認方法

```bash
cd /Users/pero/kosodate-map
npm run build
# エラーなければOK。TypeScriptエラーが出たらそちらを先に修正
```

---

## Vercel デプロイ

- GitHubのmainブランチにpushすると自動デプロイ
- `git push origin main` でOK
- 環境変数は Vercel Dashboard → Settings → Environment Variables で設定

---

## 重要な設計原則（コード全般）

1. **SSG優先**: データ取得はすべてサーバーコンポーネントで行い、`generateStaticParams`でビルド時生成
2. **クライアント化は最小限**: localStorage, useState, useEffect が必要な部分だけ `"use client"` + Client Component
3. **repository パターン**: `DataRepository` インターフェース経由でデータアクセス。将来Supabase移行時は `json-adapter.ts` → `supabase-adapter.ts` に差し替えるだけ
4. **ペルソナ共有**: `PERSONA_KEY = "kosodate_checklist_persona"` をlocalStorageで全ページ共有
5. **新自治体追加**: `data/municipalities/{id}/` にJSONを置くだけでコード変更不要
