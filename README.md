|                               **Dependencies**                            |               **Size**              | **Downloads**  |
| :-----------------------------------------------------------------------: |:-----------------------------------:|:--:|
| ![David](https://img.shields.io/david/dev/zooplus/zoo-web-components.svg) | ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@zooplus/zoo-web-components.svg)   | ![npm](https://img.shields.io/npm/dt/@zooplus/zoo-web-components.svg)
| ![David](https://img.shields.io/david/zooplus/zoo-web-components.svg)     | ![npm bundle size (scoped)](https://img.shields.io/bundlephobia/minzip/@zooplus/zoo-web-components.svg)| 

# Intro
 - Set of web-components which can be used in any modern UI framework (or without any).
 - The web-component set implements Z+ shop style guide.
 - Built with [Vanilla JS](http://vanilla-js.com/)

## Installation
To use this library install it by running:
```
npm i @zooplus/zoo-web-components --save
```
and import the library in your main module/component/index.html:
```
import 'node_modules/@zooplus/zoo-web-components/dist/zoo-components-esm.js';
```      
or import only the classes that you need:      
```
import Button, Input from '@zooplus/zoo-web-components';
```

## Examples integrating with various frameworks
+ [VueJS](https://github.com/GeorgeTailor/vue-wc-integration)
+ [Angular](https://github.com/GeorgeTailor/angular-wc-integration)
+ [React](https://github.com/GeorgeTailor/react-wc-integration)

## Documentation
Landing page is available here: https://zooplus.github.io/zoo-web-components/      
Documentation page is here: https://zooplus.github.io/zoo-web-components-docs/index.html


# Dev area

## Run
### Run landing page
Run `npm start` and go to `localhost:5000`.

## Test
This project uses `Mocha` and `Chai` for writing tests. The tests are run using `Puppeteer`.
Run `npm test` to run the tests.
