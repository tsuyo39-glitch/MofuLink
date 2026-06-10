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

// 事前生成しておくトークンクライアントと、要求中の解決関数
let tokenClient: TokenClient | null = null
let pendingResolve: ((token: string) => void) | null = null
let pendingReject: ((err: Error) => void) | null = null
let cachedToken: { value: string; expiresAt: number } | null = null

// アプリ起動時（または画面表示時）に呼んでGISを温めておく。
// これにより、タップ時に await を挟まず即座に認証ポップアップを出せる（iOS Safari対策）。
export async function preloadGoogle(): Promise<void> {
  await loadGis()
  if (tokenClient) return
  if (!window.google?.accounts?.oauth2) throw new Error('Google認証を初期化できませんでした')
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: GOOGLE_SCOPE,
    callback: (resp) => {
      if (resp.error || !resp.access_token) {
        pendingReject?.(new Error('Googleの認証に失敗しました: ' + (resp.error ?? 'unknown')))
      } else {
        cachedToken = { value: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 }
        pendingResolve?.(resp.access_token)
      }
      pendingResolve = null
      pendingReject = null
    },
  })
}

export function isSignedIn(): boolean {
  return !!cachedToken && cachedToken.expiresAt > Date.now()
}

export function signOut(): void {
  cachedToken = null
}

// アクセストークンを取得する。
// 重要: タップ直後に最初に呼ぶこと。new Promise の実行時に requestAccessToken を
// 同期的に呼ぶため、ユーザー操作の文脈が保たれ、iOSでもポップアップがブロックされない。
export function requestToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return Promise.resolve(cachedToken.value)
  }
  if (!tokenClient) {
    return Promise.reject(new Error('Google認証の準備中です。数秒後にもう一度お試しください。'))
  }
  return new Promise<string>((resolve, reject) => {
    pendingResolve = resolve
    pendingReject = reject
    tokenClient!.requestAccessToken() // 同期的に呼び出してポップアップを開く
  })
}

// バックアップファイルのIDを探す（drive.file スコープなので自分が作ったファイルのみ見える）
// Google APIのエラー本文から理由を取り出して読みやすくする
async function describeError(res: Response): Promise<string> {
  let detail = ''
  try {
    const body = await res.json()
    const reason = body?.error?.errors?.[0]?.reason
    const message = body?.error?.message
    detail = [reason, message].filter(Boolean).join(': ')
  } catch {
    detail = ''
  }
  return `${res.status}${detail ? ' ' + detail : ''}`
}

async function findBackupFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error('Driveのファイル検索に失敗しました (' + (await describeError(res)) + ')')
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// JSON文字列をDriveにアップロード（既存があれば上書き、なければ新規作成）
export async function uploadBackup(json: string, token: string): Promise<{ updated: boolean }> {
  const existingId = await findBackupFileId(token)

  const metadata = { name: BACKUP_FILENAME, mimeType: 'application/json' }
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
  if (!res.ok) throw new Error('Driveへのアップロードに失敗しました (' + (await describeError(res)) + ')')
  return { updated: !!existingId }
}

// Driveからバックアップ(JSON文字列)をダウンロードする。無ければ null。
export async function downloadBackup(token: string): Promise<string | null> {
  const id = await findBackupFileId(token)
  if (!id) return null
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Driveからのダウンロードに失敗しました (' + (await describeError(res)) + ')')
  return res.text()
}
