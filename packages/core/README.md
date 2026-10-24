# @frankfmy/state-motion

Framework-neutral state slots, a demand-driven frame scheduler, and number,
OKLCH color and 3D vector interpolation. Version 0.1.0, MIT, ESM only.
No runtime dependencies. Node 24 and Bun 1.4 are the supported server runtimes.

```js
import { ServerHabitat, ServerRender, RenderNumber } from '@frankfmy/state-motion';
const habitat = new ServerHabitat();
const render = new ServerRender();
const current = habitat.toState(0);
const target = habitat.toState(0);
const value = new RenderNumber('value', { current, target }, { render }, { tau: 90, eps: .001 });
value.run(100);
render.settle();
console.log(current.get()); // 100
render.clear();
```

Color: `/color` (`OKLCH`, `ColorState`). Vector: `/vector3` (`UC3`) and
`/vector3/states` (`C3S`). Configs: `/__config`, `/color/__config`, `/vector3/__config`.
Framework adapters are optional and distributed separately.

Install the tarball from a published GitHub release asset, or build a local
checkout. Registry publication is not assumed. See the
[repository README](https://github.com/FrankFMY/state-motion#readme) for exact
commands, behavior, supported versions and limitations.

## Author and contact

Created and maintained by [Artem Prianishnikov (Артем Прянишников / FrankFMY)](https://github.com/FrankFMY).

- Email: [Pryanishnikovartem@gmail.com](mailto:Pryanishnikovartem@gmail.com)
- Telegram: [@FrankFMY](https://t.me/FrankFMY)
- Website: [frankfmy.com](https://frankfmy.com)
- Profiles: [GitHub](https://github.com/FrankFMY) · [LinkedIn](https://www.linkedin.com/in/frankfmy/) · [X](https://x.com/FrankFMY)
