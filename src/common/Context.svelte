<svelte:options tag="app-context"></svelte:options>
<div class="context">
	<h2>{text}</h2>
	{#if backbtn}
		<div class="back-btn">
			<zoo-button>
				<span slot="buttoncontent"><a href="#">Go to top</a></span>
			</zoo-button>
		</div>
	{/if}
</div>

<style>
	.context {
		min-height: 80px;
		display: flex;
		align-items: center;
		margin-left: 20px;
		background: white;
	}

	.back-btn {
		margin-left: 5px;
	}
	
	.back-btn a {
		text-decoration: none;
		color: white;
	}

	h2 {
		color: var(--primary-mid, #3C9700);
		font-size: 23px;
	}
</style>

<script> 
	export let text = '';
	export let backbtn = false;
</script>