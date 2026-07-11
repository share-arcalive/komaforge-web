// Node/headless 진입점 — react(zustand/react)와 engine(Pixi)을 import 하지 않는다.
//
// `.`(index.ts)는 `./react`를 재노출해 zustand의 react 훅 모듈을 끌어오고,
// `./engine`은 Pixi(WebGL)를 끌어온다. 서버(MCP/REST)·CLI 같은 브라우저 없는
// 환경은 이 진입점만 import 해 store + commands + assets 레지스트리 + 타입을 쓴다.
// store는 "zustand/vanilla"만 쓰므로 react가 필요 없다.
export * from "./types";
export * from "./store";
export * from "./assets";
export * from "./bundle";
export * from "./commands";
