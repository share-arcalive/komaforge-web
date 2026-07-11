import type { Config } from "@react-router/dev/config";

// SPA(정적) 빌드 — GitHub Pages 등 정적 호스팅 배포용. 이 앱은 loader/action 없이
// 100% 클라이언트(Pixi/dockview/IndexedDB)라 SSR이 불필요하고, SPA가 dev의 dual-React
// <Meta> 경고도 없앤다.
//
// basename: GitHub Pages 프로젝트 사이트는 /<repo>/(= /komaforge-web/) 하위에 서빙되므로
// 라우터 basename도 그 경로여야 index 라우트가 매칭된다(아니면 빈 화면 + React #418).
// 주의: RR Vite 플러그인은 vite `base`(에셋 URL)를 라우터 basename으로 자동 연동하지 "않는다".
// 그래서 vite.config의 base와 여기 basename을 같은 DEPLOY_BASE로 따로 맞춘다. dev/로컬은 "/".
const deployBase = process.env.DEPLOY_BASE || "/";

export default {
  ssr: false,
  // "/komaforge-web/" → "/komaforge-web" (RR 관례: 후행 슬래시 없음). 루트는 "/".
  basename: deployBase === "/" ? "/" : deployBase.replace(/\/+$/, ""),
} satisfies Config;
