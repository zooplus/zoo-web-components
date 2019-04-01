<svelte:options tag="zoo-tooltip"></svelte:options>
<div bind:this={_tooltipRoot} class="box {position} {hidden ? 'hide' : 'show'}">
	<div class="tooltip-content">
		<slot>
			{#if text}<span class="text">{text}</span>{/if}
		</slot>
	</div>
	<div class="tip {position}" bind:this={tip}></div>	
</div>

<style type='text/scss'>
	:host {
		display: flex;
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 9999;
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
		transition: opacity 0.3s, transform 0.3s;
	}

	.box.hide {
		opacity: 0;

		&.top {transform: translate3d(0,10%,0);}

		&.right {transform: translate3d(18%,-50%,0);}

		&.bottom {transform: translate3d(50%,30%,0);}

		&.left {transform: translate3d(-120%,-50%,0);}
	}

	.box.show {
		pointer-events: initial;
		box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.12), 0 2px 12px 0 rgba(0, 0, 0, 0.12);
		border-radius: 3px;
		position: absolute;
		max-width: 150%;
		opacity: 1;

		&.top {
			bottom: calc(100% + 14px);
		}

		&.right {
			left: 98%;
			top: 50%;
			transform: translate3d(8%,-50%,0);
		}

		&.bottom {
			top: 98%;
			right: 50%;
			transform: translate3d(50%,20%,0);
		}

		&.left {
			left: 2%;
			top: 50%;
			transform: translate3d(-110%,-50%,0);
		}
	}

	.tooltip-content {
		padding: 10px;
		font-size: 15px;
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

		&.top {
			width: 0;
			right: calc(50% + 8px);
		}

		&.right {
			bottom: 50%;
			left: -8px;
			right: 100%;
		}

		&.bottom {
			top: 0;
			width: 0px;
			right: calc(50% + 8px);
		}

		&.left {
			bottom: 50%;
			right: 8px;
			width: 0px;
		}
	}
</style>

<script>
	import { onMount, onDestroy } from 'svelte';

	export let text = '';
	export let position = 'top'; // left, right, bottom
	let _tooltipRoot;
	let observer;
	let documentObserver;
	let tip;
	let hidden = true;
	onMount(() => {
		const options = {
			root: _tooltipRoot.getRootNode().host,
			rootMargin: '150px',
			threshold: 1.0
		}
		const documentOptions = {
			root: document.body,
			rootMargin: '150px',
			threshold: 1.0
		}
		observer = new IntersectionObserver(callback, options);
		observer.observe(tip);
		documentObserver = new IntersectionObserver(documentCallback, documentOptions);
		documentObserver.observe(_tooltipRoot);
	});
	// good enough for v1 I guess....
	const documentCallback = (entries, observer) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const ir = entry.intersectionRect;
				const bcr = entry.boundingClientRect;
				switch(position) {
					case 'top':
						if (entry.intersectionRect.top < 0) position = 'bottom';
						break;
					case 'right':
						if (ir.right + ir.width > window.innerWidth) position = 'top';
						break;
					case 'bottom':
						if (bcr.bottom > window.innerHeight) position = 'top';
						break;
					case 'left':
						if (entry.intersectionRect.left < -25) position = 'top';
						break;
				}
			}
		});
	}
	const callback = (entries, observer) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				hidden = false;
			} else {
				hidden = true;
			}
		});
	}
	onDestroy(() => {
		observer.disconnect();
		documentObserver.disconnect();
	});
</script>