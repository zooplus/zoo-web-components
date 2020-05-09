<svelte:options tag="zoo-tooltip"></svelte:options>
<div class="box {position}">
	<div class="tooltip-content">
		<slot>
			{#if text}<span class="text">{text}</span>{/if}
		</slot>
	</div>
	<div class="tip {position}"></div>	
</div>

<style type='text/scss'>
	@import "variables";
	:host {
		display: flex;
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 10000;
		left: 0;
		bottom: 0;
		pointer-events: none;
		line-height: initial;
		font-size: initial;
		font-weight: initial;
		contain: layout;
		justify-content: center;
	}

	.box {
		pointer-events: initial;
		box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.12), 0 2px 12px 0 rgba(0, 0, 0, 0.12);
		border-radius: 3px;
		position: absolute;
		transform: translate(0%, -50%);

		&.top {
			bottom: calc(100% + 11px);
			right: 50%;
			transform: translate3d(50%, 0, 0);
		}

		&.right {
			left: calc(100% + 10px);
			top: 50%;
		}

		&.bottom {
			top: 100%;
			right: 50%;
			transform: translate3d(50%,20%,0);
		}

		&.left {
			right: calc(100% + 11px);
			top: 50%;
		}

		.tooltip-content {
			padding: 10px;
			font-size: $p1-size;
			position: relative;
			z-index: 1;
			background: white;
			border-radius: 3px;

			.text {
				white-space: pre;
				color: black;
			}
		}

		.tip {
			position: absolute;

			&:after {
				content: "";
				width: 16px;
				height: 16px;
				position: absolute;
				box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.12), 0 2px 12px 0 rgba(0, 0, 0, 0.12);
				top: -8px;
				transform: rotate(45deg);
				z-index: 0;
				background: white;
			}

			&.top, &.bottom {
				right: calc(50% + 8px);
			}

			&.right {
				bottom: 50%;
				left: -8px;
			}

			&.bottom {
				top: 0;
			}

			&.left {
				bottom: 50%;
				right: 8px;
			}
		}
	}
	@keyframes fadeTooltipIn {
		from { opacity: 0; }
		
		to { opacity: 1; }
	}
</style>

<script>
	export let text = '';
	export let position = 'top'; // left, right, bottom
</script>