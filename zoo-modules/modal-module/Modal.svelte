<svelte:options tag="zoo-log-modal"></svelte:options>
<div class="box" on:click="{e => e.stopPropagation()}" bind:this={_modalRoot}>
	<div class="heading">
		<h2>{headertext}</h2>
		<div class="close" on:click="{event => hideModal(event)}">
			<svg width="35" height="35" viewBox="50 0 1050 1001"><path transform="matrix(1 0 0 -1 0 1e3)" d="m501 442l-137-137c-16-16-43-16-59 0s-16 43 0 59l137 137-137 137c-16 16-16 43 0 59 16 16 43 16 59 0l137-137 137 137c16 16 43 16 59 0 16-16 16-43 0-59l-137-137 137-137c16-16 16-43 0-59-16-16-43-16-59 0l-137 137z"/></svg>
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
		animation: hideshow 0.4s ease;
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
	@keyframes hideshow {
		0% { opacity: 0; }
		100% { opacity: 1; }
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