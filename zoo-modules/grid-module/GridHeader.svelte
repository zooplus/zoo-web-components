<svelte:options tag="zoo-grid-header"></svelte:options>
<div class="box" bind:this={gridHeaderRoot}>
	<slot></slot>
	<svg class="sort-arrow" sortstate={sortState} on:click="{() => handleSortClick()}" width="24" height="24" viewBox="0 0 24 24"><path d="M11.8 4.2C12.1 4.5 12.1 5 11.8 5.3L5.6 11.5 20.4 11.5C20.7 11.5 21 11.8 21 12.3 21 12.7 20.7 13 20.4 13L5.6 13 11.8 19.2C12.1 19.5 12.1 20 11.8 20.3 11.5 20.6 11 20.6 10.7 20.3L3.4 13C3.2 12.9 3 12.6 3 12.3 3 12.3 3 12.3 3 12.3 3 12.3 3 12.3 3 12.3L3 12.2C3 12.2 3 12.2 3 12.2L3 12.3C3 11.9 3.2 11.6 3.4 11.5L10.7 4.2C11 3.9 11.5 3.9 11.8 4.2Z"/></svg>
</div>

<style type='text/scss'>
	.box {
		display: flex;
		align-items: center;

		.sort-arrow {
			width: 20px;
			opacity: 0;
			transform: rotate(-90deg);
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
			transform: rotate(90deg);
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