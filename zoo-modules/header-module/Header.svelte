<svelte:options tag="zoo-header"></svelte:options>
<div class="header-box">
	{#if imgsrc}<img class="app-logo" src="{imgsrc}" alt="zooplus"/>{/if}
	{#if headertext}<span class="app-name">{headertext}</span>{/if}
	<slot></slot>
</div>

<style type='text/scss'>
	@import "variables";
	:host {
		contain: style;
	}
	.header-box {
	  display: flex;
	  align-items: center;
	  background: $white;
	  padding: 0 25px;
	  height: 70px;

	  .app-logo {
		height: 46px;
		display: inline-block;
		padding: 5px 25px 5px 0;
		@media only screen and (max-width: 544px) {
			height: 36px;
		}
	  }

	  .app-name {
		display: inline-block;
	    color: $main-color;
		font-size: 21px;
		padding: 0 25px 0 0;
		line-height: 16px;
		font-weight: 400;
		@media only screen and (max-width: 544px) {
			display: none;
		}
	  }
	}
</style>

<script>
	export let headertext = '';
	export let imgsrc = '';
</script>