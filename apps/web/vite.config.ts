import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // 배포 base 경로(빌드 때만). GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에 서빙되므로
  // 배포 시 DEPLOY_BASE="/komaforge-web/"를 준다(끝에 슬래시 필수). dev/로컬은 "/"(기본).
  // 주의: 이 base는 "에셋 URL"만 정한다. 라우터 basename은 자동 연동되지 않으므로
  // react-router.config.ts에서 같은 DEPLOY_BASE로 따로 맞춘다.
  base: process.env.DEPLOY_BASE || "/",
  server: {
    // 프리뷰/런타임이 지정한 PORT를 따른다(없으면 5173).
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  resolve: {
    // 단일 React 인스턴스 보장(중복 시 "useContext of null").
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // React-context를 쓰는 라이브러리는 react와 같은 최초 optimize 패스에 묶어
    // 사전 번들한다. 세션 중 지연 발견으로 재최적화가 일어나면 stale 청크가 섞여
    // "useContext of null"로 깨지므로(메모리: rr7-pnpm-vite-dual-react), 미리 포함.
    include: ["lucide-react", "dockview"],
  },
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
});
