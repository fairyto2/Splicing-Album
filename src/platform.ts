/**
 * Platform-agnostic file save/open. One API for desktop (Electron IPC),
 * mobile (Capacitor Filesystem) and plain web (browser download / file input).
 */

function getDesktop(): DesktopApi | undefined {
  return typeof window !== 'undefined' ? window.desktop : undefined;
}

export function isDesktop(): boolean {
  return !!getDesktop();
}

export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor;
}

function browserDownload(name: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<void> {
  const desktop = getDesktop();
  if (desktop) {
    await desktop.saveFile(name, bytes);
    return;
  }
  if (isCapacitor()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: name,
      data: bytesToBase64(bytes),
      directory: Directory.Documents,
      recursive: true,
    });
    return;
  }
  browserDownload(name, bytes, mime);
}

function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result ? String(reader.result) : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

export async function openJsonText(): Promise<string | null> {
  const desktop = getDesktop();
  if (desktop) {
    const res = await desktop.openJson();
    return res.ok && res.content ? res.content : null;
  }
  return pickTextFile('application/json');
}
