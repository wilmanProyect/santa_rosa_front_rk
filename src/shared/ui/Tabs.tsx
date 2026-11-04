import { Icon, type IconName } from './Icon'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: IconName
  /** Número opcional junto a la etiqueta (p. ej. cantidad de fotos). */
  count?: number
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange(value: T): void
  label?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <Icon name={tab.icon} size={16} />}
          {tab.label}
          {tab.count !== undefined && <span className="tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}
