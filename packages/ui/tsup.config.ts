import { defineConfig } from "tsup";

// design-sync(및 향후 외부 소비)용 dist 빌드. 앱(apps/web)은 exports "." = ./src/index.ts 로
// 여전히 소스(JIT)를 쓰므로 dev 영향 없음. react/radix 등은 external(소비자가 제공).
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  treeshake: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    /^@radix-ui\//,
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "lucide-react",
  ],
});
