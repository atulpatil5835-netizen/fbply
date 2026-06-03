import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'

const defaultSuggestions = [
  { label: 'Petrol', category: 'Fuel' },
  { label: 'Pet care', category: 'Personal' },
  { label: 'Netflix', category: 'Subscription' },
  { label: 'Zomato', category: 'Food' },
  { label: 'Swiggy', category: 'Food' },
  { label: 'Milk', category: 'Grocery' },
  { label: 'Uber', category: 'Transport' },
  { label: 'Ola', category: 'Transport' },
  { label: 'Amazon', category: 'Shopping' },
  { label: 'Flipkart', category: 'Shopping' },
  { label: 'Spotify', category: 'Subscription' },
  { label: 'Jio', category: 'Bills' },
  { label: 'Airtel', category: 'Bills' },
  { label: 'Dmart', category: 'Grocery' },
  { label: 'Reliance Fresh', category: 'Grocery' },
  { label: 'Big Bazaar', category: 'Grocery' },
  { label: 'Rent', category: 'Housing' },
]

function optionKey(option) {
  return `${option.label}-${option.category}`
}

export default function CategoryPicker({
  categories,
  customExpenseName,
  quickExpenseChips,
  selectedCategory,
  setCustomExpenseName,
  setSelectedCategory,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const displayValue = selectedCategory === 'Custom' && customExpenseName ? 'Other' : selectedCategory
  const knownCategories = useMemo(() => new Set(categories.map((category) => category.label)), [categories])
  const options = useMemo(() => {
    const mappedCategories = categories
      .filter((category) => category.label !== 'Custom')
      .map((category) => ({ label: category.label, category: category.label, type: 'category' }))
    const memoryOptions = quickExpenseChips.map((chip) => ({
      label: chip.label,
      category: chip.category || chip.label,
      amount: chip.amount,
      type: 'memory',
    }))

    const unique = new Map()
    ;[...mappedCategories, ...memoryOptions, ...defaultSuggestions].forEach((option) => {
      unique.set(optionKey(option).toLowerCase(), option)
    })

    return Array.from(unique.values())
  }, [categories, quickExpenseChips])
  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()
    const filtered = cleanQuery
      ? options.filter((option) =>
          `${option.label} ${option.category}`.toLowerCase().includes(cleanQuery),
        )
      : options

    if (cleanQuery && !filtered.some((option) => option.label.toLowerCase() === cleanQuery)) {
      return [
        { label: query.trim(), category: 'Custom', type: 'custom' },
        ...filtered,
      ]
    }

    return filtered
  }, [options, query])

  const chooseOption = (option) => {
    if (option.type === 'category' || knownCategories.has(option.label)) {
      setSelectedCategory(option.category)
    } else if (knownCategories.has(option.category)) {
      setSelectedCategory(option.category)
      setCustomExpenseName(option.label)
    } else {
      setSelectedCategory('Custom')
      setCustomExpenseName(option.label)
    }

    setIsOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <section className={`compact-category-picker ${error ? 'field-invalid-wrap' : ''}`}>
      <span className="input-label">Expense category</span>
      <button className={`category-picker-trigger ${error ? 'field-invalid' : ''}`} type="button" onClick={() => setIsOpen(true)}>
        <span>{displayValue || 'Choose category'}</span>
        <ChevronRight size={17} />
      </button>
      {error && <small className="field-helper">{error}</small>}
      {isOpen && (
        <div className="category-dropdown" role="listbox" aria-label="Choose expense category">
          <div className="category-search">
            <Search size={17} />
            <input
              value={query}
              placeholder="Search category or label"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="category-option-list category-scroll-list">
            {filteredOptions.map((option) => (
              <button key={optionKey(option)} type="button" onClick={() => chooseOption(option)}>
                <span>{option.label}</span>
                <small>{option.category === option.label ? 'Category' : option.category}</small>
              </button>
            ))}
          </div>
          <div className="category-dropdown-footer">
            <button className="ghost-button category-sheet-close" type="button" onClick={() => setIsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
