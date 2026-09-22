export { createCommandRegistry, matchesShortcut } from './core/commands'
export type {
  DesktopCommand,
  CommandRegistry,
  CommandContext,
  MenuItem,
  DesktopMenu,
} from './core/commands'
export { mountExternalContent } from './core/content'
export type { ContentFactory, MountedContent, ContentState } from './core/content'
export { createWorkspace, validateWorkspace, measureWorkspace } from './core/workspace'
export type {
  Workspace,
  WorkspaceSnapshot,
  LayoutNode,
  LayoutSplit,
  TabGroup,
  FloatingGroup,
  LayoutRect,
  LayoutStorage,
  DockPosition,
  PanelDefinition,
  PlacedGroup,
  PlacedDivider,
} from './core/workspace'
export { createDetachedHost } from './core/detached'
export type {
  DetachedHost,
  DetachedHostOptions,
  DetachedView,
  DetachedContent,
  DetachedBridge,
  DetachedCloseReason,
  DetachedOpenResult,
} from './core/detached'
