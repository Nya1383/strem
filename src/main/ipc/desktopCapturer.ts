import { desktopCapturer, ipcMain } from 'electron';
import { IPC_CHANNELS, type DesktopSource } from '../../shared/ipc';

export function registerDesktopCapturerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DESKTOP_CAPTURER_GET_SOURCES, async (): Promise<DesktopSource[]> => {
    console.log('[IPC] desktopCapturer.getSources requested by renderer...');
    try {
      // Primary attempt with window icons
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });

      console.log(`[IPC] Successfully fetched ${sources.length} sources (screens/windows).`);
      return sources.map((source) => ({
        id: source.id,
        name: source.name || (source.id.startsWith('screen') ? 'Display Screen' : 'Application Window'),
        thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
        appIcon: source.appIcon ? source.appIcon.toDataURL() : undefined,
        display_id: source.display_id
      }));
    } catch (err) {
      console.warn('[IPC] Primary getSources failed, attempting fallback without fetchWindowIcons:', err);
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: { width: 320, height: 180 }
        });

        console.log(`[IPC Fallback] Fetched ${sources.length} sources.`);
        return sources.map((source) => ({
          id: source.id,
          name: source.name || (source.id.startsWith('screen') ? 'Display Screen' : 'Application Window'),
          thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
          display_id: source.display_id
        }));
      } catch (fallbackErr) {
        console.error('[IPC Error] Critical failure in desktopCapturer.getSources:', fallbackErr);
        // Fallback: minimal screen query
        try {
          const screenSources = await desktopCapturer.getSources({ types: ['screen'] });
          console.log(`[IPC Last-Resort] Fetched ${screenSources.length} screen sources.`);
          return screenSources.map((source) => ({
            id: source.id,
            name: source.name || 'Primary Display',
            thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
            display_id: source.display_id
          }));
        } catch (finalErr) {
          console.error('[IPC Fatal] All desktopCapturer methods failed:', finalErr);
          return [];
        }
      }
    }
  });
}
