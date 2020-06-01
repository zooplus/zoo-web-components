<svelte:options tag="zoo-grid-header"/>
<div class="box" bind:this={gridHeaderRoot} class:sortable={sortable}>
	<slot></slot>
	<svg class="arrow" sortstate={sortState} on:click="{() => handleSortClick()}" width="24" height="24" viewBox="0 0 24 24">
		<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
	</svg>
	<svg {reorderable} on:mousedown="{toggleHostDraggable}" class="swap" viewBox="0 0 24 24" width="18" height="18">
		<path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 11l-4 4 4 4v-3h7v-2H7v-3zm14-2l-4-4v3h-7v2h7v3l4-4z"/>
	</svg>
</div>

<style type='text/scss'>
	@import 'variables';

	:host {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.box {
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;

		&:hover, &:focus {
			.arrow {
				opacity: 1;
			}

			.swap {
				opacity: 1;
			}
		}
	}

	.box.sortable .arrow, .swap[reorderable] {
		display: flex;
	}

	.arrow, .swap {
		display: none;
		min-width: 20px;
		width: 20px;
		opacity: 0;
		transition: opacity 0.1s;
		margin-left: 5px;
		border-radius: $input-border-radius;
		background: $grey-ultralight;
	}

	.arrow {
		cursor: pointer;
		transform: rotate(0deg);
	}

	.swap {
		cursor: grab;

		&:active {
			cursor: grabbing;
		}
	}

	.arrow[sortstate='asc'] {
		transform: rotate(180deg);
	}

	.arrow[sortstate='desc'], .arrow[sortstate='asc'] {
		opacity: 1;
		background: $grey-ultralight;
	}

	.box .arrow, .arrow[sortstate='desc'], .arrow[sortstate='asc'] {
		&:active {
			opacity: 0.5;
			transform: translateY(1px);
		}
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let sortState = undefined;
	export let sortable = false;
	export let reorderable = undefined;
	let gridHeaderRoot;
	let host;

	onMount(() => {
		host = gridHeaderRoot.getRootNode().host;
		host.addEventListener('dragend', () => host.setAttribute('draggable', false));
	});

	const handleSortClick = () => {
		if (!sortState) {
			sortState = 'desc';
		} else if (sortState == 'desc') {
			sortState = 'asc';
		} else if (sortState = 'asc') {
			sortState = undefined;
		}
		host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: sortState, header: host}, bubbles: true}));
	}

	const toggleHostDraggable = () => host.setAttribute('draggable', true);

</script>