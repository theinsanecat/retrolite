export type ColumnId = 'well' | 'improve' | 'ideas'

export interface Card {
  id: string
  column: ColumnId
  text: string
  votes: number
}

export interface ActionItem {
  id: string
  text: string
  owner: string
  due: string // YYYY-MM-DD or ''
  done: boolean
}

export interface Board {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  cards: Card[]
  actions: ActionItem[]
}

export const COLUMNS: { id: ColumnId; title: string; hint: string }[] = [
  { id: 'well', title: 'Went well', hint: 'What should we keep doing?' },
  { id: 'improve', title: 'To improve', hint: 'What slowed us down?' },
  { id: 'ideas', title: 'Ideas', hint: 'What should we try next sprint?' },
]

export const uid = () => crypto.randomUUID()
