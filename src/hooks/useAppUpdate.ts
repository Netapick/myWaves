import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { isTauri } from '@tauri-apps/api/core'
import { ApkUpdater } from '../native/apkUpdater'
import { version as currentVersion } from '../../package.json'

const GITHUB_REPO = 'Netapick/myWaves'

export type AppUpdateState =
  | { status: 'idle' | 'checking' | 'none' }
  | { status: 'available'; version: string; install: () => Promise<void> }
  | { status: 'downloading'; progress: number }
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
 *   "installer" télécharge et lance l'installation directement depuis l'app
 *   (plugin natif `ApkUpdater`, voir android/.../UpdaterPlugin.java), sans
 *   passer par le navigateur.
 * - Web (dev) : pas de vérification, non demandé.
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
            setState({ status: 'downloading', progress: 0 })
            const listener = await ApkUpdater.addListener('downloadProgress', ({ percent }) => {
              setState({ status: 'downloading', progress: percent })
            })
            try {
              await ApkUpdater.downloadAndInstall({ url: apkAsset.browser_download_url })
            } catch (e) {
              const message =
                (e as Error).message === 'INSTALL_PERMISSION_REQUIRED'
                  ? "Autorisez l'installation d'applications inconnues pour myWaves, puis relancez la mise à jour."
                  : (e as Error).message
              setState({ status: 'error', message })
            } finally {
              await listener.remove()
            }
          },
        })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: (e as Error).message })
      }
    }

    // Simule le flux Android (indisponible en navigateur) pour vérifier visuellement
    // UpdateBanner en `npm run dev` — éliminé du build de production par Vite.
    const runDevSimulation = async () => {
      setState({ status: 'checking' })
      await new Promise((r) => setTimeout(r, 600))
      if (cancelled) return
      setState({
        status: 'available',
        version: '9.9.9-simulation',
        install: async () => {
          for (let percent = 0; percent <= 100; percent += 10) {
            if (cancelled) return
            setState({ status: 'downloading', progress: percent })
            await new Promise((r) => setTimeout(r, 250))
          }
          if (cancelled) return
          setState({ status: 'installing' })
          // Sur un vrai appareil Android, l'app passe ici la main à l'installeur système —
          // rien de plus à observer côté app. On revient à l'état initial pour pouvoir
          // rejouer la simulation, plutôt que de rester bloqué sur "Installation…".
          await new Promise((r) => setTimeout(r, 1500))
          if (cancelled) return
          setState({ status: 'none' })
        },
      })
    }

    if (isTauri()) {
      runTauriCheck()
    } else if (Capacitor.getPlatform() === 'android') {
      runAndroidCheck()
    } else if (import.meta.env.DEV) {
      runDevSimulation()
    } else {
      setState({ status: 'none' })
    }

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
