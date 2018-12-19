Common web-components which can be used in any modern UI framework.

The web-component set implements Z+ shop style guide, which is described here: https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893960.

# Run
Run `npm start`. That command will build all available modules, write them as `bundle.js` file and throw it into `/public` folder.

# Test
* work in progress *
Run `npm run test`.

# Build
Run `npm run build`. That command will go to all modules defined in `rollup.config.js`, build them, and place a bundle for each module into `dist` folder inside the module.

#Deploy
Run `npm publish`, which will publish the package to internal zoo+ npm repo. Given that you don't change anything in `.npmrc` file.

# Installation
To use any exported module install it as a dependency in your application by running `npm i @zooplus-logistics/footer-module --save`;

# Import
Import it into your application. For example in angular it is sufficient to add `import '../../node_modules/@zooplus-logistics/footer-module';` into `app.module.ts`, which is the entry point for the angular application;

# Icons
add 
```
@font-face {
    font-family: "zooplus-icons";
    src: url('./assets/fonts/zooplus/zooplus-icons.eot');
    src: url('./assets/fonts/zooplus/zooplus-icons.eot?#iefix') format('eot'),
         url('./assets/fonts/zooplus/zooplus-icons.woff2') format('woff2'),
         url('./assets/fonts/zooplus/zooplus-icons.woff') format('woff'),
         url('./assets/fonts/zooplus/zooplus-icons.ttf') format('truetype'),
         url('./assets/fonts/zooplus/zooplus-icons.svg#zooplus-icons') format('svg');
    font-weight: normal;
    font-style: normal;
}
```
+ copy to your assets folder in final build `fonts` folder from this repo.

# List of components
As per https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893958

## Icons
The host application should provide these. Documentation here: https://wiki.web.zooplus.de/display/Shop/Shop+Icon+Fonts+Library

## Buttons
`Not implemented`

## Links
`links-module` implemented.

## Feedback
`feedback-module` implemented;

## Modal
`Not implemented`

## Forms
### Input
`input-module` implemented

### Select
`select-module` implemented

### Checkbox
`checkbox-module` implemented

### Radio
`Not implemented`

### Special Compositions
`Not implemented` - under consideration

## Tables
`Not implemented`

## Tooltips
`Not implemented`

## Lists 
`Not Implemented`

## Header
`header-module` implemented

## Navigation
`Not implemented`

## Breadcrumb
`Not implemented`

## Footer
`footer-module` implemented;

# Misc
https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
http://robdodson.me/shadow-dom-css-cheat-sheet/