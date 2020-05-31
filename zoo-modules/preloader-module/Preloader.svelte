<svelte:options tag="zoo-preloader"/>
<div class="bounce">
	<div class="bounce1"></div>
	<div class="bounce2"></div>
	<div class="bounce3"></div>
</div>

<style>
	:host {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.bounce {
		text-align: center;
	}
	
	.bounce>div {
		width: 10px;
		height: 10px;
		background-color: #333;
		border-radius: 100%;
		display: inline-block;
		animation: sk-bouncedelay 1.4s infinite ease-in-out both;
	}
		
	.bounce .bounce1 {
		animation-delay: -0.32s;
	}
		
	.bounce .bounce2 {
		animation-delay: -0.16s;
	}
		
	@keyframes sk-bouncedelay {
		0%,
		80%,
		100% {
			transform: scale(0);
		}

		40% {
			transform: scale(1.0);
		}
	}
</style>