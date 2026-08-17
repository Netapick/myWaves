import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { isTauri } from '@tauri-apps/api/core'
import { version as currentVersion } from '../../package.json'

const GITHUB_REPO = 'Netapick/myWaves'

export type AppUpdateState =
  | { status: 'idle' | 'checking' | 'none' }
  | { status: 'available'; version: string; install: () => Promise<void> }
  | { status: 'installing' }
  | { status: 'error'; message: string }

interface GithubRelease {
  tag_name: string
  assets: { name: string; browser_download_url: string }[]
}

function isNewerVersion(remote: string, local: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const [rMajor, rMinor, rPatch] = parse(remote)
  const [lMajor, lMinor, lPatch] = parse(local)
  if (rMajor !== lMajor) return rMajor > lMajor
  if (rMinor !== lMinor) return rMinor > lMinor
  return rPatch > lPatch
}

/**
 * myWaves n'étant distribuée ni sur Play Store ni sur Microsoft Store, chaque
 * plateforme doit vérifier elle-même l'existence d'une mise à jour :
 * - Tauri : le plugin officiel `@tauri-apps/plugin-updater` compare avec le
 *   manifeste `latest.json` publié sur la release GitHub (voir tauri.conf.json).
 * - Android (APK) : pas d'équivalent natif hors Play Store — on interroge
 *   l'API GitHub Releases et on compare nous-mêmes les numéros de version ;
 *   "installer" ouvre simplement l'APK dans le navigateur, Android prend le
 *   relais via son gestionnaire de téléchargements habituel.
 * - Electron et web (dev) : pas de vérification, non demandé.
 */
export function useAppUpdate(): AppUpdateState {
  const [state, setState] = useState<AppUpdateState>({ status: 'idle' })

  useEffect(() => {
    let cancelled = false

    const runTauriCheck = async () => {
      setState({ status: 'checking' })
      try {
        const { check } = await import('@tauri-apps/plugin-updater')
        const update = await check()
        if (cancelled) return
        if (!update) {
          setState({ status: 'none' })
          return
        }
        setState({
          status: 'available',
          version: update.version,
          install: async () => {
            setState({ status: 'installing' })
            try {
              await update.downloadAndInstall()
              const { relaunch } = await import('@tauri-apps/plugin-process')
              await relaunch()
            } catch (e) {
              setState({ status: 'error', message: (e as Error).message })
            }
          },
        })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: (e as Error).message })
      }
    }

    const runAndroidCheck = async () => {
      setState({ status: 'checking' })
      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
        if (!response.ok) throw new Error(`GitHub API ${response.status}`)
        const data = (await response.json()) as GithubRelease
        if (cancelled) return
        if (!isNewerVersion(data.tag_name, currentVersion)) {
          setState({ status: 'none' })
          return
        }
        const apkAsset = data.assets.find((a) => a.name.endsWith('.apk'))
        if (!apkAsset) {
          setState({ status: 'none' })
          return
        }
        setState({
          status: 'available',
          version: data.tag_name.replace(/^v/, ''),
          install: async () => {
            await Browser.open({ url: apkAsset.browser_download_url })
          },
        })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: (e as Error).message })
      }
    }

    if (isTauri()) {
      runTauriCheck()
    } else if (Capacitor.getPlatform() === 'android') {
      runAndroidCheck()
    } else {
      setState({ status: 'none' })
    }

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
