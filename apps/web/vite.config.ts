import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// 빌드 정보(버전·git SHA·날짜·원본 파리티 태그)를 클라이언트 번들에 주입한다.
function buildInfo() {
  const readJson = (rel: string): Record<string, unknown> => {
    try {
      return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));
    } catch {
      return {};
    }
  };
  const version = (readJson("../../package.json").version as string) || "0.0.0";
  const pin = readJson("../../upstream/komaforge.pin.json");
  const upstream = (pin.pinnedTag as string) || "";
  const upstreamCommit = ((pin.pinnedCommit as string) || "").slice(0, 7);
  // CI는 GITHUB_SHA를 준다. 로컬은 git에서 읽고, 실패하면 "dev".
  let sha = process.env.GITHUB_SHA?.slice(0, 7);
  if (!sha) {
    try {
      sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    } catch {
      sha = "dev";
    }
  }
  return { version, sha, date: new Date().toISOString().slice(0, 10), upstream, upstreamCommit };
}

export default defineConfig({
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo()),
  },
  // 배포 base 경로(빌드 때만). GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에 서빙되므로
  // 배포 시 DEPLOY_BASE="/komaforge-web/"를 준다(끝에 슬래시 필수). dev/로컬은 "/"(기본).
  // 주의: 이 base는 "에셋 URL"만 정한다. 라우터 basename은 자동 연동되지 않으므로
  // react-router.config.ts에서 같은 DEPLOY_BASE로 따로 맞춘다.
  base: process.env.DEPLOY_BASE || "/",
  server: {
    // 프리뷰/런타임이 지정한 PORT를 따른다(없으면 5173).
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    // 모든 인터페이스에 바인딩(IPv4+IPv6). 기본값은 환경에 따라 ::1(IPv6)에만 붙어서
    // 브라우저가 127.0.0.1로 접속하면 연결이 안 되는 문제가 있다.
    host: true,
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
