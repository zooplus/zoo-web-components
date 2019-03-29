<svelte:options tag="app-context"></svelte:options>
<div class="context">
	<h2>{text}</h2>
</div>

<style>
	.context {
		height: 80px;
		display: flex;
		align-items: center;
		margin-left: 20px;
	}
	h2 {
		color: var(--main-color, #3C9700);
	}
</style>

<script> 
	export let text = '';
</script>