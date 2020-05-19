<svelte:options tag="zoo-grid-header"></svelte:options>
<div class="box" bind:this={gridHeaderRoot}>
	<slot></slot>
	<svg class="arrow" sortstate={sortState} on:click="{() => handleSortClick()}" width="24" height="24" viewBox="0 0 24 24">
		<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
	</svg>
</div>

<style type='text/scss'>
	@import "variables";

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

		&:hover .arrow {
			opacity: 1;
			background: $grey-ultralight;
		}
	}

	.arrow {
		min-width: 20px;
		width: 20px;
		opacity: 0;
		transform: rotate(0deg);
		transition: opacity 0.1s;
		cursor: pointer;
		margin-left: 5px;
		border-radius: $input-border-radius;
	}

	.arrow[sortstate='asc'] {
		transform: rotate(180deg);
	}

	.arrow[sortstate='desc'], .arrow[sortstate='asc'] {
		opacity: 1;
		background: $grey-ultralight;
	}

	.arrow, .arrow[sortstate='desc'], .arrow[sortstate='asc'] {
		&:active {
			opacity: 0.5;
		}
	}
</style>

<script>
	export let sortState = undefined;
	let gridHeaderRoot;

	const handleSortClick = () => {
		if (!sortState) {
			sortState = 'desc';
		} else if (sortState == 'desc') {
			sortState = 'asc';
		} else if (sortState = 'asc') {
			sortState = undefined;
		}
		gridHeaderRoot.getRootNode().host.dispatchEvent(new CustomEvent('sortChange', {detail: {sortState: sortState}, bubbles: true}));
	}

</script>