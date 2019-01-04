# Modal module

## API
-----

## Slots
This component accept one `<slot name="content"></slot>` which is replaced with provided `HTMLElement` element so that you can catch events from this element.       
Just add `slot` attribute to the `HTMLElement` you provide for this component, like so: `<div slot="content">I am a div!</div>`;

## Example usage 
```
<zoo-log-navigation class="nav" ref:nav>
	<div slot="content">
		{#each navlinks as link}
			<zoo-log-link href="{link.href}" target="{link.target}" type="{link.type}"
				text="{link.text}">
			</zoo-log-link>
		{/each}
	</div>
</zoo-log-navigation>
```
OR
```
<zoo-log-navigation class="nav">
	<div slot="content" class="navigation-content">
		<div class="nav-link" *ngFor="let nav of navs" [routerLink]="nav.href" [routerLinkActive]="'active'">
			<span>{{nav.text}}</span>
		</div>
	</div>
</zoo-log-navigation>
```