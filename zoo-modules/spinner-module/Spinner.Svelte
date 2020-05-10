<svelte:options tag="zoo-spinner"></svelte:options>
<svg class="spinner" viewBox="25 25 50 50">
	<circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="2.5" stroke-miterlimit="10"/>
</svg>

<style type='text/scss'>
	@import "variables";

	.spinner {
		position: absolute;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		height: 140px;
		width: 140px;
		margin: auto;
		transform-origin: center center;
		animation: rotate 2s linear infinite;
		z-index: 100000;

		.path {
			animation: dash 1.5s ease-in-out infinite;
			stroke: var(--primary-mid, #{$primary-mid});
			stroke-dasharray: 1, 200;
			stroke-dashoffset: 0;
			stroke-linecap: round;
		}
	}

	@keyframes rotate {
		100% {
			transform: rotate(360deg);
		}
	}
	@keyframes dash {
		0% {
			stroke-dasharray: 1, 200;
			stroke-dashoffset: 0;
		}

		50% {
			stroke-dasharray: 89, 200;
			stroke-dashoffset: -35px;
		}

		100% {
			stroke-dasharray: 89, 200;
			stroke-dashoffset: -124px;
		}
	}
</style>
