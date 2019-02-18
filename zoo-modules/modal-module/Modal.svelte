<svelte:options tag="zoo-log-modal"></svelte:options>
<div class="modal-box" on:click="{e => e.stopPropagation()}" bind:this={_modalRoot}>
	<div class="heading">
		<h2>{headertext}</h2>
		<span on:click="{event => hideModal(event)}" class="icon-close-new"></span>
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
	.modal-box {
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
	    .icon-close-new {
	      cursor: pointer;
	      margin-left: auto;
	    }
	    .icon-close-new::before {
	      content: "\EA29";
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