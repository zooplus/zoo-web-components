# 7.0.7
`zoo-grid` - reflect `resizable` and `reorderable` properties as attributes. Fix grid sometimes not applying widths to columns when `resizable` attribute is set. Avoid assigning column numbers to elements one by one when a lot of slots are inserted during a small time span (for example, during initialization).

# 7.0.6
`zoo-searchable-select` - show initial version on mobile devices

# 7.0.5
`zoo-searchable-select` - fix showing and hiding 'x' sign when value is selected.

# 7.0.4
`zoo-searchable-select` - properly set disabled state in input element when injected select is disabled.

# 7.0.3
`zoo-select` - added `box-sizing: border-box` to include padding and margin in components width;
`zoo-checkbox` - added change event dispatching when user clicks on a label, which is created based on `labeltext` attribute.

# 7.0.2
`zoo-grid` - fix setting `resizable` and `reorderable` attributes not being reflected in behavior.

# 7.0.1
`zoo-footer` - fix displaying links according to their width and in line.

# 7.0.0

This release concentrates on further performance improvements and alignment with current web standards.
Additionally:
- bundle size was reduced
- initialization time was reduced
- runtime performance improvements

** BREAKING CHANGES **
All components that relied on boolean properties now act according to HTML spec. Meaning that when attribute is set on an element its value is treated as true. For false value -> remove the attribute completely.

`valid` attribute is no longer supported, use `invalid` instead.

`zoo-button` - no longer encapsulates `<button>` element inside, instead the client should supply its own button via slot.
`zoo-checkbox`, `zoo-input`, `zoo-quantity-control`, `zoo-radio`, `zoo-searchable-select`, `zoo-select` - replace `valid` attribute with `invalid`.
`zoo-link` - no longer encapsulates `<a>` element inside, instead the client should supply its own anchor via slot.
`zoo-grid` - `loading` attribute must follow HTML boolean attribute spec.

`IIFE` version of this package will no longer be released starting with version 7.

# 6.2.0
Three new components:
`zoo-toggle-switch` - toggler component;
`zoo-segmented-buttons` - container for `zoo-button`s that handles active/inactive state;
`zoo-quantity-control` - component for quantity increase/decrease.

# 6.1.2
`zoo-feedback` - no longer accepts `text` attribute. Use `slot` instead.
`zoo-button` - no longer accepts `buttoncontent` slot. Use unnamed `slot` instead.

# 6.1.1
`zoo-checkbox` - fix infotext rendering below the checkbox.

# 6.1.0
`zoo-button` - added additional unnamed slot to avoid writing `slot="buttoncontent"` all the time.

# 6.0.3
`zoo-checkbox` - fixed border style to use `primary` css variable.
`zoo-input-info` - flatten internal DOM structure.
`zoo-input`, `zoo-checkbox`, `zoo-radio`, `zoo-select` - do not render `zoo-input-info` when not needed.
`zoo-grid-paginator` - remove rendering of all `...` in pagination, only max 1 on each side of active page.

# 6.0.2
Added a11y and animation performance stylelint rules and fixed existing problems in styles.

# 6.0.1
`zoo-navigation` - fix width when using bootstrap.

# 6.0.0
This release mainly concentrates on internal clean-up. Added storybook docs for better documentation.
`zoo-checkbox` - Added storybook docs.
`zoo-feedback` - simplify internal css.
`zoo-grid` - added MutationObserver to give possibility to dynamically change `resizable` and `reorderable` attributes.

## BREAKING CHANGES
`zoo-button` - drop support for deprecated `type` attribute values such as `cold`, `hot`.
`zoo-collapsable-list` - migrated from accepting properties to slots. Consult documentation to see what changed.
`zoo-footer` - migrated from accepting properties to slots. Consult documentation to see what changed.
`zoo-header` - removed support for `imgsrc`, `imgalt` attributes in favor of `<slot name="img"></slot>`. Consult documentation for details.
`zoo-link` - drop support for deprecated `type` attribute values such as `standard`, `green`.
`zoo-radio` - change `errormsg` to `errormsg` as in `zoo-input` and `zoo-select` components.

# 5.3.5
`zoo-searchable-select` - fix `select` styles to behave as a regular select element.

# 5.3.4
`zoo-input` - fix grey background for input with `type="date"` or `type="time"` on android devices. Fixed appearance of `type="date"` and `type="time"` on iOS mobile devices.     
`zoo-searchable-select` - fix showing `select` element when user is using mobile device.

# 5.3.3
`zoo-checkbox` - minor simplification of internal styles;      
`zoo-header` - use more semantically correct HTML tags for elements;      
`zoo-radio` - remove redundant code which accepted template as slotted element;      
`zoo-input-info` - simplify internal css;      

# 5.3.2
`zoo-select`, `zoo-searchable-select` - change color of select arrow when select is in invalid state.
`zoo-navigation` - use more a11y friendly `<nav>` element.
`zoo-input` - do not render link when insufficient params are passed. Remove css that altered native browser behavior.
`zoo-grid` - use darker color for `norecords` slot for bigger contrast.
`zoo-checkbox` - make checkbox body react to click when external label is slotted.
Various documentation improvements regarding a11y.

# 5.3.1
`zoo-checkbox`, `zoo-radio` - simplified internal styles by styling input directly as pseudo-classes for ::slotted() do not work in safari.

# 5.3.0
`zoo-grid` - added option `reorderable` for grid to allow columns reorder.       

## Deprecation
`zoo-grid` - `slot="headercell"` no longer accepts any element, to preserve backward compatibility slotted element will automatically be transformed to `zoo-grid-header`. Use `zoo-grid-header` as a wrapper container when injecting `headercell` slot.

# 5.2.2
remove containment of most of elements that might be used a lot of a single page.      
`zoo-grid` - simplification of internal styles and making `zoo-paginator` a sticky container which sticks to the right side.

# 5.2.1
`zoo-searchable-select` - remove `contain: layout` to fix stacking context. Fix focus/error css borders conflict.       
`zoo-input`, `zoo-select` - fix pixels for icons;

# 5.2.0
`zoo-select`, `zoo-input` - added new `<slot name="selectlabel>` and `<slot name="inputlabel>` respectively for injecting `<label>` element for a11y; `labeltext` attribute is still accepted when you don't care about a11y. Fixed link padding;      
`zoo-checkbox` - added new `<slot name="checkboxlabel>` for injecting `<label>` element for a11y; `labeltext` attribute is still accepted when you don't care about a11y.

# 5.1.2
`zoo-grid` - fix for sorting icon to have fixed size, fix for paginator elements to have dynamic size depending on the page number.

# 5.1.1
`zoo-checkbox` - avoid checkbox jumping when it changes state from/to clicked. Fix setting clicked class on create;      
`zoo-grid` - simplify communication with `zoo-grid-header`, performance improvements when changing column width;       
`zoo-link` - fix padding in `zoo-footer`;      
`zoo-select` - show arrow/cross icons interchangeably when option is(not) selected.

# 5.1.0
`zoo-tooltip` - remove unused css;      
`zoo-toast` - simplify HTML structure;      
`zoo-select` - remove unused variable;      
`zoo-modal` - move element to a separate rendering layer;      
`zoo-link` - remove unnecessary `if` for rendering, simplify css structure; Added new API param `size`      
`zoo-header` - mark logo image with `importance="high"`;      
`zoo-grid` - simplify debounce function, perform resize on next frame;      
`zoo-collapsable-list` - simplify HTML structure;        
Various performance improvements for documentation page.

# 5.0.4
`grid-paginator` - hide page size select when no rows supplied.      
`zoo-button` - simplify internal css structure.

# 5.0.3
`zoo-input-label` - simplification of internal DOM tree.      
`zoo-input-info` - simplification of internal DOM tree.      
`zoo-radio` - simplification of internal DOM tree.      
`zoo-checkbox` - fixed dynamic reflection of changing attributes and fixed `input-info` part to be outside of checkbox border.

# 5.0.2
`zoo-searchable-select` - added `:focus-within` to show focus both on input and select elements;      
`zoo-button` - made API make more sense, new types are `primary`, `secondary` and `hollow`. Previous values `cold` and `hot` are still supported but will be removed in the major release. Showing warning in console when inappropriate type is passed.
`zoo-link` - showing warning in console when inappropriate type is passed.

# 5.0.1
`zoo-spinner` - remove merged `position: relative` from previous version.

# 5.0.0

This release mainly concentrates on internal performance and size improvements and alignment with newer version of the styleguide. The biggest change for library users is change of the names external css custom variables, read on to know more.      

`zoo-grid` - new component for data table presentation.
`zoo-button` - simplify internal css structure, prevent emitting click event when button is disabled. Added new type `hollow`, address docs for example and usage; Aligned with newer version of style guide;
`zoo-checkbox` - simplify internal structure of css. Aligned with newer version of style guide;
`zoo-collapsable-list` - simplify internal css structure, optimize svg;
`zoo-feedback` - use only 1 type of svg for all type of feedback component. Simplify internal css structure;
`zoo-footer` - simplify internal css structure;
`zoo-input` - simplify internal css structure; optimize svg size; align with newer version of style guide; remove redundant valid state related JS;
`zoo-link` - simplify internal css structure; New `type` attribute possible values are: `primary`, `negative` and `grey`;
`zoo-modal` - simplify internal css structure;
`zoo-radio` - simplify internal css structure; remove redundant valid state related JS;
`zoo-searchable-select` - internal css and js optimizations;
`zoo-select` - aligned with newer version of style guide; simplify internal css structure; optimize svgs; internal JS optimizations;
`zoo-toast` - optimize svgs; simplify internal css structure;
`zoo-tooltip` - simplify internal css structure; align with newer version of style guide;


## Breaking changes
`zoo-input` - no longer accepts `nopadding` attribute;
`zoo-link` - no longer accepts `type="standard"` nor `type="green"` attributes, unknown `type` attributes will fall back to `primary` value;

### Theming breaking changes
To override color pallete the following css custom properties can be used:
- Primary color: `--primary-ultralight`, `--primary-light`, `--primary-mid`, `--primary-dark`;
- Secondary color: `--secondary-ultralight`, `--secondary-light`, `--secondary-mid`, `--secondary-dark`;
- Warning/error color: `--warning-ultralight`, `--warning-mid`, `--warning-dark`;
- Success color: `$success-ultralight`, `$success-mid`;
- Info color: `$info-ultralight`, `$info-mid`;

# 4.5.2
`zoo-spinner` - fixed bumping page scrollbar by fixing position of element

# 4.5.1
Fixed a typo in documentation.
`zoo-feedback` - fixed size of icon to have min-width and min-height;

# 4.5.0
`zoo-spinner` - added new component, is a spinner for notifying user that something is loading.

# 4.4.26
`zoo-tooltip` - remove max-width limitation.

# 4.4.25
`zoo-feedback` - added padding for better presentation of one-line feedback text.      
`zoo-modal` - prevent showing scrollbar when it is not needed on windows. Added small padding from bottom for large modal content.      
`zoo-toast` - added breaking words for very long words.      
Update dependencies.     
Update package.json to get rid of unix specific commands so that it can be run on windows.

# 4.4.24
Maintenance release for updating dependencies.

# 4.4.23
Maintenance release for updating dependencies.

# 4.4.22
`zoo-modal`, `zoo-toast`, `zoo-tooltip` - change of z-index property so that `zoo-toast` is above `zoo-modal`.

# 4.4.20
`zoo-modal` - added scroll for modal element when content is too large.

# 4.4.19
`zoo-header` - fix prev version.

# 4.4.18
`zoo-header` - `logoClicked` event is emitted whenever the user clicks image in header.  

# 4.4.16
`zoo-searchable-select` - fixing input not reaacting to change of select `disabled` attribute change.  

# 4.4.13
`zoo-checkbox` - API now reacts to `inputerrormsg` and `infotext` properties just like inputs and selects do.  

# 4.4.12
`zoo-input`, `zoo-select` - fixed grid-gap, which caused inputs and selects to be shorter than checkboxes.  

# 4.4.11
`zoo-input`, `zoo-select` - longer label is not wrapped unnecessarily if there is space in same line (because of absent link)  
 
# 4.4.10
`zoo-checkbox` - changing highlighted border color when checkbox is checked from very start.

# 4.4.9
`zoo-checkbox` - making whole checkbox box react to click event which changes checkbox state.

# 4.4.8
`zoo-input` - decrease line-height to 20px to align input height with other form elements.
`zoo-checkbox` - decrease padding to align input height with other form elements.

# 4.4.7
`zoo-input` - increasing line-height to 22px to align input height with other form elements.

# 4.4.6
`zoo-checkbox` - added default `margin-top: 21px` to align it with other form inputs with label, margin can be overriden by host styles. Changed color for disabled checkbox to grey instead of white for better visual presentation.

# 4.4.5
`zoo-seachable-select` - fixed preloader to show exactly in the middle of the input element.

# 4.4.4
`zoo-radio` - added possibility to add label text for radio inputs group via `labeltext` property.

# 4.4.3
`zoo-toast` - internal change of css rules to allow consumer application to define position of the toast on the screen.

# 4.4.2
`zoo-input` - set margin to 0 for slotted input and textarea.

# 4.4.1
Update dependencies with security issues.

# 4.4.0
`zoo-tooltip` - removed half of the code responsible for positioning and animation. Tooltip now has defined keyframes for fade in. To use is you can do the following:
```
.your-class:hover {
	zoo-tooltip {
		display: block;
		animation: fadeTooltipIn 0.2s;
	}
}
```

# 4.3.4
`zoo-searchable-select` - fix cross icon to position itself within the input field.

# 4.3.3
`zoo-input` - allow click through error triangle.

# 4.3.2
Unify cross sign for `zoo-select` and `zoo-searchable-select`.

# 4.3.1
Remove unused dependency.

# 4.3.0
New set of icons. Getting rid of unnecessary matrix transforms and strange viewports at a cost small size increase.

# 4.2.5
`zoo-searchable-select` - setting `disabled` attribute on input when select has `disabled` attribute.

# 4.2.4
`zoo-select` - increased padding and added text-overflow for very long option text.

# 4.2.3
`zoo-searchable-select` - small refactoring (removing duplicate logic in functions). `handleOptionChange` function is now exported and can be used outside component. `handleOptionChange` is a function which constructs new `placeholder` based on selected options.

# 4.2.2
`zoo-searchable-select` - aligned option click behaviour with `zoo-select`. Now placeholder changes after `change` event and not after `click` event.

# 4.2.0
`zoo-preloader` - reduced preloader size by 2 px;
`zoo-select`, `zoo-searchable-select` - added cross to clear the value of the select. Cross will not appear for `zoo-select` with multiple option set as it can be easily cleared by cmd+click or ctrl+click;

# 4.1.0
Added new component `zoo-preloader`;

# 4.0.11
`zoo-toast` fixed svg icon to be independent of text length.

# 4.0.9
`zoo-seachable-select` improved keyboard user experience while using this element.

# 4.0.8
`zoo-seachable-select` improved keyboard user experience while using this element.
`zoo-input` - type `date` and `time` now doesn't fall back to native inputs but is more styled like other inputs.

# 4.0.7
`zoo-seachable-select` now performs full text scan instead of checking whether something starts with input value.

# 4.0.6
Fixed label alignment for `InputLabel`.

# 4.0.5
Fixed iife prod build not to export classes.

# 4.0.1
`zoo-footer` now accepts `copyright` attribute to show name of the company for example.

# 4.0.0
Included possibility for theming and new component `zoo-collapsable-list`.

# 3.0.1
Added iife export back again. how both `iife` and `esm` versions will be published and the user will decide which one to use.

# 3.0.0
Rename all components from `zoo-log-...` to `zoo-...`.
Project internals cleanup.
Changed export from `iife` to `esm`.

# 2.5.2
`zoo-log-searchable-select` aligned behaviour of multiple and single select elements.

# 2.5.1
`zoo-log-searchable-select` fixed not setting input value on selecting options.

# 2.5.0
Added some interactivity to Button, Link, Modal and Tooltip elements.

# 2.4.4
Various UX improvements.

# 2.4.2
`zoo-log-select` Using single svg for select arrows instead of 2.

# 2.4.2
`zoo-log-radio` extended to handle focus and blur events.

# 2.4.1
`zoo-log-radio` fix error state change when not using `template`.

# 2.4.0
Created `zoo-log-radio`.

# 2.3.5
Extended `zoo-log-checkbox` to handle enter keypress and react to focus event.

# 2.3.4
Wrapped SVGs to preserve static width and height to avoid change of size depending on the size of sibling node text.

# 2.3.3
Optimized size of svg, causing the library to lose 10 Kbytes minified and about 2.5KB gzipped.

# 2.3.2
`zoo-log-select` - reduced the size of arrows and made them more aligned.

# 2.3.1
`zoo-log-searchable-select` placeholder now shows initial placeholder when no options are selected and selected options separated with `,` otherwise.

# 2.3.0
REMOVED `folding` option from `zoo-log-tooltip`.
`zoo-log-searchable-select` now shows tooltip on hover on itself or on the tooltip.

# 2.2.0
`zoo-log-tooltip` now accepts another option `folding`. When `folding` is true, tooltip will have length of 60px and overflow hidden. The content will show up on hover;
Additional minor css fixes for `zoo-log-searchable-select`.

# 2.0.5
`zoo-log-searchable-select` now has a fallback to standard `zoo-log-select` when user is on mobile browser.
Covered all components with tests.
Minor clean-ups here and there.

# 2.0.1
Added `zoo-log-searchable-select` to component lists.

# 2.0.0
BREAKING CHANGE: `zoo-log-header`, `zoo-log-modal` and `zoo-log-navigation` now doesn't accept named slots. Just define slotted content as regular HTMLElement, for example:      
## Before:
```
<zoo-log-navigation class="nav">
	<div slot="content">
		{#each navlinks as link}
			<zoo-log-link href="{link.href}" target="{link.target}" type="{link.type}"
				text="{link.text}">
			</zoo-log-link>
		{/each}
	</div>
</zoo-log-navigation>
```
## After
```
<zoo-log-navigation class="nav">
	<div>
		{#each navlinks as link}
			<zoo-log-link href="{link.href}" target="{link.target}" type="{link.type}"
				text="{link.text}">
			</zoo-log-link>
		{/each}
	</div>
</zoo-log-navigation>
```

# 1.2.0
BREAKING CHANGE: refer to README.md for Button element as the slots for that element has changed. Now the `<button>` element is embedded inside web-component, while the content of the button can still be injected from external source.
