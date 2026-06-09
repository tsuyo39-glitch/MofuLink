import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { usePet } from '../features/pets/PetContext'
import { expenseRepo, categoryRepo } from '../db/repository'
import { generateId, formatDate, formatAmount, toYearMonth, formatMonthYear } from '../lib/utils'
import type { Expense, ExpenseCategory } from '../db/schema'

type Tab = 'list' | 'chart'

export function ExpensesPage() {
  const { selectedPet } = usePet()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [tab, setTab] = useState<Tab>('list')
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | undefined>()
  const [currentMonth, setCurrentMonth] = useState(toYearMonth(format(new Date(), 'yyyy-MM-dd')))

  const load = async () => {
    if (!selectedPet) return
    const [exps, cats] = await Promise.all([
      expenseRepo.getByMonth(selectedPet.id, currentMonth),
      categoryRepo.getAll(),
    ])
    setExpenses(exps)
    setCategories(cats)
  }

  useEffect(() => { load() }, [selectedPet, currentMonth])

  const catMap = Object.fromEntries(categories.map(c => [c.name, c]))

  const openAdd = () => { setEditExpense(undefined); setShowForm(true) }
  const openEdit = (e: Expense) => { setEditExpense(e); setShowForm(true) }

  const handleSaved = async () => {
    await load()
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この支出を削除しますか？')) return
    await expenseRepo.delete(id)
    await load()
  }

  const prevMonth = () => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(toYearMonth(format(d, 'yyyy-MM-dd')))
  }
  const nextMonth = () => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(toYearMonth(format(d, 'yyyy-MM-dd')))
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

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
        <div className="p-4 bg-white rounded-2xl shadow-md m-3 font-semibold text-lg">
          {editExpense ? '支出を編集' : '支出を追加'}
        </div>
        <div className="flex-1 overflow-auto">
          <ExpenseForm
            petId={selectedPet.id}
            expense={editExpense}
            categories={categories}
            defaultMonth={currentMonth}
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
        <h1 className="font-bold text-xl">支出</h1>
        <button onClick={openAdd} className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium">
          ＋追加
        </button>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center justify-between p-3 bg-white rounded-2xl shadow-md mx-3">
        <button onClick={prevMonth} className="p-2 text-gray-500">‹</button>
        <div className="text-center">
          <div className="font-medium">{formatMonthYear(currentMonth)}</div>
          <div className="text-sm text-orange-500 font-bold">合計 {formatAmount(total)}</div>
        </div>
        <button onClick={nextMonth} className="p-2 text-gray-500">›</button>
      </div>

      {/* タブ */}
      <div className="flex bg-white rounded-2xl shadow-md mx-3 mt-3 overflow-hidden">
        <button
          onClick={() => setTab('list')}
          className={`flex-1 py-2 text-sm font-medium ${tab === 'list' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-gray-400'}`}
        >
          一覧
        </button>
        <button
          onClick={() => setTab('chart')}
          className={`flex-1 py-2 text-sm font-medium ${tab === 'chart' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-gray-400'}`}
        >
          グラフ
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'list' ? (
          <ExpenseList expenses={expenses} catMap={catMap} onEdit={openEdit} onDelete={handleDelete} />
        ) : (
          <ExpenseChart expenses={expenses} categories={categories} petId={selectedPet.id} />
        )}
      </div>
    </div>
  )
}

function ExpenseList({
  expenses,
  catMap,
  onEdit,
  onDelete,
}: {
  expenses: Expense[]
  catMap: Record<string, ExpenseCategory>
  onEdit: (e: Expense) => void
  onDelete: (id: string) => void
}) {
  if (expenses.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-12">この月の支出はありません</p>
  }
  return (
    <div className="flex flex-col gap-2 p-4">
      {expenses.map(e => {
        const cat = catMap[e.category]
        return (
          <div key={e.id} className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: (cat?.color ?? '#6b7280') + '20' }}>
              <span className="text-lg" style={{ color: cat?.color ?? '#6b7280' }}>●</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-800">{formatAmount(e.amount)}</span>
                <span className="text-xs text-gray-400 ml-2">{formatDate(e.date)}</span>
              </div>
              <div className="text-sm text-gray-500">{e.category}{e.memo ? ` — ${e.memo}` : ''}</div>
            </div>
            <div className="flex gap-1 ml-2">
              <button onClick={() => onEdit(e)} className="text-xs text-blue-500 px-2 py-1 border border-blue-200 rounded-lg">編集</button>
              <button onClick={() => onDelete(e.id)} className="text-xs text-red-400 px-2 py-1 border border-red-200 rounded-lg">削除</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ExpenseChart({ expenses, categories, petId }: { expenses: Expense[], categories: ExpenseCategory[], petId: string }) {
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([])

  useEffect(() => {
    expenseRepo.getByPet(petId).then(all => {
      const map: Record<string, number> = {}
      all.forEach(e => {
        const m = toYearMonth(e.date)
        map[m] = (map[m] ?? 0) + e.amount
      })
      const sorted = Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, total]) => ({ month: month.slice(5) + '月', total }))
      setMonthlyData(sorted)
    })
  }, [petId])

  // カテゴリ別集計
  const catTotals: { name: string; value: number; color: string }[] = []
  const catMap = Object.fromEntries(categories.map(c => [c.name, c]))
  const grouped: Record<string, number> = {}
  expenses.forEach(e => { grouped[e.category] = (grouped[e.category] ?? 0) + e.amount })
  Object.entries(grouped).sort(([, a], [, b]) => b - a).forEach(([name, value]) => {
    catTotals.push({ name, value, color: catMap[name]?.color ?? '#6b7280' })
  })

  if (expenses.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-12">この月の支出はありません</p>
  }

  return (
    <div className="p-4 flex flex-col gap-6">
      {/* 円グラフ */}
      <div>
        <h2 className="font-medium mb-3">カテゴリ別内訳</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={catTotals} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false} labelLine={false}>
              {catTotals.map((c, i) => <Cell key={i} fill={c.color} />)}
            </Pie>
            <Tooltip formatter={(v) => formatAmount(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1 mt-2">
          {catTotals.map(c => (
            <div key={c.name} className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
              <span className="font-medium">{formatAmount(c.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 月別棒グラフ */}
      {monthlyData.length > 0 && (
        <div>
          <h2 className="font-medium mb-3">月別推移（直近6ヶ月）</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatAmount(Number(v))} />
              <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function ExpenseForm({
  petId,
  expense,
  categories,
  defaultMonth,
  onSaved,
  onCancel,
}: {
  petId: string
  expense?: Expense
  categories: ExpenseCategory[]
  defaultMonth: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [date, setDate] = useState(expense?.date ?? defaultMonth + '-' + format(new Date(), 'dd'))
  const [category, setCategory] = useState(expense?.category ?? categories[0]?.name ?? '')
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [memo, setMemo] = useState(expense?.memo ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseInt(amount, 10)
    if (!amountNum || amountNum <= 0) return
    setSaving(true)
    const saved: Expense = {
      id: expense?.id ?? generateId(),
      petId,
      date,
      category,
      amount: amountNum,
      memo: memo || undefined,
      createdAt: expense?.createdAt ?? new Date().toISOString(),
    }
    await expenseRepo.save(saved)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">日付</span>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-xl px-3 py-2 text-base bg-white" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">カテゴリ</span>
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-xl px-3 py-2 text-base bg-white">
          {categories.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">金額（円）*</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min={1}
          className="border rounded-xl px-3 py-2 text-base bg-white"
          placeholder="3000"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-600">メモ</span>
        <input value={memo} onChange={e => setMemo(e.target.value)} className="border rounded-xl px-3 py-2 text-base bg-white" placeholder="○○動物病院" />
      </label>

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
