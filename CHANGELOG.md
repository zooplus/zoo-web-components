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