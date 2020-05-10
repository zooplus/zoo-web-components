<svelte:options tag="zoo-button"></svelte:options>
<div class="box">
	<button disabled={disabled ? true : null} class="{type} {size} zoo-btn" type="button">
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
		width: 100%;
		height: 100%;

		.zoo-btn {
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
			font-weight: bold;
			text-align: center;
			padding: 0 20px;
			line-height: $p1-line-height;

			&.hollow {
				border: 2px solid var(--primary-mid, #{$primary-mid});
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
				color: #7a7a7a;
				border: 1px solid $grey-light;

				&:hover, &:focus, &:active {
					cursor: not-allowed;
					background: $grey-ultralight;
					color: #7a7a7a;
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

			// getting any first direct child
			::slotted(*:first-child) {
				width: 100%;
				height: 100%;
				border: none;
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: center;
				overflow: hidden;
			}
		}
	}
</style>

<script>
	export let type = "cold"; //'hot', 'hollow'
	export let size = "small"; //'medium'
	export let disabled = false;
</script>