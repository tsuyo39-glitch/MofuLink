import { GOOGLE_CLIENT_ID, GOOGLE_SCOPE, BACKUP_FILENAME } from './googleConfig'

// Google Identity Services (GIS) の型は最小限だけ定義する
interface TokenResponse {
  access_token: string
  error?: string
  expires_in?: number
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: TokenResponse) => void
          }) => TokenClient
        }
      }
    }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'

// GISスクリプトを一度だけ読み込む
let gisLoadPromise: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google認証スクリプトの読み込みに失敗しました'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

// アクセストークンをメモリに保持（タブを閉じるまで有効。期限切れ時は再取得）
let cachedToken: { value: string; expiresAt: number } | null = null

export function isSignedIn(): boolean {
  return !!cachedToken && cachedToken.expiresAt > Date.now()
}

export function signOut(): void {
  cachedToken = null
}

// アクセストークンを取得する（必要ならGoogleのログイン/同意画面を出す）
export async function getAccessToken(interactive = true): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value
  }
  await loadGis()
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google認証を初期化できませんでした')
  }
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error('Googleの認証に失敗しました: ' + (resp.error ?? 'unknown')))
          return
        }
        cachedToken = {
          value: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
        }
        resolve(resp.access_token)
      },
    })
    // interactive=false のときは同意済みなら無音で取得を試みる
    client.requestAccessToken({ prompt: interactive ? '' : 'none' })
  })
}

// バックアップファイルのIDを探す（drive.file スコープなので自分が作ったファイルのみ見える）
async function findBackupFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Driveのファイル検索に失敗しました (' + res.status + ')')
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// JSON文字列をDriveにアップロード（既存があれば上書き、なければ新規作成）
export async function uploadBackup(json: string): Promise<{ updated: boolean }> {
  const token = await getAccessToken()
  const existingId = await findBackupFileId(token)

  const metadata = {
    name: BACKUP_FILENAME,
    mimeType: 'application/json',
  }
  const boundary = 'mofulink_boundary_' + Math.random().toString(16).slice(2)
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    json +
    `\r\n--${boundary}--`

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error('Driveへのアップロードに失敗しました (' + res.status + ')')
  return { updated: !!existingId }
}

// Driveからバックアップ(JSON文字列)をダウンロードする。無ければ null。
export async function downloadBackup(): Promise<string | null> {
  const token = await getAccessToken()
  const id = await findBackupFileId(token)
  if (!id) return null
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Driveからのダウンロードに失敗しました (' + res.status + ')')
  return res.text()
}
