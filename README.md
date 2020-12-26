|                             **Dependencies**                              |                                                **Size**                                                 |                             **Downloads**                             |
| :-----------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------: |
| ![David](https://img.shields.io/david/dev/zooplus/zoo-web-components.svg) |  ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@zooplus/zoo-web-components.svg)   | ![npm](https://img.shields.io/npm/dt/@zooplus/zoo-web-components.svg) |
|   ![David](https://img.shields.io/david/zooplus/zoo-web-components.svg)   | ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@zooplus/zoo-web-components.svg) |

# Zoo Web Components

- Set of extendable, reusable web-components which can be used in any modern UI framework (or without any).
- 0 dependencies, built with [Vanilla JS](http://vanilla-js.com/)
- Doesn't hide native HTML elements behind multiple levels of abstraction but rather enhances them via composition.

## Installation

To use this library install it by running:

```bash
npm i @zooplus/zoo-web-components --save
```

and import the library in your main module/component/index.html:

```JS
import '@zooplus/zoo-web-components';
```

it is also possible to import only the modules you need, for example:
```JS
import '@zooplus/zoo-web-components/dist/button';
```

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
