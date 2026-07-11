#!/usr/bin/env bash
# 원본 KomaForge를 특정 태그로 다시 벤더링하고, 새 인접-태그 패치를 만들고, 핀을 갱신한다.
#
#   ./upstream/sync.sh            # 원본 최신 태그로 갱신
#   ./upstream/sync.sh v0.1.6     # 특정 태그로 갱신
#
# 벤더 스냅샷(upstream/KomaForge)은 .git 없이 소스 트리만 둔다(읽기 전용 참조).
# 버전 델타는 upstream/changes/*.patch 로만 보존되므로 태그를 올릴 때마다 새 패치를 만든다.
set -euo pipefail

REPO_URL="https://github.com/unknowndevdot/KomaForge.git"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"   # .../upstream
DEST="$HERE/KomaForge"
CHANGES="$HERE/changes"
PIN="$HERE/komaforge.pin.json"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "▶ 원본 clone(shallow tags)…"
git clone --quiet "$REPO_URL" "$TMP/src"

# 현재 핀 태그(있으면). 없으면 빈 값.
CUR_TAG="$(sed -n 's/.*"pinnedTag": *"\([^"]*\)".*/\1/p' "$PIN" 2>/dev/null || true)"

# 목표 태그: 인자 없으면 최신 태그(버전 정렬).
TARGET="${1:-$(git -C "$TMP/src" tag --sort=version:refname | tail -1)}"
if ! git -C "$TMP/src" rev-parse -q --verify "refs/tags/$TARGET" >/dev/null; then
  echo "✗ 태그 없음: $TARGET" >&2
  echo "  사용 가능: $(git -C "$TMP/src" tag --sort=version:refname | tr '\n' ' ')" >&2
  exit 1
fi
SHA="$(git -C "$TMP/src" rev-list -n1 "$TARGET")"
TAGDATE="$(git -C "$TMP/src" log -1 --format=%cs "$TARGET")"
TODAY="$(date +%F)"

echo "▶ 현재 핀: ${CUR_TAG:-(없음)} → 목표: $TARGET ($SHA)"

# 인접 태그 패치 생성(현재 핀 이후 ~ 목표까지의 모든 연속 구간).
mkdir -p "$CHANGES"
TAGS=($(git -C "$TMP/src" tag --sort=version:refname))
prev=""
for t in "${TAGS[@]}"; do
  if [[ -n "$prev" ]]; then
    out="$CHANGES/${prev}_to_${t}.patch"
    if [[ ! -f "$out" ]]; then
      git -C "$TMP/src" diff "$prev" "$t" > "$out"
      echo "  + 패치 생성: ${prev}_to_${t}.patch"
    fi
  fi
  prev="$t"
  [[ "$t" == "$TARGET" ]] && break
done

echo "▶ 소스 트리 벤더링: $TARGET → upstream/KomaForge"
rm -rf "$DEST"; mkdir -p "$DEST"
git -C "$TMP/src" archive --format=tar "$TARGET" | tar -x -C "$DEST"

echo "▶ 핀 갱신: $PIN"
# pinnedTag/Commit/Date/fetchedAt 만 교체(knownTags는 손대지 않음 — 새 태그면 수동 추가 권장).
tmp_pin="$(mktemp)"
sed -E \
  -e "s#(\"pinnedTag\": *\")[^\"]*(\")#\1$TARGET\2#" \
  -e "s#(\"pinnedCommit\": *\")[^\"]*(\")#\1$SHA\2#" \
  -e "s#(\"pinnedDate\": *\")[^\"]*(\")#\1$TAGDATE\2#" \
  -e "s#(\"fetchedAt\": *\")[^\"]*(\")#\1$TODAY\2#" \
  "$PIN" > "$tmp_pin" && mv "$tmp_pin" "$PIN"

echo "✅ 완료. $CUR_TAG → $TARGET"
echo "   다음: git diff 로 벤더 변경 확인 → UPSTREAM.md 포팅 상태표 갱신 → 커밋."
