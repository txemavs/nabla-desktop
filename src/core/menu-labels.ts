/** Applications supply translated command labels; these are built-in presentation labels. */
export const menuLabels = {
  en: { applicationMenu: 'Application menu', allActions: 'All actions' },
  es: { applicationMenu: 'Menú de la aplicación', allActions: 'Todas las acciones' },
} as const
export type MenuLabels = { [Key in keyof typeof menuLabels.en]: string }
