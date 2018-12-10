# Header module

# Installation
To use this module install it as a dependency in your application by running `npm i @zooplus-logistics/header-module --save`;

# Import
Import it into your application. For example in angular it is sufficient to add `import '../../node_modules/@zooplus-logistics/header-module';` into `app.module.ts`, which is the entry point for the angular application;

# Use it
To use it in your project add the following to your mark-up file:
```
<zoo-log-header imgsrc="assets/zooplus.png" headertext="Replenishment Administration" version="{{version}}">
</zoo-log-header>
```

# API
The component accepts the following parameters:
* `imgsrc` - path to logo of your app;
* `headertext` - text to be displayed next to the logo (optional).
* `version` - text representation of the version of your application (optional).