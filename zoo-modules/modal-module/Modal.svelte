<svelte:options tag="zoo-modal"></svelte:options>
<div class="box {hidden ? 'hide' : 'show'}" bind:this={_modalRoot}>
	<div class="dialog-content">
		<div class="heading">
			<span class="header-text">{headertext}</span>
			<div class="close" on:click="{event => closeModal()}">
				<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/></svg>
			</div>
		</div>
		<div class="content">
			<slot></slot>
		</div>
	</div>
</div>

<style type='text/scss'>
	@import "variables";

	:host {
		display: none;
		contain: style;
	}

	.box {
		position: fixed;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		opacity: 0;
		transition: opacity 0.3s;
		z-index: 9999;
		left: 0;
		top: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		will-change: opacity;
		transform: translateZ(0);
	}

	.dialog-content {
		padding: 0 20px 20px 20px;
		box-sizing: border-box;
		background: white;
		overflow-y: auto;
		max-height: 95%;
		border-radius: $input-border-radius;

		.heading {
			display: flex;
			flex-direction: row;
			align-items: flex-start;

			.header-text {
				font-size: $h2-size;
				line-height: $h2-line-height;
				font-weight: bold;
				margin: 30px 0;
			}

			.close {
				cursor: pointer;
				margin: 30px 0 30px auto;

				path {
					fill: var(--primary-mid, #{$primary-mid});
				}
			}
		}

		@media only screen and (max-width: 544px) {
			padding: 25px;
		}
		@media only screen and (max-width: 375px) {
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			transform: none;
		}
	}

	.show {
		opacity: 1;
	}

	.hide {
		opacity: 0;
	}

	.dialog-content {
		animation-duration: 0.3s;
		animation-fill-mode: forwards;
	}

	.show .dialog-content {
		animation-name: anim-show;
	}

	.hide .dialog-content {
		animation-name: anim-hide;
	}
	@keyframes anim-show {
		0% { 
			opacity: 0;
			transform: scale3d(0.9, 0.9, 1);
		}

		100% {
			opacity: 1; 
			transform: scale3d(1, 1, 1);
		}
	}
	@keyframes anim-hide {
		0% {
			opacity: 1;
		}

		100% {
			opacity: 0;
			transform: scale3d(0.9, 0.9, 1);
		}
	}
</style>

<script>
	import { onMount } from 'svelte';

	export let headertext = '';
	let _modalRoot;
	let host;
	let hidden = false;
	let timeoutVar;

	onMount(() => {
		host = _modalRoot.getRootNode().host;
	    _modalRoot.addEventListener("click", event => {
			if (event.target == _modalRoot) {
				closeModal();
			}
	    });
	});
	export const openModal = () => {
		host.style.display = 'block';
	}
	export const closeModal = () => {
		if (timeoutVar) return;
		hidden = !hidden;
		timeoutVar = setTimeout(() => {
			host.style.display = 'none';
			host.dispatchEvent(new Event("modalClosed"));
			hidden = !hidden;
			timeoutVar = undefined;
		}, 300);
	}
</script>