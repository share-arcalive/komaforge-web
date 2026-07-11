/**
 * 애니메이션 WebP 인코더 (의존성 없음).
 *
 * 브라우저는 *정지* WebP를 네이티브로 인코딩한다(`canvas.toBlob("image/webp")`).
 * 이 모듈은 그 정지 WebP들에서 이미지 비트스트림 청크(VP8 / VP8L / ALPH)를 꺼내,
 * WebP RIFF 컨테이너(VP8X + ANIM + 프레임별 ANMF)로 직접 먹싱해 애니메이션 WebP를 만든다.
 * (KomaForge 896708e '움직이는 WebP 내보내기'의 웹 대응.)
 */

const FRAME_IMAGE_CHUNKS = new Set(["VP8 ", "VP8L", "ALPH"]);

function fourCC(s: string): Uint8Array {
  return new Uint8Array([s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)]);
}

/** FourCC + size(LE32) + payload + (홀수면 패딩 1) */
function chunk(cc: string, payload: Uint8Array): Uint8Array {
  const pad = payload.length & 1;
  const out = new Uint8Array(8 + payload.length + pad);
  out.set(fourCC(cc), 0);
  new DataView(out.buffer).setUint32(4, payload.length, true);
  out.set(payload, 8);
  return out;
}

function u24(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** 정지 WebP에서 프레임 이미지 청크(VP8 /VP8L/ALPH)를 헤더 포함 그대로 추출(ANMF에 그대로 넣는다). */
function extractFrameImageChunks(webp: Uint8Array): Uint8Array {
  const dv = new DataView(webp.buffer, webp.byteOffset, webp.byteLength);
  // "RIFF"(0..3) size(4) "WEBP"(8..11) 이후 청크들.
  if (webp.length < 12) throw new Error("invalid webp");
  let off = 12;
  const out: Uint8Array[] = [];
  while (off + 8 <= webp.length) {
    const cc = String.fromCharCode(webp[off]!, webp[off + 1]!, webp[off + 2]!, webp[off + 3]!);
    const size = dv.getUint32(off + 4, true);
    const total = 8 + size + (size & 1); // 헤더 + 페이로드 + 패딩
    if (FRAME_IMAGE_CHUNKS.has(cc)) {
      out.push(webp.subarray(off, off + total));
    }
    off += total;
  }
  if (out.length === 0) throw new Error("no VP8/VP8L chunk in webp frame");
  // ALPH가 VP8 보다 먼저 오도록 정렬(컨테이너 규약).
  out.sort((a, b) => (String.fromCharCode(a[0]!, a[1]!, a[2]!, a[3]!) === "ALPH" ? -1 : 1));
  return concat(out);
}

/** 정지 WebP 프레임들 → 애니메이션 WebP 바이트. 모든 프레임은 width×height(전체 캔버스) 동일 전제. */
export function encodeAnimatedWebP(
  frames: Uint8Array[],
  delaysMs: number[],
  width: number,
  height: number,
  loop = 0,
): Uint8Array {
  if (frames.length === 0) throw new Error("no frames");
  const hasAlpha = false; // 페이지 추출은 불투명(배경 채움).

  // VP8X: 애니메이션 플래그(0x02). + 캔버스 크기-1 (24bit LE).
  const vp8x = chunk(
    "VP8X",
    concat([
      new Uint8Array([hasAlpha ? 0x12 : 0x02, 0, 0, 0]),
      u24(width - 1),
      u24(height - 1),
    ]),
  );

  // ANIM: 배경색(BGRA, 흰색) + 루프 횟수(0=무한).
  const anim = chunk(
    "ANIM",
    new Uint8Array([0xff, 0xff, 0xff, 0xff, loop & 0xff, (loop >> 8) & 0xff]),
  );

  const anmfs: Uint8Array[] = frames.map((f, i) => {
    const img = extractFrameImageChunks(f);
    const dur = Math.max(1, Math.round(delaysMs[i] ?? 100));
    const header = concat([
      u24(0), // Frame X/2
      u24(0), // Frame Y/2
      u24(width - 1),
      u24(height - 1),
      u24(dur),
      new Uint8Array([0x00]), // flags: 블렌드+디스포즈 없음(불투명 전체프레임)
    ]);
    return chunk("ANMF", concat([header, img]));
  });

  const body = concat([vp8x, anim, ...anmfs]);
  const riff = concat([fourCC("WEBP"), body]);
  const out = new Uint8Array(8 + riff.length);
  out.set(fourCC("RIFF"), 0);
  new DataView(out.buffer).setUint32(4, riff.length, true);
  out.set(riff, 8);
  return out;
}
