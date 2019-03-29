<svelte:options tag="zoo-navigation"></svelte:options>
<div class="box">
	<slot></slot>
</div>

<style type='text/scss'>
	@import "variables";
	.box {
	  height: 56px;
	  background-image: linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
	  background-image: -webkit-linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
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