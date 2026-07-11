# upstream/ — 원본 KomaForge 벤더 스냅샷

원본 **[KomaForge](https://github.com/unknowndevdot/KomaForge)** (C# WPF, 원작자 **흑우/unknowndevdot**)의
소스를 **태그 단위로 스냅샷 벤더링**한 참조 디렉토리다. 웹 포팅의 기준 원본이며, 버전 간 변경점을
추적(porting delta 관리)하는 용도.

- `KomaForge/` — 핀된 태그(`komaforge.pin.json`의 `pinnedTag`) 시점의 소스 트리. **읽기 전용.**
- `komaforge.pin.json` — 현재 핀(태그·커밋 SHA·날짜) + 알려진 태그 목록. 기계가 읽는 단일 진실원.
- `changes/*.patch` — 인접 태그 간 전체 diff. 벤더 스냅샷엔 `.git`이 없으므로 **여기서만** 버전 델타를 볼 수 있다.
- `sync.sh` — 원본을 특정 태그로 다시 벤더링 + 새 인접 패치 생성 + 핀 갱신하는 스크립트.

## 규칙

1. **`KomaForge/` 안을 직접 고치지 말 것.** 자체 일관성 참조본이다. 수정하면 diff가 오염된다.
2. 버전 올릴 땐 코드로 손대지 말고 `./upstream/sync.sh <새태그>` 실행.
3. 실제 웹 포팅 반영 여부/할 일은 루트 [`UPSTREAM.md`](../UPSTREAM.md)에서 관리한다.

## 라이선스

원본은 **PolyForm Noncommercial License 1.0.0**. 벤더된 `KomaForge/LICENSE.md`의 고지를
그대로 보존한다(비상업적 용도 한정). `Copyright (c) 2026 unknowndevdot`.
