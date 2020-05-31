<section>
	<h2>{text}</h2>
	{#if backbtn}
		<div class="back-btn">
			<zoo-button on:click={() => {document.querySelector('zoo-header').scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})}}>
				<span slot="buttoncontent">Go to top</span>
			</zoo-button>
		</div>
	{/if}
</section>

<style>
	section {
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
	}
</style>

<script> 
	export let text = '';
	export let backbtn = false;
</script>