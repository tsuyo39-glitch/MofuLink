import { useState, useRef, type FormEvent } from 'react'
import { petRepo } from '../../db/repository'
import { generateId, calcAge, calcDaysSince } from '../../lib/utils'
import { compressImage } from '../../lib/imageUtils'
import type { Pet } from '../../db/schema'

interface Props {
  pet?: Pet
  onSaved: () => void
  onCancel: () => void
}

export function PetForm({ pet, onSaved, onCancel }: Props) {
  const [name, setName] = useState(pet?.name ?? '')
  const [species, setSpecies] = useState(pet?.species ?? '犬')
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>(pet?.gender ?? 'unknown')
  const [birthday, setBirthday] = useState(pet?.birthday ?? '')
  const [adoptedDate, setAdoptedDate] = useState(pet?.adoptedDate ?? '')
  const [favoriteFood, setFavoriteFood] = useState(pet?.favoriteFood ?? '')
  const [memo, setMemo] = useState(pet?.memo ?? '')
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(pet?.photoBlob)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    pet?.photoBlob ? URL.createObjectURL(pet.photoBlob) : undefined
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImage(file)
      setPhotoBlob(compressed)
      setPhotoUrl(URL.createObjectURL(compressed))
    } catch (err) {
      setError('写真の処理に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const saved: Pet = {
        id: pet?.id ?? generateId(),
        name: name.trim(),
        species,
        gender,
        photoBlob,
        birthday: birthday || undefined,
        adoptedDate: adoptedDate || undefined,
        favoriteFood: favoriteFood || undefined,
        memo: memo || undefined,
        createdAt: pet?.createdAt ?? new Date().toISOString(),
      }
      await petRepo.save(saved)
      onSaved()
    } catch (err) {
      // 失敗してもボタンが「保存中...」のまま固まらないようにする
      setError('保存に失敗しました: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      {/* 写真 */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-28 h-28 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-orange-400 text-orange-500"
        >
          {photoUrl
            ? <img src={photoUrl} alt="写真" className="w-full h-full object-cover" />
            : (
              <>
                <span className="text-4xl leading-none font-light">＋</span>
                <span className="absolute bottom-5 text-xs font-medium">写真を追加</span>
              </>
            )
          }
        </button>
        {photoUrl && (
          <span className="text-xs text-orange-500">タップして写真を変更</span>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">名前 *</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="border rounded-xl px-3 py-2 text-base bg-white"
          placeholder="モフ"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">種類</span>
        <select
          value={species}
          onChange={e => setSpecies(e.target.value)}
          className="border rounded-xl px-3 py-2 text-base bg-white"
        >
          <option>犬</option>
          <option>猫</option>
          <option>うさぎ</option>
          <option>ハムスター</option>
          <option>鳥</option>
          <option>フェレット</option>
          <option>爬虫類</option>
          <option>魚</option>
          <option>その他</option>
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">性別</span>
        <div className="flex gap-2">
          {([
            { value: 'male', mark: '♂︎', label: 'オス' },
            { value: 'female', mark: '♀︎', label: 'メス' },
            { value: 'unknown', mark: '', label: '不明' },
          ] as const).map(({ value, mark, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border flex items-center justify-center gap-1 leading-none ${
                gender === value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {mark && <span className="leading-none">{mark}</span>}
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">生年月日</span>
        <input
          type="date"
          value={birthday}
          onChange={e => setBirthday(e.target.value)}
          className="border rounded-xl px-3 py-2 text-base bg-white"
        />
        {birthday && (
          <span className="text-xs text-emerald-600">{calcAge(birthday)}</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">迎えた日</span>
        <input
          type="date"
          value={adoptedDate}
          onChange={e => setAdoptedDate(e.target.value)}
          className="border rounded-xl px-3 py-2 text-base bg-white"
        />
        {adoptedDate && (
          <span className="text-xs text-emerald-600">迎えてから {calcDaysSince(adoptedDate)} 日</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">好きな食べ物</span>
        <input
          value={favoriteFood}
          onChange={e => setFavoriteFood(e.target.value)}
          className="border rounded-xl px-3 py-2 text-base bg-white"
          placeholder="ジャーキー"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">メモ</span>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={3}
          className="border rounded-xl px-3 py-2 text-base resize-none bg-white"
          placeholder="自由メモ"
        />
      </label>

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}
    </form>
  )
}
