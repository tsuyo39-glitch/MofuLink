import { useState } from 'react'
import { PetProvider } from './features/pets/PetContext'
import { PetsPage } from './pages/PetsPage'
import { DiaryPage } from './pages/DiaryPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { SettingsPage } from './pages/SettingsPage'

type Page = 'pets' | 'diary' | 'expenses' | 'settings'

// シンプルな丸ベースのアイコン（線画）
function NavIcon({ id }: { id: Page }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (id) {
    case 'pets': // 肉球（丸の集まり）
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="12" cy="15" r="3.5" />
          <circle cx="6" cy="11" r="1.8" />
          <circle cx="18" cy="11" r="1.8" />
          <circle cx="9" cy="7" r="1.8" />
          <circle cx="15" cy="7" r="1.8" />
        </svg>
      )
    case 'diary': // 丸の中にハート（記録・思い出）
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path
            d="M12 15.2c-2-1.4-3.3-2.6-3.3-4a1.7 1.7 0 0 1 3.3-.6 1.7 1.7 0 0 1 3.3.6c0 1.4-1.3 2.6-3.3 4Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      )
    case 'expenses': // 丸の中に小さな丸（コイン）
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'settings': // 丸の中に三点（データ）
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="8.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('pets')

  return (
    <PetProvider>
      <div className="flex flex-col min-h-svh w-full max-w-md mx-auto bg-gradient-to-b from-emerald-100 via-cyan-100 to-sky-200">
        <div className="flex-1 overflow-auto pb-20">
          {page === 'pets' && <PetsPage />}
          {page === 'diary' && <DiaryPage />}
          {page === 'expenses' && <ExpensesPage />}
          {page === 'settings' && <SettingsPage />}
        </div>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-sky-200 shadow-[0_-2px_8px_rgba(14,165,233,0.12)] flex pb-safe">
          {(
            [
              { id: 'pets', label: 'ペット' },
              { id: 'diary', label: '日記' },
              { id: 'expenses', label: '支出' },
              { id: 'settings', label: 'データ' },
            ] as { id: Page; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="flex-1 flex flex-col items-center py-2 gap-1 text-xs"
            >
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  page === id ? 'bg-orange-500 text-white shadow-md shadow-orange-300' : 'text-sky-400'
                }`}
              >
                <NavIcon id={id} />
              </span>
              <span className={page === id ? 'text-orange-600 font-bold' : 'text-sky-400'}>
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </PetProvider>
  )
}
