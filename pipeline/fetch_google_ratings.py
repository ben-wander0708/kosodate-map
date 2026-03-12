"""
Google Places APIを使って医療機関の評価・口コミ数を取得し clinics.json に書き込む。
使い方:
  cd kosodate-map
  python pipeline/fetch_google_ratings.py --municipality soja
"""

import json
import time
import argparse
import os
import urllib.request
import urllib.parse
from pathlib import Path


def find_place(name: str, address: str, api_key: str):
    """Find Place APIで施設を検索し place_id, rating, user_ratings_total を返す"""
    query = f"{name} {address}"
    params = urllib.parse.urlencode({
        "input": query,
        "inputtype": "textquery",
        "fields": "place_id,name,rating,user_ratings_total",
        "language": "ja",
        "key": api_key,
    })
    url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

    if data.get("status") != "OK":
        print(f"  API status: {data.get('status')} - {data.get('error_message', '')}")
        return None

    candidates = data.get("candidates", [])
    if not candidates:
        print(f"  候補なし")
        return None

    return candidates[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--municipality", default="soja")
    parser.add_argument("--api-key", default=os.environ.get("GOOGLE_MAPS_API_KEY", ""))
    args = parser.parse_args()

    if not args.api_key:
        raise ValueError("APIキーが設定されていません。.env.local か --api-key で指定してください。")

    data_path = Path(__file__).parent.parent / "data" / "municipalities" / args.municipality / "clinics.json"
    if not data_path.exists():
        raise FileNotFoundError(f"{data_path} が見つかりません")

    clinics = json.loads(data_path.read_text(encoding="utf-8"))

    updated = 0
    skipped = 0

    for clinic in clinics:
        # すでに取得済みはスキップ
        if clinic.get("google_place_id"):
            print(f"  SKIP (already done): {clinic['name']}")
            skipped += 1
            continue

        print(f"  検索中: {clinic['name']} / {clinic['address']}")
        result = find_place(clinic["name"], clinic["address"], args.api_key)

        if result:
            clinic["google_place_id"] = result.get("place_id")
            clinic["google_rating"] = result.get("rating")
            clinic["google_review_count"] = result.get("user_ratings_total")
            rating_str = f"⭐ {result.get('rating')} ({result.get('user_ratings_total')}件)"
            print(f"    → {result.get('name')} | {rating_str}")
            updated += 1
        else:
            clinic["google_place_id"] = None
            clinic["google_rating"] = None
            clinic["google_review_count"] = None
            print(f"    → 見つかりませんでした")

        # レート制限対策
        time.sleep(0.3)

    data_path.write_text(
        json.dumps(clinics, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"\n完了: {updated}件更新, {skipped}件スキップ")
    print(f"保存先: {data_path}")


if __name__ == "__main__":
    main()
