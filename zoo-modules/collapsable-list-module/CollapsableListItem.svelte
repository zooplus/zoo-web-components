<svelte:options tag="zoo-collapsable-list-item"/>
<div class="header">
	<slot name="header"></slot>
	<svg width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
</div>
<slot name="content"></slot>

<style type="text/scss">
	@import 'variables';

	:host {
		padding: 0 10px;
		display: flex;
		flex-direction: column;
	}

	:host([active]) {
		border: 1px solid var(--primary-mid, #{$primary-mid});
		border-radius: 3px;
	}

	.header {
		display: flex;
		cursor: pointer;
	}

	::slotted(*[slot="header"]) {
		display: inline-flex;
		color: var(--primary-mid, #{$primary-mid});
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: bold;
		align-items: center;
		padding: 20px 0;
	}

	:host([active]) ::slotted(*[slot="header"]) {
		color: var(--primary-dark, #{$primary-dark});
	}

	::slotted(*[slot="content"]) {
		display: none;
	}

	:host([active]) ::slotted(*[slot="content"]) {
		display: initial;
	}

	svg {
		display: inline-flex;
		margin-left: auto;
		fill: var(--primary-mid, #{$primary-mid});
		transition: transform 0.3s;
		padding: 20px 0;
	}

	:host([active]) svg {
		fill: var(--primary-dark, #{$primary-dark});
		transform: rotateX(180deg);
	}
</style>