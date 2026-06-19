import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>KomaForge (Web)</title>
        <link rel="icon" type="image/svg+xml" href={`${import.meta.env.BASE_URL}favicon.svg`} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// SPA 프리렌더(빌드 시 index.html)는 이 로딩 화면만 출력하고, 실제 라우트는 클라이언트에서 렌더한다.
// → 정적 HTML과 클라이언트 첫 렌더가 항상 일치해 React #418 하이드레이션 불일치가 발생하지 않는다.
export function HydrateFallback() {
  return (
    <main className="grid h-full place-items-center bg-bg text-sm text-ink-faint">KomaForge 로딩 중…</main>
  );
}
