export interface Column {
  id: string
  title: string
  hint: string
}

export interface Card {
  id: string
  column: string
  text: string
  votes: number
  /** Set when this card is grouped under another card (one level deep). */
  parentId?: string
  /** Related cards, linked as siblings. Links are kept on both cards. */
  links?: string[]
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
  /** The board's columns, from the template it was created with. */
  columns?: Column[]
  cards: Card[]
  actions: ActionItem[]
}

export interface Template {
  id: string
  name: string
  blurb: string
  columns: Column[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: 'Went well / To improve / Ideas',
    blurb: 'The everyday retro. A good default.',
    columns: [
      { id: 'well', title: 'Went well', hint: 'What should we keep doing?' },
      { id: 'improve', title: 'To improve', hint: 'What slowed us down?' },
      { id: 'ideas', title: 'Ideas', hint: 'What should we try next sprint?' },
    ],
  },
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    blurb: 'Straight to behaviour changes.',
    columns: [
      { id: 'start', title: 'Start', hint: 'What should we start doing?' },
      { id: 'stop', title: 'Stop', hint: 'What should we stop doing?' },
      { id: 'continue', title: 'Continue', hint: 'What is working well?' },
    ],
  },
  {
    id: 'msg',
    name: 'Mad / Sad / Glad',
    blurb: 'For sprints with a lot of feelings.',
    columns: [
      { id: 'mad', title: 'Mad', hint: 'What frustrated you?' },
      { id: 'sad', title: 'Sad', hint: 'What disappointed you?' },
      { id: 'glad', title: 'Glad', hint: 'What made you happy?' },
    ],
  },
  {
    id: '4ls',
    name: 'Liked / Learned / Lacked / Longed for',
    blurb: 'The 4Ls. Good after a long project.',
    columns: [
      { id: 'liked', title: 'Liked', hint: 'What did you enjoy?' },
      { id: 'learned', title: 'Learned', hint: 'What did you learn?' },
      { id: 'lacked', title: 'Lacked', hint: 'What was missing?' },
      { id: 'longed', title: 'Longed for', hint: 'What do you wish we had?' },
    ],
  },
]

/** Boards made before templates existed use the classic columns. */
export const columnsOf = (board: Board): Column[] => board.columns ?? TEMPLATES[0].columns

export const uid = () => crypto.randomUUID()
