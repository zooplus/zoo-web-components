# Installation
To use exported modules install this library as a dependency in your application by running       
`npm i @zooplus/zoo-web-components --save`;

## Examples integrating with various frameworks
+ VueJS - https://github.com/GeorgeTailor/vue-wc-integration
+ Angular - https://github.com/GeorgeTailor/angular-wc-integration
+ React - https://github.com/GeorgeTailor/react-wc-integration

## Size of the library
Uncompressed size of the library is around 50 Kbytes;
Gzipped version is 12 Kbytes;

## Documentation
Head over to https://zooplus.github.io/zoo-web-components/ for more info regarding this library.


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
