<svelte:options tag="zoo-button"></svelte:options>
<div class="box">
	<button disabled={disabled ? true : null} class="{type} {size} btn" type="button" on:click="{e => disabled ? e.preventDefault() : ''}">
		<slot name="buttoncontent"></slot>
	</button>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		display: block;
		max-width: 330px;
		contain: layout;
	}

	.box {
		position: relative;
	}

	.btn {
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
		padding: 0 20px;

		&.hollow {
			border: $stroked-box-primary-bold;
			color: var(--primary-mid, #{$primary-mid});
			background: transparent;
		}

		&.hot {
			background-image: linear-gradient(left, var(--secondary-mid, #{$secondary-mid}), var(--secondary-light, #{$secondary-light}));
			background-image: -webkit-linear-gradient(left, var(--secondary-mid, #{$secondary-mid}), var(--secondary-light, #{$secondary-light}));

			&:hover, &:focus {
				background: var(--secondary-mid, #{$secondary-mid});
			}

			&:active {
				background: var(--secondary-dark, #{$secondary-dark});
			}
		}

		&.cold {
			background-image: linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));
			background-image: -webkit-linear-gradient(left, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));
		}

		&.cold, &.hollow {
			&:hover, &:focus {
				background: var(--primary-mid, #{$primary-mid});
				color: $white;
			}

			&:active {
				background: var(--primary-dark, #{$primary-dark});
				color: $white;
			}
		}

		&:disabled {
			background: $grey-ultralight;
			color: $grey-mid;
			border: $stroked-box-grey-light;

			&:hover, &:focus, &:active {
				cursor: not-allowed;
				background: $grey-ultralight;
				color: $grey-mid;
			}
		}

		&:active {
			transform: translateY(1px);
		}

		&.small {
			min-height: 36px;
		}

		&.medium {
			min-height: 46px;
		}
	}
</style>

<script>
	export let type = "cold"; //'hot', 'hollow'
	export let size = "small"; //'medium'
	export let disabled = false;
</script>