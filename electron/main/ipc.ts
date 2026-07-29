import type { IpcMain } from 'electron';
import { dialog } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';

/**
 * Desktop-only file handling via native dialogs. The renderer never touches the
 * filesystem directly; it goes through the preload bridge → these handlers.
 */
export function registerIpc(ipcMain: IpcMain): void {
  ipcMain.handle('dialog:saveFile', async (_e, payload: { name: string; bytes: Uint8Array }) => {
    const res = await dialog.showSaveDialog({
      title: 'Export',
      defaultPath: payload.name,
    });
    if (res.canceled || !res.filePath) return { ok: false as const };
    await writeFile(res.filePath, Buffer.from(payload.bytes));
    return { ok: true as const, path: res.filePath };
  });

  ipcMain.handle('dialog:openJson', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Open',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || res.filePaths.length === 0) return { ok: false as const };
    const content = await readFile(res.filePaths[0], 'utf8');
    return { ok: true as const, content };
  });
}
