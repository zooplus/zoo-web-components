# Modal module

## API
-----

## Slots
This component accept one `<slot name="content"></slot>` which is replaced with provided `HTMLElement` element so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: `<div>I am a div!</div>`;

## Example usage 
```
<zoo-navigation class="nav" ref:nav>
	<div>
		{#each navlinks as link}
			<zoo-link href="{link.href}" target="{link.target}" type="{link.type}"
				text="{link.text}">
			</zoo-link>
		{/each}
	</div>
</zoo-navigation>
```
OR
```
<zoo-navigation class="nav">
	<div class="navigation-content">
		<div class="nav-link" *ngFor="let nav of navs" [routerLink]="nav.href" [routerLinkActive]="'active'">
			<span>{{nav.text}}</span>
		</div>
	</div>
</zoo-navigation>
```