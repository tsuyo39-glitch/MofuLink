import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { petRepo } from '../../db/repository'
import type { Pet } from '../../db/schema'

interface PetContextValue {
  pets: Pet[]
  selectedPet: Pet | null
  selectPet: (pet: Pet) => void
  reload: () => Promise<void>
}

const PetContext = createContext<PetContextValue | null>(null)

export function PetProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([])
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)

  const reload = async () => {
    const all = await petRepo.getAll()
    setPets(all)
    setSelectedPet(prev => {
      if (!prev) return all[0] ?? null
      return all.find(p => p.id === prev.id) ?? all[0] ?? null
    })
  }

  useEffect(() => { reload() }, [])

  return (
    <PetContext.Provider value={{ pets, selectedPet, selectPet: setSelectedPet, reload }}>
      {children}
    </PetContext.Provider>
  )
}

export function usePet() {
  const ctx = useContext(PetContext)
  if (!ctx) throw new Error('PetProvider が必要です')
  return ctx
}
