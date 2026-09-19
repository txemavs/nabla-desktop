# @nabla/desktop

Reusable 2D window shell for Nabla apps — windows, minimize, chrome, z-order.

Extracted from Agency desktop for shared use across Nabla projects.

## Installation

```bash
npm install @nabla/desktop
```

## Peer Dependencies

- `vue` ^3.3.0
- `pinia` ^2.1.0
- `vuetify` (optional)

## Usage

```ts
import { VERSION } from '@nabla/desktop'
import type { WindowState, WindowOptions } from '@nabla/desktop'

console.log('Nabla Desktop version:', VERSION)

const window: WindowState = {
  id: 'my-window',
  title: 'My Window',
  x: 100,
  y: 100,
  width: 800,
  height: 600,
  minimized: false,
  maximized: false,
  focused: true,
  zIndex: 1,
}
```

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
