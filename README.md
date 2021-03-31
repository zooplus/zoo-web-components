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
import { Input, Select } from '@zooplus/dist/esm/components.js';
```

Your build tool should remove all of the components that are not imported automatically (when using rollup, for example).

In case you don't use any framework and/or any build tool you can import the whole library with the following:

```HTML
<script src="path-to-zooplus-lib/zoo-web-components.js"></script>
```

or only the components that you need, for example:

```HTML
<script src="path-to-zooplus-lib/form-modules/checkbox-module/checkbox.js"></script>
```

Note, that you are responsible to managing the dependencies of the components in such case. Dependencies of the components are described in the docs for each component. For example, when you want to use `zoo-searchable-select` you'll have to import at least 3 components:

```HTML
<script src="path-to-zooplus-lib/form-modules/searchable-select-module/searchable-select.js"></script>
<script src="path-to-zooplus-lib/form-modules/select-module/select.js"></script>
<script src="path-to-zooplus-lib/form-modules/input-module/input.js"></script>
```

Currently, we do not recommend using ESM bundle for importing the components via `script` as it may lead to FOUC. Things might change when Constructible Stylesheets will become a thing in all major browsers.

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
