import { useMemo } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'
import Badge from '../ui/Badge'
import { formatCurrency, formatDate, formatMonth } from '../../lib/format'
import { getCard, getEffectiveRate, bestCardForCategory } from '../../data/cards'
import { CATEGORIES } from '../../lib/constants'
import { CreditCard, Gift, TrendingUp, Wallet } from 'lucide-react'

export default function OverviewModule({ transactions, holdings, onNavigate }) {
  const totalSpend30d = useMemo(() => {
    const cutoff = new Date('2026-06-19')
    cutoff.setDate(cutoff.getDate() - 30)
    return transactions.filter((t) => new Date(t.date) >= cutoff).reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  const rewardsEarned = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        const card = getCard(t.card)
        return card ? sum + t.amount * (getEffectiveRate(card, t) / 100) : sum
      }, 0),
    [transactions],
  )

  const portfolioValue = useMemo(() => holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0), [holdings])
  const portfolioGain = useMemo(
    () => holdings.reduce((sum, h) => sum + h.shares * (h.currentPrice - h.avgCost), 0),
    [holdings],
  )

  const monthlyTrend = useMemo(() => {
    const byMonth = {}
    transactions.forEach((t) => {
      const key = t.date.slice(0, 7)
      byMonth[key] = byMonth[key] || { key, month: formatMonth(t.date), total: 0 }
      byMonth[key].total += t.amount
    })
    return Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key))
  }, [transactions])

  const recentTransactions = transactions.slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Spend (Last 30 Days)" value={formatCurrency(totalSpend30d)} icon={CreditCard} />
        <StatCard label="Rewards Earned (YTD)" value={formatCurrency(rewardsEarned)} icon={Gift} tone="positive" />
        <StatCard label="Portfolio Value" value={formatCurrency(portfolioValue)} icon={TrendingUp} />
        <StatCard
          label="Portfolio Gain/Loss"
          value={formatCurrency(portfolioGain)}
          icon={Wallet}
          tone={portfolioGain >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Spending Trend (6 Months)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="overviewSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="total" stroke="#0f172a" fill="url(#overviewSpend)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Recent Transactions" action={
          <button onClick={() => onNavigate('transactions')} className="text-xs font-medium text-slate-500 hover:text-slate-800">
            View all →
          </button>
        }>
          <ul className="flex flex-col gap-3">
            {recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">{t.merchant}</p>
                  <p className="text-xs text-slate-400">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge category={t.category} />
                  <span className="font-medium text-slate-800">{formatCurrency(t.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Best Card to Use, by Category">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat) => {
            const best = bestCardForCategory(cat)
            return (
              <div key={cat} className="rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-400">{cat}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{best.shortName}</p>
                <p className="text-xs font-medium text-emerald-600">{best.rates[cat]}% back</p>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
