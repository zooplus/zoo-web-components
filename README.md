Common web-components which can be used in any modern UI framework.

The web-component set implements Z+ shop style guide, which is described here: https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893960.

# Installation
To use any exported module install it as a dependency in your application by running `npm i @zooplus-logistics/footer-module --save`;      
To be able to download these packages you have to have `.npmrc` file inside your project root. You can copy paste the one which is inside this project.      

## Examples integrating with various frameworks
+ VueJS - https://github.com/GeorgeTailor/vue-wc-integration
+ Angular - https://github.com/GeorgeTailor/angular-wc-integration
+ React - https://github.com/GeorgeTailor/react-wc-integration

## Icons
+ add 
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
to your global .css file.
+ copy to your assets folder in final build `fonts` folder from this repo.

# List of components
As per https://zooplus.invisionapp.com/share/XWNXO049ZAD#/screens/323893958

## Standalone
+ Icons - The host application should provide these. Documentation here: https://wiki.web.zooplus.de/display/Shop/Shop+Icon+Fonts+Library
+ Buttons - `Not implemented`
+ Links - [`links-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/link-module).
+ Feedback - [`feedback-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/feedback-module);
+ Modal - `Not implemented`
+ Header - [`header-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/header-module);
+ Footer - [`footer-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/footer-module)

## Forms
+ Input - [`input-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/input-module);
+ Select - [`select-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/select-module);
+ Checkbox - [`checkbox-module`](https://src.private.zooplus.net/projects/LCOM/repos/web-components/browse/zoo-modules/checkbox-module);
+ Radio - `Not implemented`
+ Special Compositions - `Not implemented` - under consideration
+ Date picker - `Not implemented`

### Other
+ Tables - `Not implemented`
+ Tooltips - `Not implemented`
+ Lists  - `Not Implemented`
+ Navigation - `Not implemented`
+ Breadcrumb - `Not implemented`

# Reading resources
https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813      
http://robdodson.me/shadow-dom-css-cheat-sheet/

# Dev area
## Run
Run `npm start`. That command will build all available modules, write them as `bundle.js` file and throw it into `/public` folder.

## Test
* work in progress *
Run `npm run test`.

## Build
Run `npm run build`. That command will go to all modules defined in `rollup.config.js`, build them, and place a bundle for each module into `dist` folder inside the module.

## Deploy
Run `npm publish`, which will publish the package to internal zoo+ npm repo. Given that you don't change anything in `.npmrc` file.