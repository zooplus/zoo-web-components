# Installation
To use exported modules install this library as a dependency in your application by running `npm i @zooplus/zoo-web-components --save`;

## Examples integrating with various frameworks
+ VueJS - https://github.com/GeorgeTailor/vue-wc-integration
+ Angular - https://github.com/GeorgeTailor/angular-wc-integration
+ + Or just import it in your main app.module.ts import `../../node_modules/@zooplus/zoo-web-components` and add `CUSTOM_ELEMENTS_SCHEMA`;
+ React - https://github.com/GeorgeTailor/react-wc-integration

## Size of the library
Uncompressed size of the library is around 50 Kbytes;
Gzipped version is 12 Kbytes;

# List of components
As per https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893958

## Standalone
+ Buttons - [`button-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/button-module);
+ Links - [`links-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/link-module);
+ Feedback - [`feedback-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/feedback-module);
+ Modal - [`modal-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/modal-module);
+ Header - [`header-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/header-module);
+ Footer - [`footer-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/footer-module)

## Forms
+ Input - [`input-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/input-module);
+ Select - [`select-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/select-module);
+ Searchable Select - [`searchable-select-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/searchable-select-module);
+ Checkbox - [`checkbox-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/checkbox-module);
+ Radio - [`radio-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/radio-module);
+ Special Compositions - `Not implemented` - under consideration
+ Date picker - `Not implemented` - I recommend to use native `<input type="date"/>` alogn with [`this`](https://github.com/jcgertig/date-input-polyfill) polyfill for browsers that haven't implement it yet;

## Other
+ Tables - `Not implemented`
+ Tooltips - [`tooltip-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/tooltip-module);
+ Lists  - `Not Implemented` - just use <details> tag
+ Navigation - [`navigation-module`](https://github.com/zooplus/zoo-web-components/tree/master/zoo-modules/navigation-module)
+ Breadcrumb - `Not implemented`



# Dev area
## Run
Run `npm start`. That command will build all available modules, write them as `bundle.js` file and throw it into `/docs` folder.

## Test
This project uses `Mocha` and `Chai` for writing tests. The tests are run using `Puppeteer`.
Run `npm test` to run the tests. Tests are automatically run before triying to publish new version to npm.

## Build
Run `npm run build`. That command will go to all modules defined in `rollup.config.js`, build them, and place a bundle for each module into `dist` folder inside the module.

## Deploy
Run `npm publish`, which will publish the package to internal zoo+ npm repo. Given that you don't change anything in `.npmrc` file.

## Reading resources
https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813      
http://robdodson.me/shadow-dom-css-cheat-sheet/
