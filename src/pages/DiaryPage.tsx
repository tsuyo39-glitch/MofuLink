import { useState, useEffect, useRef } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { usePet } from '../features/pets/PetContext'
import { diaryRepo } from '../db/repository'
import { generateId, formatDate } from '../lib/utils'
import { compressImage } from '../lib/imageUtils'
import type { DiaryEntry } from '../db/schema'

type View = 'calendar' | 'timeline'

export function DiaryPage() {
  const { selectedPet } = usePet()
  const [view, setView] = useState<View>('calendar')
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<DiaryEntry | undefined>()
  const [viewPhoto, setViewPhoto] = useState<string | null>(null)

  const load = async () => {
    if (!selectedPet) return
    const all = await diaryRepo.getByPet(selectedPet.id)
    setEntries(all)
    const dates = await diaryRepo.getDatesWithEntries(selectedPet.id)
    setDatesWithEntries(new Set(dates))
  }

  useEffect(() => { load() }, [selectedPet])

  const openAdd = (date?: string) => {
    setEditEntry(undefined)
    setSelectedDate(date ?? format(new Date(), 'yyyy-MM-dd'))
    setShowForm(true)
  }
  const openEdit = (entry: DiaryEntry) => { setEditEntry(entry); setShowForm(true) }

  const handleSaved = async () => {
    await load()
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この日記を削除しますか？')) return
    await diaryRepo.delete(id)
    await load()
  }

  if (!selectedPet) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-2">
        <span className="text-5xl">🐾</span>
        <p>ペットを登録してください</p>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 bg-white rounded-2xl shadow-md m-3">
          <span className="font-semibold text-lg">{editEntry ? '日記を編集' : '日記を書く'}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <DiaryForm
            petId={selectedPet.id}
            date={selectedDate}
            entry={editEntry}
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-md m-3">
        <h1 className="font-bold text-xl">日記</h1>
        <button
          onClick={() => openAdd()}
          className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium"
        >
          ＋追加
        </button>
      </div>

      {/* 表示切替 */}
      <div className="flex bg-white rounded-2xl shadow-md mx-3 overflow-hidden">
        <button
          onClick={() => setView('calendar')}
          className={`flex-1 py-2 text-sm font-medium ${view === 'calendar' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-gray-400'}`}
        >
          カレンダー
        </button>
        <button
          onClick={() => setView('timeline')}
          className={`flex-1 py-2 text-sm font-medium ${view === 'timeline' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-gray-400'}`}
        >
          タイムライン
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {view === 'calendar' ? (
          <CalendarView
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            datesWithEntries={datesWithEntries}
            entries={entries}
            onEdit={openEdit}
            onDelete={handleDelete}
            onViewPhoto={setViewPhoto}
          />
        ) : (
          <TimelineView
            entries={entries}
            onEdit={openEdit}
            onDelete={handleDelete}
            onViewPhoto={setViewPhoto}
          />
        )}
      </div>

      {/* 写真拡大 */}
      {viewPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setViewPhoto(null)}
        >
          <img src={viewPhoto} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  )
}

function CalendarView({
  currentMonth,
  setCurrentMonth,
  datesWithEntries,
  entries,
  onEdit,
  onDelete,
  onViewPhoto,
}: {
  currentMonth: Date
  setCurrentMonth: (d: Date) => void
  datesWithEntries: Set<string>
  entries: DiaryEntry[]
  onEdit: (entry: DiaryEntry) => void
  onDelete: (id: string) => void
  onViewPhoto: (url: string) => void
}) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const firstDow = getDay(days[0])
  const dayEntries = entries.filter(e => e.date === selectedDate)

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  return (
    <div>
      {/* カレンダー（月ナビ＋曜日＋グリッドを1つの角丸カードに） */}
      <div className="m-3 bg-white rounded-2xl shadow-md overflow-hidden">
      {/* 月ナビ */}
      <div className="flex items-center justify-between p-3 border-b">
        <button onClick={prevMonth} className="p-2 text-gray-500">‹</button>
        <span className="font-medium">{format(currentMonth, 'yyyy年M月', { locale: ja })}</span>
        <button onClick={nextMonth} className="p-2 text-gray-500">›</button>
      </div>

      {/* 曜日ヘッダ */}
      <div className="grid grid-cols-7 border-b">
        {['日', '月', '火', '水', '木', '金', '土'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 pb-2">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasEntry = datesWithEntries.has(dateStr)
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="flex flex-col items-center py-1 gap-0.5"
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm
                ${isSelected ? 'bg-orange-500 text-white' : isToday ? 'border border-sky-500 text-sky-600' : 'text-gray-700'}`}>
                {day.getDate()}
              </span>
              {hasEntry && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          )
        })}
      </div>
      </div>

      {/* 選択日の記録 */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{formatDate(selectedDate)}</span>
        </div>
        {dayEntries.map(e => (
          <EntryCard key={e.id} entry={e} onEdit={onEdit} onDelete={onDelete} onViewPhoto={onViewPhoto} />
        ))}
        {dayEntries.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">この日の記録はありません</p>
        )}
      </div>
    </div>
  )
}

function TimelineView({
  entries,
  onEdit,
  onDelete,
  onViewPhoto,
}: {
  entries: DiaryEntry[]
  onEdit: (entry: DiaryEntry) => void
  onDelete: (id: string) => void
  onViewPhoto: (url: string) => void
}) {
  if (entries.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-12">日記がまだありません</p>
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      {entries.map(e => (
        <div key={e.id}>
          <div className="text-xs text-gray-400 mb-1">{formatDate(e.date)}</div>
          <EntryCard entry={e} onEdit={onEdit} onDelete={onDelete} onViewPhoto={onViewPhoto} />
        </div>
      ))}
    </div>
  )
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
  onViewPhoto,
}: {
  entry: DiaryEntry
  onEdit: (e: DiaryEntry) => void
  onDelete: (id: string) => void
  onViewPhoto: (url: string) => void
}) {
  const photoUrls = entry.photoBlobs.map(b => URL.createObjectURL(b))

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col gap-2">
      {entry.body ? <p className="text-sm whitespace-pre-wrap">{entry.body}</p> : null}
      {photoUrls.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photoUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="w-20 h-20 object-cover rounded-xl"
              onClick={() => onViewPhoto(url)}
            />
          ))}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={() => onEdit(entry)} className="text-xs text-blue-500 px-2 py-1 border border-blue-200 rounded-lg">編集</button>
        <button onClick={() => onDelete(entry.id)} className="text-xs text-red-400 px-2 py-1 border border-red-200 rounded-lg">削除</button>
      </div>
    </div>
  )
}

function DiaryForm({
  petId,
  date,
  entry,
  onSaved,
  onCancel,
}: {
  petId: string
  date: string
  entry?: DiaryEntry
  onSaved: () => void
  onCancel: () => void
}) {
  const [body, setBody] = useState(entry?.body ?? '')
  const [date_, setDate] = useState(entry?.date ?? date)
  const [photos, setPhotos] = useState<Blob[]>(entry?.photoBlobs ?? [])
  const [photoUrls, setPhotoUrls] = useState<string[]>((entry?.photoBlobs ?? []).map(b => URL.createObjectURL(b)))
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const compressed = await Promise.all(files.map(compressImage))
    setPhotos(prev => [...prev, ...compressed])
    setPhotoUrls(prev => [...prev, ...compressed.map(b => URL.createObjectURL(b))])
  }

  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_, j) => j !== i))
    setPhotoUrls(prev => prev.filter((_, j) => j !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() && photos.length === 0) return
    setSaving(true)
    const saved: DiaryEntry = {
      id: entry?.id ?? generateId(),
      petId,
      date: date_,
      body: body.trim(),
      photoBlobs: photos,
      createdAt: entry?.createdAt ?? new Date().toISOString(),
    }
    await diaryRepo.save(saved)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">日付</span>
        <input
          type="date"
          value={date_}
          onChange={e => setDate(e.target.value)}
          className="border rounded-xl px-3 py-2 text-base bg-white"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">本文</span>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={5}
          className="border rounded-xl px-3 py-2 text-base resize-none bg-white"
          placeholder="今日のできごとを書いてね"
        />
      </label>

      {/* 写真 */}
      <div>
        <span className="text-sm font-medium text-gray-600 block mb-2">写真</span>
        <div className="flex gap-2 flex-wrap">
          {photoUrls.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >✕</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-full bg-white border-2 border-orange-400 flex items-center justify-center text-orange-500 text-3xl font-light"
          >＋</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
      </div>

      <div className="flex gap-3 mt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium">
          キャンセル
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium disabled:opacity-50">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
