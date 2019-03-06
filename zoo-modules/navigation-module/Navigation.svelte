<svelte:options tag="zoo-navigation"></svelte:options>
<div class="nav-box zoo-navigation">
	<slot>
	</slot>
</div>

<style type='text/scss'>
	@import "variables";
	.nav-box {
	  height: 56px;
	  background-image: linear-gradient(left, $main-color, $main-color-light);
	  background-image: -webkit-linear-gradient(
	    left,
	    $main-color,
	    $main-color-light
	  );
	}
	.zoo-navigation > *:first-child {
		display: flex;
		flex-direction: row;
		height: 100%;
		overflow: auto;
		overflow-y: hidden;
		padding: 0 20px;
	}
	::slotted(*:first-child) {
		display: flex;
		flex-direction: row;
		height: 100%;
		overflow: auto;
		overflow-y: hidden;
		padding: 0 20px;
	}
</style>