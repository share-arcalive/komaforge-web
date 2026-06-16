import { useEffect, useRef, useState } from "react";
import {
  copySelection,
  cutSelection,
  deleteSelection,
  pasteClipboard,
  redo,
  toggleSelectedLock,
  undo,
} from "@repo/editor";
import { ClientOnly } from "../components/ClientOnly";
import { DockWorkspace } from "../components/DockWorkspace";
import { MenuBar } from "../components/MenuBar";
import { ShortcutsDialog } from "../components/ShortcutsDialog";
import { loadFromFile, saveBundleToFile, startAutosave } from "../lib/persistence";
import { installShortcuts } from "../lib/shortcuts";
import { resetLayout } from "../lib/workspace";

export function meta() {
  return [{ title: "my-webtoon-maker" }];
}

export default function EditorRoute() {
  const openRef = useRef<HTMLInputElement>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => startAutosave(), []);

  // 전역 키보드 단축키 설치(설정은 localStorage에 저장).
  useEffect(
    () =>
      installShortcuts({
        open: () => openRef.current?.click(),
        save: saveBundleToFile,
        undo,
        redo,
        cut: cutSelection,
        copy: copySelection,
        paste: pasteClipboard,
        delete: deleteSelection,
        lock: toggleSelectedLock,
      }),
    [],
  );

  return (
    <main className="flex h-full flex-col bg-bg text-ink">
      <input
        ref={openRef}
        type="file"
        accept=".json,.kfjson,.webtoon,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await loadFromFile(file);
          e.target.value = "";
        }}
      />
      <MenuBar
        onOpen={() => openRef.current?.click()}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onResetLayout={resetLayout}
      />
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <ClientOnly
            fallback={
              <div className="grid h-full place-items-center text-sm text-ink-faint">
                에디터 로딩 중…
              </div>
            }
          >
            {() => <DockWorkspace />}
          </ClientOnly>
        </div>
      </div>
    </main>
  );
}
