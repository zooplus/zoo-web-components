<svelte:options tag="zoo-collapsable-list"></svelte:options>
<div class="box">
	<ul>
		{#each items as item, idx}
			<li class="item" class:active="{_items && _items[idx].active}"> 
				<span class="header" on:click="{e => handleItemHeaderClick(e, idx)}">
					{item.header}
					<svg width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/><path fill="none" d="M0 0h24v24H0V0z"/></svg>
				</span>
				<slot name="item{idx}"></slot>
			</li>
		{/each}
	</ul>
</div>

<style type="text/scss">
	@import "variables";

	.item ::slotted(*) {
		display: none;
	}

	.item.active ::slotted(*) {
		display: initial;
	}

	ul {
		padding: 0;
	}

	.item {
		position: relative;
		color: $grey;
		list-style-type: none;
		padding: 0 10px;
		border: 0px solid black;

		.header {
			display: flex;
			align-items: center;
			height: 8px;
			padding: 20px 0;
			font-size: 14px;
			line-height: 20px;
			color: var(--main-color, #{$main-color});
			font-weight: bold;
			cursor: pointer;

			svg {
				display: flex;
				margin-left: auto;
				fill: var(--main-color, #{$main-color});
				transition: transform 0.3s;
			}
		}

		&.active {
			border: 1px solid rgba(0, 0, 0, 0.2);

			.header {
				color: var(--main-color-dark, #{$main-color-dark});

				svg {
					fill: var(--main-color-dark, #{$main-color-dark});
					transform: rotateX(180deg);
				}
			}
		}
	}
</style>

<script>
	import { beforeUpdate } from 'svelte';
	export let items = [];
	export let highlighted = true;
	let _items;
	beforeUpdate(() => {
		if (_items != items) {
			_items = items;
		}
	});

	const handleItemHeaderClick = (e, id) => {
		if (_items[id].active) {
			_items[id].active = false;
		} else {
			clearActiveStatus();
			_items[id].active = true;
		}
	}

	const clearActiveStatus = () => {
		for (const item of _items) {
			item.active = false;
		}
	}
</script>