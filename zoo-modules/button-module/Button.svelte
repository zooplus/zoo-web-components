<svelte:options tag="zoo-button"></svelte:options>
<div class="box">
	<button disabled={disabled ? true : null} class="{type} {size} zoo-btn" type="button">
		<slot name="buttoncontent"></slot>
	</button>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		width: 100%;
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
			border-radius: 5px;
			cursor: pointer;
			width: 100%;
			height: 100%;
			font-size: 14px;
			font-weight: bold;
			text-align: center;

			&.hollow {
				border: 2px solid var(--main-color, #{$main-color});
				color: var(--main-color, #{$main-color});
				background: transparent;
			}

			&.hot {
				background-image: linear-gradient(left, var(--secondary-color, #{$secondary-color}), var(--secondary-color-light, #{$secondary-color-light}));
				background-image: -webkit-linear-gradient(left, var(--secondary-color, #{$secondary-color}), var(--secondary-color-light, #{$secondary-color-light}));

				&:hover, &:focus {
					background: var(--secondary-color, #{$secondary-color});
				}

				&:active {
					background: var(--secondary-color-dark, #{$secondary-color-dark});
				}
			}

			&.cold {
				background-image: linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
				background-image: -webkit-linear-gradient(left, var(--main-color, #{$main-color}), var(--main-color-light, #{$main-color-light}));
			}

			&.cold, &.hollow {
				&:hover, &:focus {
					background: var(--main-color, #{$main-color});
					color: white;
				}

				&:active {
					background: var(--main-color-dark, #{$main-color-dark});
					color: white;
				}
			}

			&:disabled {
				background: $anti-flash-white;
				color: #7a7a7a;
				border: 1px solid $whisper;

				&:hover, &:focus, &:active {
					cursor: not-allowed;
					background: $anti-flash-white;
					color: #7a7a7a;
				}
			}

			&:active {
				transform: translateY(1px);
			}

			&.small {
				font-size: 14px;
				line-height: 36px !important;
				padding: 0 8px;
			}

			&.medium {
				font-size: 14px;
				line-height: 46px !important;
				padding: 0 12px;
			}

			&.big {
				font-size: 16px;
				line-height: 56px !important;
				padding: 0 16px;
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
	export let size = "small"; //'medium', 'big',
	export let disabled = false;
</script>