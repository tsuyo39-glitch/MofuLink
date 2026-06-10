import { useRef, useState, useEffect } from 'react'
import { exportAllData, importAllData } from '../db/repository'
import { uploadBackup, downloadBackup, requestToken, preloadGoogle } from '../lib/googleDrive'
import { isGoogleConfigured } from '../lib/googleConfig'

export function SettingsPage() {
  const [status, setStatus] = useState('')
  const [driveStatus, setDriveStatus] = useState('')
  const [driveBusy, setDriveBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  // 画面表示時にGoogle認証を温めておく（タップ時に即ポップアップを出すため）
  useEffect(() => {
    if (isGoogleConfigured()) {
      preloadGoogle().catch(() => { /* 失敗時はボタン押下時に再試行 */ })
    }
  }, [])

  const handleDriveBackup = async () => {
    setDriveBusy(true)
    setDriveStatus('Google にログイン中...')
    try {
      // ① タップ直後にまず認証（ここでポップアップ）→ ② 重い書き出し → ③ アップロード
      const token = await requestToken()
      setDriveStatus('Google Drive にバックアップ中...')
      const json = await exportAllData()
      const { updated } = await uploadBackup(json, token)
      setDriveStatus(updated ? 'バックアップを更新しました！' : 'バックアップを作成しました！')
    } catch (err) {
      setDriveStatus('バックアップに失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDriveBusy(false)
    }
  }

  const handleDriveRestore = async () => {
    if (!confirm('Google Drive のバックアップで、現在のデータをすべて上書きします。続けますか？')) return
    setDriveBusy(true)
    setDriveStatus('Google にログイン中...')
    try {
      const token = await requestToken()
      setDriveStatus('Google Drive から復元中...')
      const json = await downloadBackup(token)
      if (!json) {
        setDriveStatus('Drive にバックアップが見つかりませんでした')
        return
      }
      await importAllData(json)
      setDriveStatus('復元しました！ページをリロードしてください')
    } catch (err) {
      setDriveStatus('復元に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDriveBusy(false)
    }
  }

  const handleExport = async () => {
    setStatus('エクスポート中...')
    try {
      const json = await exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mofulink-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('エクスポート完了！')
    } catch {
      setStatus('エクスポートに失敗しました')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('現在のデータはすべて上書きされます。続けますか？')) return
    setStatus('インポート中...')
    try {
      const text = await file.text()
      await importAllData(text)
      setStatus('インポート完了！ページをリロードしてください')
    } catch {
      setStatus('インポートに失敗しました（ファイルが壊れているか形式が違います）')
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-white rounded-2xl shadow-md m-3">
        <h1 className="font-bold text-xl">データ管理</h1>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        {/* Google Drive バックアップ（Phase 2） */}
        <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-800">☁️ Google Drive バックアップ</h2>
          {isGoogleConfigured() ? (
            <>
              <p className="text-sm text-gray-500">
                自分の Google Drive に「MofuLink-backup.json」として保存します。機種変更後も、新しい端末で同じ Google アカウントにログインして「復元」すれば全データが戻ります。
              </p>
              <button
                onClick={handleDriveBackup}
                disabled={driveBusy}
                className="bg-sky-500 text-white py-3 rounded-xl font-medium disabled:opacity-50"
              >
                今すぐバックアップ
              </button>
              <button
                onClick={handleDriveRestore}
                disabled={driveBusy}
                className="border border-emerald-500 text-emerald-600 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                Drive から復元
              </button>
              {driveStatus && (
                <div className="bg-sky-50 border border-sky-200 text-sky-700 rounded-xl p-3 text-sm break-words">
                  {driveStatus}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
              Google Drive 連携はまだ設定されていません（クライアントID未設定）。設定後に利用できます。
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-800">バックアップ（エクスポート）</h2>
          <p className="text-sm text-gray-500">全データを JSON ファイルとしてダウンロードします。機種変更前などに保存しておいてください。</p>
          <button
            onClick={handleExport}
            className="bg-orange-500 text-white py-3 rounded-xl font-medium"
          >
            JSON をダウンロード
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3">
          <h2 className="font-semibold text-gray-800">復元（インポート）</h2>
          <p className="text-sm text-gray-500 text-red-500">⚠️ 現在のデータはすべて上書きされます</p>
          <p className="text-sm text-gray-500">バックアップした JSON ファイルを選択して復元します。</p>
          <button
            onClick={() => importRef.current?.click()}
            className="border border-sky-500 text-sky-600 py-3 rounded-xl font-medium"
          >
            JSON から復元
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>

        {status && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
            {status}
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-4">
          MofuLink v1.0.0 — 広告なし・課金なし
        </div>
      </div>
    </div>
  )
}
