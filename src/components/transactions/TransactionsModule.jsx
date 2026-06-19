import { useMemo, useState } from 'react'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'
import Badge from '../ui/Badge'
import ImportButton from '../ui/ImportButton'
import { parseTransactionsCSVFiles } from '../../lib/csv'
import { formatCurrency, formatDate } from '../../lib/format'
import { CATEGORIES } from '../../lib/constants'
import { CARDS, getCard, getEffectiveRate, bestCardForTransaction } from '../../data/cards'
import { CreditCard, Receipt, TrendingUp, CheckCircle2, ArrowRightCircle } from 'lucide-react'

const getRecommendation = (t) => {
  const card = getCard(t.card)
  const best = bestCardForTransaction(t)
  const actualRate = card ? getEffectiveRate(card, t) : 0
  const bestRate = getEffectiveRate(best, t)
  const isOptimal = actualRate >= bestRate
  const extra = isOptimal ? 0 : t.amount * ((bestRate - actualRate) / 100)
  return { card, best, isOptimal, extra }
}

export default function TransactionsModule({ transactions, onImport }) {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [showSuboptimalOnly, setShowSuboptimalOnly] = useState(false)
  const [importCard, setImportCard] = useState(CARDS[0].id)

  const filtered = useMemo(() => {
    let list = categoryFilter === 'All' ? transactions : transactions.filter((t) => t.category === categoryFilter)
    if (showSuboptimalOnly) list = list.filter((t) => !getRecommendation(t).isOptimal)
    return list
  }, [transactions, categoryFilter, showSuboptimalOnly])

  const totalSpent = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions])
  const topCategory = useMemo(() => {
    const totals = {}
    transactions.forEach((t) => (totals[t.category] = (totals[t.category] ?? 0) + t.amount))
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
  }, [transactions])

  const missedRewards = useMemo(
    () => transactions.reduce((sum, t) => sum + getRecommendation(t).extra, 0),
    [transactions],
  )

  const handleFiles = (files) => {
    parseTransactionsCSVFiles(files, importCard, (rows) => onImport(rows))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tracked Spend" value={formatCurrency(totalSpent)} icon={Receipt} />
        <StatCard label="Transactions" value={transactions.length} icon={CreditCard} />
        <StatCard
          label="Top Category"
          value={topCategory?.[0] ?? '—'}
          sublabel={topCategory ? formatCurrency(topCategory[1]) : ''}
          icon={TrendingUp}
        />
        <StatCard
          label="Missed Rewards"
          value={formatCurrency(missedRewards)}
          sublabel="Using a better card would have earned this"
          icon={ArrowRightCircle}
          tone={missedRewards > 0 ? 'negative' : 'positive'}
        />
      </div>

      <Card
        title="All Transactions"
        action={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={showSuboptimalOnly}
                onChange={(e) => setShowSuboptimalOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Suboptimal only
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
            >
              <option>All</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={importCard}
              onChange={(e) => setImportCard(e.target.value)}
              title="Card these CSV(s) belong to"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"
            >
              {CARDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName}
                </option>
              ))}
            </select>
            <ImportButton label="Import CSV" onFile={handleFiles} multiple />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Merchant</th>
                <th className="py-2 pr-4">Card Used</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Best Card to Use</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const { card, best, isOptimal, extra } = getRecommendation(t)
                return (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 text-slate-500">{formatDate(t.date)}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{t.merchant}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{card ? card.name : 'Imported'}</td>
                    <td className="py-2.5 pr-4">
                      <Badge category={t.category} />
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-slate-800">{formatCurrency(t.amount)}</td>
                    <td className="py-2.5 pr-4">
                      {isOptimal ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Optimal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
                          <ArrowRightCircle className="h-3.5 w-3.5" />
                          Use {best.shortName} (+{formatCurrency(extra)})
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    No transactions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
