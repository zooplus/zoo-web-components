# Intro
 - Set of web-components which can be used in any modern UI framework (or without any).
 - The web-component set implements Z+ shop style guide, which is described here: https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893960.
 - Future releases will include theming, more components, ESM support.

## Installation
To use exported modules install this library as a dependency in your application by running       
`npm i @zooplus/zoo-web-components --save`;

## Examples integrating with various frameworks
+ VueJS - https://github.com/GeorgeTailor/vue-wc-integration
+ Angular - https://github.com/GeorgeTailor/angular-wc-integration
+ React - https://github.com/GeorgeTailor/react-wc-integration

## Size of the library
Uncompressed size of the library is around 62 Kbytes;
Gzipped version is 15 Kbytes;

## Documentation
Head over to https://zooplus.github.io/zoo-web-components/ for more info regarding this library.


# Dev area
## Run
Run `npm start`. That command will build all available modules, write them as `bundle.js` file and throw it into `/docs` folder.

## Test
This project uses `Mocha` and `Chai` for writing tests. The tests are run using `Puppeteer`.
Run `npm test` to run the tests. Tests are automatically run before triying to publish new version to npm.
