# Footer module

# Installation
To use this module install it as a dependency in your application by running `npm i @zooplus-logistics/footer-module --save`;

# Import
Import it into your application. For example in angular it is sufficient to add `import '../../node_modules/@zooplus-logistics/footer-module';` into `app.module.ts`, which is the entry point for the angular application;

# Use it
To use it in your project add the following to your mark-up file:
```
<zoo-log-footer #zooFooter></zoo-log-footer>
```
`#zooFooter` is a way in angular to get direct reference to html element on the page. It can vary from framework to framework. It is needed as the component's API accepts an array of object, which cannot be understood as string by the component.

You will have to supply the array of links as a property of the HTMLElement, not an attribute.
In code of the angular component:
```
@ViewChild('zooFooter')
zooFooter: ElementRef;
ngOnInit() {
	this.zooFooter.nativeElement.footerlinks = [
		{
			href: 'https://google.com',
			text: 'link to a google page',
			target: 'about:blank',
			type: 'standard'
		}
	];
}
```

# API
The component accepts the following parameters:
* `footerlinks` - an `array` of objects where each object has the following structure:
** `href` - direct link;
** `text` - text to be displayed as link;
** `target` - how the link should behave (default - `about:blank`) (optional);
** `type` - currently supports 2 values: `standard` and `green`, default - `standard`. Responsible for coloring of the links, standard is white. (optional).