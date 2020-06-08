<svelte:options tag="zoo-toggle-switch"/>
<div class="box">
	<slot name="label">
		{#if labeltext}
			<zoo-input-label {labeltext}></zoo-input-label>
		{/if}
	</slot>
	<div class="input" on:click="{e => handleBoxClick(e)}">
		<slot name="input" bind:this={inputSlot}></slot>
	</div>
	{#if infotext}
		<zoo-input-info {infotext}></zoo-input-info>
	{/if}
</div>

<style type='text/scss'>
	@import 'variables';

	:host {
		height: 100%;
		width: 100%;
	}

	.input {
		position: relative;
		height: 17px;
		width: 40px;
		background: $grey-light;
		border-radius: 10px;
		border-width: 0px;
		cursor: pointer;
	}

	::slotted(input[type="checkbox"]) {
		position: absolute;
		top: -6px;
		transition: transform 0.2s;
		transform: translateX(-30%);
		width: 60%;
		height: 24px;
		background: $white;
		border: $stroked-box-grey-light;
		border-radius: 50%;
		display: flex;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
	}

	::slotted(input[type="checkbox"]:checked) {
		transform: translateX(80%);
		left: initial;
		background: var(--primary-mid, #{$primary-mid});
	}

	::slotted(input[type="checkbox"]:focus) {
		border-width: 2px;
		border: $stroked-box-grey;
	}

	::slotted(input[type="checkbox"]:disabled) {
		background: $grey-ultralight;
		cursor: not-allowed;
	}

	::slotted(label) {
		display: flex;
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: 800;
		color: $grey-dark;
		text-align: left;
		margin-bottom: 10px;
	}

	zoo-input-info {
		display: flex;
		margin-top: 8px;
	}

</style>

<script>
	import { onMount } from 'svelte'; 
	export let labeltext = '';
	export let infotext = '';
	let inputSlot;
	let input;

	onMount(() => {
		inputSlot.addEventListener('slotchange', () => input = inputSlot.assignedNodes()[0]);
		inputSlot.addEventListener('keypress', e => {
			if (e.keyCode === 13) input.click();
		});
	});

	const handleBoxClick = e => {
		if (e.target !== input) {
			e.preventDefault();
			e.stopPropagation();
			input.click();
		}
	}
</script>