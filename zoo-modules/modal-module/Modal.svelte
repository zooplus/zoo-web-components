<svelte:options tag="zoo-log-modal"></svelte:options>
<div class="box" on:click="{e => e.stopPropagation()}" bind:this={_modalRoot}>
	<div class="heading">
		<h2>{headertext}</h2>
		<div class="close" on:click="{event => hideModal(event)}">
			<svg preserveAspectRatio="xMidYMid meet" viewBox="50 0 1050 1001" height="35" width="35">
				<path transform="matrix(1 0 0 -1 0 1000)" d="M500.5104270833334 441.5139895833334L363.1648854166667 304.1684479166667C346.8569270833334 287.8604895833334 320.4555520833334 287.8604895833334 304.1893020833334 304.1684479166667C287.9230520833334 320.47640625 287.8813437500001 346.87778125 304.1893020833334 363.1440312499999L441.53484375 500.4895729166666L304.1893020833334 637.8351145833333C287.8813437500001 654.1430729166666 287.8813437500001 680.5444479166666 304.1893020833334 696.8106979166666C320.4972604166667 713.0769479166667 346.8986354166667 713.11865625 363.1648854166667 696.8106979166666L500.5104270833334 559.4651562500001L637.8559687500001 696.8106979166666C654.1639270833334 713.11865625 680.5653020833334 713.11865625 696.8315520833333 696.8106979166666C713.0978020833334 680.5027395833333 713.1395104166667 654.1013645833334 696.8315520833333 637.8351145833333L559.4860104166667 500.4895729166666L696.8315520833333 363.1440312499999C713.1395104166667 346.8360729166666 713.1395104166667 320.4346979166666 696.8315520833333 304.1684479166667C680.52359375 287.9021979166667 654.12221875 287.8604895833334 637.8559687500001 304.1684479166667L500.5104270833334 441.5139895833334z"/>
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