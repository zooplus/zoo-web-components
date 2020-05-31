<svelte:options tag="zoo-button"/>
<button {disabled} class="{type} {size}" type="button" on:click="{e => disabled ? e.preventDefault() : ''}">
	<slot name="buttoncontent"></slot>
</button>

<style type='text/scss'>
	@import "variables";

	:host {
		display: block;
		max-width: 330px;
		position: relative;
	}

	button {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		color: $white;
		border: 0;
		border-radius: $input-border-radius;
		cursor: pointer;
		width: 100%;
		height: 100%;
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: bold;
		text-align: center;
		background-image: linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));
		background-image: -webkit-linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));

		&:hover, &:focus {
			background: var(--primary-mid, #{$primary-mid});
		}

		&:active {
			background: var(--primary-dark, #{$primary-dark});
			transform: translateY(1px);
		}

		&:disabled {
			background: $grey-ultralight;
			color: $grey-mid;
			border: $stroked-box-grey-light;
			cursor: not-allowed;

			&:hover, &:focus, &:active {
				cursor: not-allowed;
				background: $grey-ultralight;
				color: $grey-mid;
			}
		}
	}

	.secondary {
		background-image: linear-gradient(left, var(--secondary-mid, #{$secondary-mid}), var(--secondary-light, #{$secondary-light}));
		background-image: -webkit-linear-gradient(left, var(--secondary-mid, #{$secondary-mid}), var(--secondary-light, #{$secondary-light}));

		&:hover, &:focus {
			background: var(--secondary-mid, #{$secondary-mid});
		}

		&:active {
			background: var(--secondary-dark, #{$secondary-dark});
		}
	}

	.hollow {
		border: $stroked-box-primary-bold;
		color: var(--primary-mid, #{$primary-mid});
		background: transparent;

		&:hover, &:focus, &:active {
			color: $white;
		}
	}

	.small {
		min-height: 36px;
	}

	.medium {
		min-height: 46px;
	}

	::slotted(*) {
		padding: 0 20px;
	}
</style>

<script>
	export let type = "primary"; //'secondary', 'hollow'
	export let size = "small"; //'medium'
	export let disabled = false;
</script>