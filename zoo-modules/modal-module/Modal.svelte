<svelte:options tag="zoo-log-modal"></svelte:options>
<div class="box" on:click="{e => e.stopPropagation()}" bind:this={_modalRoot}>
	<div class="heading">
		<h2>{headertext}</h2>
		<div class="close" on:click="{event => hideModal(event)}">
			<svg width="35" height="35" viewBox="50 0 1050 1001">
				<path transform="matrix(1 0 0 -1 0 1e3)" d="m500.51 441.51l-137.35-137.35c-16.308-16.308-42.709-16.308-58.976 0s-16.308 42.709 0 58.976l137.35 137.35-137.35 137.35c-16.308 16.308-16.308 42.709 0 58.976 16.308 16.266 42.709 16.308 58.976 0l137.35-137.35 137.35 137.35c16.308 16.308 42.709 16.308 58.976 0 16.266-16.308 16.308-42.709 0-58.976l-137.35-137.35 137.35-137.35c16.308-16.308 16.308-42.709 0-58.976-16.308-16.266-42.709-16.308-58.976 0l-137.35 137.35z"/>
			</svg>
		</div>
	</div>
	<div class="content">
		<slot></slot>
	</div>
</div>

<style type='text/scss'>
	@import "variables";
	:host {
	  position: fixed;
	  width: 100%;
	  height: 100%;
	  background: rgba(0, 0, 0, 0.8);
	  z-index: 2;
	  display: none;
	  left: 0;
      top: 0;
	}
	.box {
	  position: fixed;
	  background: white;
	  top: 50%;
	  left: 50%;
	  transform: translate(-50%, -50%);
	  padding: 30px 40px;
	  width: 80%;
	  box-sizing: border-box;
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
</style>

<script>
	import { onMount } from 'svelte';

	export let headertext = '';
	let _modalRoot;

	onMount(() => {
		const host = _modalRoot.getRootNode().host;
	    host.addEventListener("click", event => {
	      host.style.display = "none";
	      host.dispatchEvent(new Event("modalClosed"));
	    });
	});
	const hideModal = (event) => {
		const host = _modalRoot.getRootNode().host;
		host.style.display = "none";
		host.dispatchEvent(new Event("modalClosed"));
	}
</script>