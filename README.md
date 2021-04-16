# Zoo Web Components

|                             **Dependencies**                              |
| :-----------------------------------------------------------------------: |
| ![David](https://img.shields.io/david/dev/zooplus/zoo-web-components.svg) |
|   ![David](https://img.shields.io/david/zooplus/zoo-web-components.svg)   |

- Set of extendable, reusable web-components which can be used in any modern UI framework (or without any).
- 0 dependencies, built with [Vanilla JS](http://vanilla-js.com/)
- Doesn't hide native HTML elements behind multiple levels of abstraction but rather enhances them via composition.

## Installation

To use this library install it by running:

```bash
npm i @zooplus/zoo-web-components --save
```

When there is a tree-shaking mechanism in your build pipeline, you can import only the components that you need, for example:

```JS
import { Input, Select, registerComponents } from '@zooplus/zoo-web-components';
registerComponents(Input, Select);

// or to import everything

import * as zooComponents from  '@zooplus/zoo-web-components';
zooComponents.registerComponents(zooComponents);
```

All dependencies needed by the components should be pulled automatically, so you don't have to worry about importing classes for `zoo-info`, `zoo-label` etc.

Your build tool should remove all of the components that are not imported automatically (when using rollup, for example).

In case you don't use any framework and/or any build tool you can import the whole library with the following:

```HTML
<script src="path-to-zooplus-lib/zoo-web-components.js"></script>
```

or only the components that you need, for example:

```HTML
<script src="path-to-zooplus-lib/checkbox.js"></script>
```

Note, that IIFE components already include all sub-dependencies needed by the component. For example, the above `zoo-checkbox` requires also a `zoo-info` component, it is already in the same bundle as the checkbox.
Other components that might also use `zoo-info` will not throw an error, since care is taken to not redefine same elements in the custom elements registry.

Currently, we recommend to use ESM bundle only when you're using some kind of a bundler, which transforms your code into some js module format that is not ESM, since using pure ESM might trigger FOUC, and we do not want that.

Remember to add CSS custom properties to your main styles file:

```CSS
:root {
 --primary-mid: #3C9700;
 --primary-light: #66B100;
 --primary-dark: #286400;
 --primary-ultralight: #EBF4E5;
 --secondary-mid: #FF6200;
 --secondary-light: #F80;
 --secondary-dark: #CC4E00;
 --info-ultralight: #ECF5FA;
 --info-mid: #459FD0;
 --warning-ultralight: #FDE8E9;
 --warning-mid: #ED1C24;
}
```

## Examples integrating with various frameworks

- [VueJS](https://github.com/GeorgeTailor/vue-wc-integration)
- [Angular](https://github.com/GeorgeTailor/angular-wc-integration)
- [React](https://github.com/GeorgeTailor/react-wc-integration)

## Documentation

Landing page is available here: <https://zooplus.github.io/zoo-web-components>  
Documentation page is here: <https://zooplus.github.io/zoo-web-components-docs>

## Note

This library relies on attributes and/or slots. Usage of properties is not supported for simplicity.
