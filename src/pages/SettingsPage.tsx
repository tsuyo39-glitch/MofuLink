import { useRef, useState } from 'react'
import { exportAllData, importAllData } from '../db/repository'

export function SettingsPage() {
  const [status, setStatus] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

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
