import type { Config } from "@react-router/dev/config";

// SPA(정적) 빌드 — GitHub Pages 등 정적 호스팅 배포용. 이 앱은 loader/action 없이
// 100% 클라이언트(Pixi/dockview/IndexedDB)라 SSR이 불필요하고, SPA가 dev의 dual-React
// <Meta> 경고도 없앤다. RR Vite 플러그인이 vite `base`를 라우터 basename으로 사용한다.
export default {
  ssr: false,
} satisfies Config;
