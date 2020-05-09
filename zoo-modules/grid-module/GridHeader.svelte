<svelte:options tag="zoo-grid-header"></svelte:options>
<div class="box" bind:this={gridHeaderRoot}>
	<slot></slot>
	<svg class="sort-arrow" sortstate={sortState} on:click="{() => handleSortClick()}" width="24" height="24" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
</div>

<style type='text/scss'>
	.box {
		display: flex;
		align-items: center;

		.sort-arrow {
			width: 20px;
			opacity: 0;
			transform: rotate(0deg);
			transition: opacity 0.1s;
			cursor: pointer;

			&:hover {
				opacity: 1;
			}

			&:active {
				opacity: 0.5;
			}
		}

		.sort-arrow[sortstate='asc'] {
			transform: rotate(180deg);
			opacity: 1;

			&:active {
				opacity: 0.5;
			}
		}

		.sort-arrow[sortstate='desc'] {
			opacity: 1;

			&:active {
				opacity: 0.5;
			}
		}
	}
</style>

<script>
	import { onMount } from 'svelte';

	let sortState = 'none';
	let gridHeaderRoot;
	let host;

	onMount(() => {
		host = gridHeaderRoot.getRootNode().host;
	});

	const handleSortClick = () => {
		if (sortState == 'none') {
			sortState = 'desc';
		} else if (sortState == 'desc') {
			sortState = 'asc';
		} else if (sortState = 'asc') {
			sortState = 'none';
		}
		host.dispatchEvent(new Event('sortChange', {sortState: sortState}));
	}

</script>