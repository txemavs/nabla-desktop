/** Presentation contracts: values belong to the consuming application. */
export type FieldValue = string | number | boolean
export interface PropertyField {
  id: string
  label: string
  type?: 'text' | 'number' | 'checkbox' | 'color' | 'select' | 'textarea'
  value: FieldValue
  unit?: string
  min?: number
  max?: number
  step?: number | 'any'
  options?: { value: string; label: string }[]
  disabled?: boolean
  readonly?: boolean
  hint?: string
  error?: string
  locked?: boolean
  change: (value: FieldValue) => void | Promise<void>
  toggleLock?: () => void
}
export interface PropertySection {
  id: string
  label: string
  open?: boolean
  fields?: PropertyField[]
  actions?: { id: string; label: string; disabled?: boolean; execute: () => void | Promise<void> }[]
  note?: string
}
export interface TreeNode {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  selectable?: boolean
  children?: TreeNode[]
}
export interface LogEntry {
  id: number
  time: string
  level: 'info' | 'warning' | 'error'
  message: string
}
