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