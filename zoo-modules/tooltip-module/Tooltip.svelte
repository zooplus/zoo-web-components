<svelte:options tag="zoo-log-tooltip"></svelte:options>
<div class="tooltip-box {position}">
	<div class="tooltip-content">
		<slot>
			{#if text}<div class="text">{text}</div>{/if}
		</slot>
	</div>
	<div class="tip {position}"></div>	
</div>

<style type='text/scss'>
	@import "variables";
	:host {
	  position: absolute;
	  width: 100%;
	  height: 100%;
	  z-index: 2;
	  left: 0;
	  bottom: 0;
	  pointer-events: none;
	  line-height: initial;
	  font-size: initial;
	  font-weight: initial;
	  contain: layout;
	}
	.tooltip-box {
		pointer-events: initial;
		box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.12), 0 2px 12px 0 rgba(0, 0, 0, 0.12);
		border-radius: 3px;
		position: absolute;
		&.left {
			left: 0%;
			top: 50%;
			margin-left: -18px;
			transform: translateX(-100%) translateY(-50%);
		}
		&.right {
			left: 100%;
			top: 50%;
			margin-left: 14px;
			transform: translateX(0%) translateY(-50%);
		}
		&.bottom {
			top: 100%;
			right: 0;
			transform: translateX(0) translateY(10%);
		}
		&.top {
			bottom: calc(100% + 14px);
		}
	}
	.tooltip-content {
	  padding: 10px;
	  font-size: 16px;
	  position: relative;
	  z-index: 1;
	  background: white;
	  border-radius: 3px;
	}
	.tip {
		position: absolute;
		right: 50%;
		width: 16px;
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
		&.right {
			bottom: 50%;
    		left: -8px;
			right: 100%;
		}
		&.left {
			bottom: 50%;
    		right: 8px;
			width: 0px;
		}
		&.bottom {
			top: 0;
			width: 0px;
			right: calc(50% + 8px);
		}
		&.top {
			width: 0;
			right: calc(50% + 8px);
		}
	}
</style>

<script>
	export let text = "";
	export let position = 'top'; // left, right, bottom
</script>