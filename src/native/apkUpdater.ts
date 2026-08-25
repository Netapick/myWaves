import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface ApkUpdaterPlugin {
  downloadAndInstall(options: { url: string }): Promise<void>
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: { percent: number }) => void,
  ): Promise<PluginListenerHandle>
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater')
