/// <reference types="vite/client" />

interface DesktopApi {
  isDesktop: true;
  saveFile(name: string, bytes: Uint8Array): Promise<{ ok: boolean; path?: string }>;
  openJson(): Promise<{ ok: boolean; content?: string }>;
}

interface Window {
  desktop?: DesktopApi;
  Capacitor?: unknown;
}
