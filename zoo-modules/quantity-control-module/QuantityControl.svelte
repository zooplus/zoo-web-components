<svelte:options tag="zoo-quantity-control"/>
<slot name="label">
	{#if labeltext}
		<zoo-input-label {labeltext}></zoo-input-label>
	{/if}
</slot>
<div class="control">
	<button class:disabled="{decreasedisabled}" type="button" on:click="{() => handleClick('s', decreasedisabled)}">
		<svg height="18" width="18">
			<line y1="9" x1="0" x2="18" y2="9"></line>
		</svg>
	</button>
	<slot name="input" bind:this={inputSlot}></slot>
	<button class:disabled="{increasedisabled}" type="button" on:click="{() => handleClick('a', increasedisabled)}">
		 <svg height="18" width="18">
			<line y1="0" x1="9" x2="9" y2="18"></line>
			<line y1="9" x1="0" x2="18" y2="9"></line>
		</svg>
	</button>
</div>
{#if infotext || !valid}
	<zoo-input-info {valid} {inputerrormsg} {infotext}></zoo-input-info>
{/if}

<style type='text/scss'>
	@import 'variables';

	:host {
		--input-length: 1ch;
	}

	svg line {
		stroke-width: 1.5;
		stroke: #FFFFFF;
	}

	.control {
		height: 36px;
		display: flex;
	}

	button:first-child {
		border-radius: 5px 0 0 5px;
	}

	button:last-child {
		border-radius: 0 5px 5px 0;
	}

	button {
		border-width: 0;
		min-width: 30px;
		background: var(--primary-mid, #{$primary-mid});
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		cursor: pointer;

		&.disabled {
			background: #F2F3F4;
			cursor: not-allowed;

			svg line {
				stroke: #767676;
			}
		}
	}

	::slotted(input) {
		width: var(--input-length);
		min-width: 30px;
		font-size: 14px;
		line-height: 20px;
		margin: 0;
		border: none;
		color: #555555;
		outline: none;
		box-sizing: border-box;
		-moz-appearance: textfield;
		background: #FFFFFF;
		text-align: center;
	}

	zoo-input-info {
		display: block;
		margin-top: 2px;
	}

	::slotted(label) {
		align-self: self-start;
		font-size: 14px;
		line-height: 20px;
		font-weight: 800;
		color: #555555;
		text-align: left;
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let labeltext = '';
	export let inputerrormsg = '';
	export let infotext = '';
	export let valid = true;
	export let decreasedisabled = false;
	export let increasedisabled = false;
	let inputSlot;
	let input;

	onMount(() => {
		inputSlot.addEventListener('slotchange', () => {
			input = inputSlot.assignedNodes()[0];
			setInputWidth();
		});
	});

	const handleClick = (type, disabled) => {
		if (disabled || !input) return;
		const step = input.step || 1;
		input.value = input.value ? input.value : 0;
		input.value -= type == 'a' ? -step : step;
		input.dispatchEvent(new Event('change'));
		setInputWidth();
	}

	const setInputWidth = () => {
		const length = input.value ? input.value.length || 1 : 1;
		inputSlot.getRootNode().host.style.setProperty('--input-length', length + 1 + 'ch');
	}
</script>