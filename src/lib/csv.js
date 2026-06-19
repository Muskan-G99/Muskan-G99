import Papa from 'papaparse'
import { CATEGORIES, CATEGORY_KEYWORDS } from './constants'

export const guessCategory = (description = '') => {
  const desc = description.toLowerCase()
  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    if (CATEGORY_KEYWORDS[category].some((kw) => desc.includes(kw))) return category
  }
  return 'Other'
}

const pick = (row, keys) => {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.toLowerCase().trim() === key)
    if (found && row[found] !== undefined && row[found] !== '') return row[found]
  }
  return undefined
}

export const parseTransactionsCSV = (file, cardId, onComplete) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = results.data
        .map((row, i) => {
          const date = pick(row, ['transaction date', 'date', 'posted date'])
          const description = pick(row, ['description', 'merchant', 'name'])
          const amountRaw = pick(row, ['amount', 'debit'])
          const categoryRaw = pick(row, ['category'])
          if (!date || !description || amountRaw === undefined) return null
          const amount = Math.abs(parseFloat(String(amountRaw).replace(/[^0-9.-]/g, '')))
          const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : guessCategory(description)
          return {
            id: `import-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            date,
            merchant: description,
            amount,
            category,
            card: cardId || 'imported',
          }
        })
        .filter(Boolean)
      onComplete(rows)
    },
  })
}

// Parses one or more CSV files (e.g. separate statement exports per card) and
// merges the resulting transactions into a single batch once all are done.
export const parseTransactionsCSVFiles = (files, cardId, onComplete) => {
  const fileList = Array.from(files)
  const results = new Array(fileList.length)
  let remaining = fileList.length
  fileList.forEach((file, i) => {
    parseTransactionsCSV(file, cardId, (rows) => {
      results[i] = rows
      remaining -= 1
      if (remaining === 0) onComplete(results.flat())
    })
  })
}

export const parseInvestmentsCSV = (file, onComplete) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const rows = results.data
        .map((row, i) => {
          const symbol = pick(row, ['symbol', 'instrument', 'ticker'])
          const shares = pick(row, ['quantity', 'shares'])
          const avgCost = pick(row, ['average cost', 'avg cost', 'cost basis per share'])
          const price = pick(row, ['price', 'last price', 'current price'])
          if (!symbol || shares === undefined) return null
          return {
            id: `import-${Date.now()}-${i}`,
            symbol: symbol.toUpperCase(),
            name: symbol.toUpperCase(),
            shares: parseFloat(shares),
            avgCost: parseFloat(String(avgCost).replace(/[^0-9.-]/g, '')) || 0,
            currentPrice: parseFloat(String(price).replace(/[^0-9.-]/g, '')) || 0,
            assetType: 'Stock',
          }
        })
        .filter(Boolean)
      onComplete(rows)
    },
  })
}
