import Dexie, { type Table } from 'dexie'

export interface Pet {
  id: string
  name: string
  species: string
  gender?: 'male' | 'female' | 'unknown'
  photoBlob?: Blob
  birthday?: string
  adoptedDate?: string
  favoriteFood?: string
  memo?: string
  createdAt: string
}

export interface DiaryEntry {
  id: string
  petId: string
  date: string
  body: string
  photoBlobs: Blob[]
  createdAt: string
}

export interface Expense {
  id: string
  petId: string
  date: string
  category: string
  amount: number
  memo?: string
  createdAt: string
}

export interface ExpenseCategory {
  id: string
  name: string
  color: string
  order: number
}

class MofuLinkDB extends Dexie {
  pets!: Table<Pet>
  diaryEntries!: Table<DiaryEntry>
  expenses!: Table<Expense>
  expenseCategories!: Table<ExpenseCategory>

  constructor() {
    super('MofuLinkDB')
    this.version(1).stores({
      pets: 'id, createdAt',
      diaryEntries: 'id, petId, date, createdAt',
      expenses: 'id, petId, date, category, createdAt',
      expenseCategories: 'id, order',
    })
  }
}

export const db = new MofuLinkDB()

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: '2', name: 'ごはん', color: '#f97316', order: 1 },
  { id: '3', name: 'おやつ', color: '#eab308', order: 2 },
  { id: '1', name: '病院', color: '#ef4444', order: 3 },
  { id: '4', name: 'トイレ用品', color: '#22c55e', order: 4 },
  { id: '5', name: 'トリミング', color: '#3b82f6', order: 5 },
  { id: '6', name: '保険', color: '#8b5cf6', order: 6 },
  { id: '7', name: 'おもちゃ', color: '#ec4899', order: 7 },
  { id: '99', name: 'その他', color: '#6b7280', order: 99 },
]

// 以前のバージョンで自動追加していたが、今は既定から外したカテゴリ名
const DEPRECATED_DEFAULT_NAMES = [
  '日用品', '医薬品・サプリ', 'ワクチン・予防', 'ケア用品', 'ペットホテル', '交通費', '服・グッズ',
]

db.on('ready', async () => {
  const existing = await db.expenseCategories.toArray()

  // 初回: デフォルトを丸ごと投入
  if (existing.length === 0) {
    await db.expenseCategories.bulkAdd(DEFAULT_CATEGORIES)
    return
  }

  // 既存ユーザー向け移行処理
  // 1) 旧「餌」カテゴリを「ごはん」にリネーム（支出データも追従）
  const old = existing.find(c => c.name === '餌')
  if (old) {
    await db.expenseCategories.update(old.id, { name: 'ごはん' })
    const eatExpenses = await db.expenses.where('category').equals('餌').toArray()
    await Promise.all(eatExpenses.map(e => db.expenses.update(e.id, { category: 'ごはん' })))
  }

  // 2) 既定カテゴリの並び順を新しい順序に合わせる（ごはんを先頭、その他を最後 等）
  const orderByName = new Map(DEFAULT_CATEGORIES.map(c => [c.name, c.order]))
  const current = await db.expenseCategories.toArray()
  await Promise.all(
    current
      .filter(c => orderByName.has(c.name) && c.order !== orderByName.get(c.name))
      .map(c => db.expenseCategories.update(c.id, { order: orderByName.get(c.name)! }))
  )

  // 3) 既定から外したカテゴリのうち、支出で使われていないものは削除する
  for (const cat of current) {
    if (!DEPRECATED_DEFAULT_NAMES.includes(cat.name)) continue
    const used = await db.expenses.where('category').equals(cat.name).count()
    if (used === 0) {
      await db.expenseCategories.delete(cat.id)
    }
  }
})
