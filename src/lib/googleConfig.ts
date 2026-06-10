// Google OAuth クライアントID。
// Google Cloud Console で発行した「ウェブアプリケーション」用クライアントIDをここに貼り付ける。
// （クライアントID自体は公開情報なのでリポジトリにコミットして問題ない。
//   悪用は「承認済みJavaScript生成元」の制限で防ぐ）
export const GOOGLE_CLIENT_ID = '830229552164-5n5ih74jmankuicvhdtetb552mmajm28.apps.googleusercontent.com'

// drive.file: アプリが作成したファイルのみアクセス可能。Drive上に見えるファイルとして保存される。
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

// Drive 上のバックアップファイル名
export const BACKUP_FILENAME = 'MofuLink-backup.json'

export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.startsWith('PASTE_') === false && GOOGLE_CLIENT_ID.length > 0
}
