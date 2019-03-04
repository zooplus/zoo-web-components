<svelte:options tag="zoo-log-modal"></svelte:options>
<div class="box {hidden ? 'hide' : 'show'}" bind:this={_modalRoot}>
	<div class="dialog-content">
		<div class="heading">
			<h2>{headertext}</h2>
			<div class="close" on:click="{event => hideModal(event)}">
				<svg width="35" height="35" viewBox="50 0 1050 1001"><path d="m501 442l-137-137c-16-16-43-16-59 0s-16 43 0 59l137 137-137 137c-16 16-16 43 0 59 16 16 43 16 59 0l137-137 137 137c16 16 43 16 59 0 16-16 16-43 0-59l-137-137 137-137c16-16 16-43 0-59-16-16-43-16-59 0l-137 137z"/></svg>
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
		.dialog-content {
			padding: 30px 40px;
			box-sizing: border-box;
			background: white;
			.heading {
				display: flex;
				flex-direction: row;
				align-items: flex-start;
				.close {
					cursor: pointer;
					margin-left: auto;
					font-size: 40px;
					padding-left: 15px;
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
	}
	.box.show {
		opacity: 1;
	}
	.box.hide {
		opacity: 0;
	}
	.box .dialog-content {
		animation-duration: 0.3s;
		animation-fill-mode: forwards;
	}
	.box.show .dialog-content {
		animation-name: anim-show;
	}
	.box.hide .dialog-content {
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

	onMount(() => {
		host = _modalRoot.getRootNode().host;
	    _modalRoot.addEventListener("click", event => {
			if (event.target == _modalRoot) {
				closeModal();
			}
	    });
	});
	const hideModal = (event) => {
		closeModal();
	}
	const closeModal = () => {
		hidden = !hidden;
		setTimeout(() => {
			host.style.display = "none";
			host.dispatchEvent(new Event("modalClosed"));
			hidden = !hidden;
		}, 300);
	}
</script>