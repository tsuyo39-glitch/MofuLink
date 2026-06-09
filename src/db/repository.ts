import { db, type Pet, type DiaryEntry, type Expense, type ExpenseCategory } from './schema'

// ペット
export const petRepo = {
  async getAll(): Promise<Pet[]> {
    return db.pets.orderBy('createdAt').toArray()
  },
  async get(id: string): Promise<Pet | undefined> {
    return db.pets.get(id)
  },
  async save(pet: Pet): Promise<void> {
    await db.pets.put(pet)
  },
  async delete(id: string): Promise<void> {
    await db.pets.delete(id)
  },
}

// 日記
export const diaryRepo = {
  async getByPet(petId: string): Promise<DiaryEntry[]> {
    return db.diaryEntries.where('petId').equals(petId).sortBy('date').then(arr => arr.reverse())
  },
  async getByDate(petId: string, date: string): Promise<DiaryEntry[]> {
    return db.diaryEntries.where({ petId, date }).toArray()
  },
  async getDatesWithEntries(petId: string): Promise<string[]> {
    const entries = await db.diaryEntries.where('petId').equals(petId).toArray()
    return [...new Set(entries.map(e => e.date))]
  },
  async save(entry: DiaryEntry): Promise<void> {
    await db.diaryEntries.put(entry)
  },
  async delete(id: string): Promise<void> {
    await db.diaryEntries.delete(id)
  },
}

// 支出
export const expenseRepo = {
  async getByPet(petId: string): Promise<Expense[]> {
    return db.expenses.where('petId').equals(petId).sortBy('date').then(arr => arr.reverse())
  },
  async getByMonth(petId: string, yearMonth: string): Promise<Expense[]> {
    const all = await db.expenses.where('petId').equals(petId).toArray()
    return all.filter(e => e.date.startsWith(yearMonth)).sort((a, b) => b.date.localeCompare(a.date))
  },
  async save(expense: Expense): Promise<void> {
    await db.expenses.put(expense)
  },
  async delete(id: string): Promise<void> {
    await db.expenses.delete(id)
  },
}

// カテゴリ
export const categoryRepo = {
  async getAll(): Promise<ExpenseCategory[]> {
    return db.expenseCategories.orderBy('order').toArray()
  },
  async save(cat: ExpenseCategory): Promise<void> {
    await db.expenseCategories.put(cat)
  },
  async delete(id: string): Promise<void> {
    await db.expenseCategories.delete(id)
  },
}

// エクスポート/インポート
export async function exportAllData() {
  const [pets, diaryEntries, expenses, expenseCategories] = await Promise.all([
    db.pets.toArray(),
    db.diaryEntries.toArray(),
    db.expenses.toArray(),
    db.expenseCategories.toArray(),
  ])

  // Blob → base64 変換
  async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  const petsExport = await Promise.all(
    pets.map(async (pet) => ({
      ...pet,
      photoBlob: pet.photoBlob ? await blobToBase64(pet.photoBlob) : undefined,
    }))
  )

  const diaryExport = await Promise.all(
    diaryEntries.map(async (entry) => ({
      ...entry,
      photoBlobs: await Promise.all(entry.photoBlobs.map(blobToBase64)),
    }))
  )

  return JSON.stringify({ pets: petsExport, diaryEntries: diaryExport, expenses, expenseCategories, exportedAt: new Date().toISOString() })
}

export async function importAllData(jsonStr: string) {
  const data = JSON.parse(jsonStr)

  function base64ToBlob(dataUrl: string): Blob {
    const [header, b64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }

  const pets: Pet[] = (data.pets ?? []).map((p: { photoBlob?: string; [k: string]: unknown }) => ({
    ...p,
    photoBlob: p.photoBlob ? base64ToBlob(p.photoBlob) : undefined,
  }))

  const diaryEntries: DiaryEntry[] = (data.diaryEntries ?? []).map((e: { photoBlobs?: string[]; [k: string]: unknown }) => ({
    ...e,
    photoBlobs: (e.photoBlobs ?? []).map(base64ToBlob),
  }))

  await db.transaction('rw', db.pets, db.diaryEntries, db.expenses, db.expenseCategories, async () => {
    await db.pets.clear()
    await db.diaryEntries.clear()
    await db.expenses.clear()
    await db.expenseCategories.clear()
    await db.pets.bulkAdd(pets)
    await db.diaryEntries.bulkAdd(diaryEntries)
    await db.expenses.bulkAdd(data.expenses ?? [])
    await db.expenseCategories.bulkAdd(data.expenseCategories ?? [])
  })
}
