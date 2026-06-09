import { useState } from 'react'
import { usePet } from '../features/pets/PetContext'
import { PetForm } from '../features/pets/PetForm'
import { petRepo } from '../db/repository'
import { calcAge, calcDaysSince } from '../lib/utils'
import type { Pet } from '../db/schema'

export function PetsPage() {
  const { pets, selectedPet, selectPet, reload } = usePet()
  const [showForm, setShowForm] = useState(false)
  const [editPet, setEditPet] = useState<Pet | undefined>()

  const openAdd = () => { setEditPet(undefined); setShowForm(true) }
  const openEdit = (pet: Pet) => { setEditPet(pet); setShowForm(true) }
  const closeForm = () => setShowForm(false)

  const handleSaved = async () => {
    await reload()
    setShowForm(false)
  }

  const handleDelete = async (pet: Pet) => {
    if (!confirm(`${pet.name} を削除しますか？`)) return
    await petRepo.delete(pet.id)
    await reload()
  }

  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 bg-white rounded-2xl shadow-md m-3">
          <span className="font-semibold text-lg">{editPet ? 'ペットを編集' : 'ペットを追加'}</span>
        </div>
        <div className="flex-1 overflow-auto">
          <PetForm pet={editPet} onSaved={handleSaved} onCancel={closeForm} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-md m-3">
        <h1 className="font-bold text-xl">ペット一覧</h1>
        <button
          onClick={openAdd}
          className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium"
        >
          ＋追加
        </button>
      </div>

      {pets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
          <span className="text-6xl">🐾</span>
          <p className="text-center">まだペットが登録されていません<br />追加ボタンから登録してください</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          {pets.map(pet => (
            <PetCard
              key={pet.id}
              pet={pet}
              selected={selectedPet?.id === pet.id}
              onSelect={() => selectPet(pet)}
              onEdit={() => openEdit(pet)}
              onDelete={() => handleDelete(pet)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PetCard({
  pet,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  pet: Pet
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const photoUrl = pet.photoBlob ? URL.createObjectURL(pet.photoBlob) : null

  return (
    <div
      className={`bg-white rounded-2xl p-4 shadow-md border-2 ${selected ? 'border-orange-400' : 'border-transparent'}`}
    >
      <div className="flex items-center gap-3" onClick={onSelect}>
        <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {photoUrl
            ? <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" />
            : <span className="text-3xl">🐾</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">{pet.name}</span>
            {pet.gender === 'male' && <span className="text-base text-blue-500" title="オス">♂︎</span>}
            {pet.gender === 'female' && <span className="text-base text-pink-500" title="メス">♀︎</span>}
            {selected && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">選択中</span>}
          </div>
          <div className="text-sm text-gray-500">{pet.species}</div>
          {pet.birthday && (
            <div className="text-sm text-emerald-600 font-medium">{calcAge(pet.birthday)}</div>
          )}
          {pet.adoptedDate && (
            <div className="text-xs text-gray-400">迎えてから {calcDaysSince(pet.adoptedDate)} 日</div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={onEdit} className="text-sm text-blue-500 px-3 py-1 rounded-lg border border-blue-200">
          編集
        </button>
        <button onClick={onDelete} className="text-sm text-red-400 px-3 py-1 rounded-lg border border-red-200">
          削除
        </button>
      </div>
    </div>
  )
}
