<svelte:options tag="zoo-select"></svelte:options>
<div class="box {labelposition} {linktext ? '' : 'link-absent'}">
	<slot name="selectlabel">
		<zoo-input-label class="input-label" {labeltext}></zoo-input-label>
	</slot>
	<a class="input-link" href="{linkhref}" target="{linktarget}">{linktext}</a>
	<div class="input-slot {valid ? '' : 'error'}">
		<slot bind:this={selectSlot} name="selectelement"></slot>
		{#if slottedSelect && !slottedSelect.hasAttribute('multiple')}
			{#if loading}
				<zoo-preloader></zoo-preloader>
			{/if}
			{#if valueSelected}
				<svg class="close" on:click="{() => handleCrossClick()}" width="21" height="21" viewBox="0 0 24 24">
					<path d="M19 6l-1-1-6 6-6-6-1 1 6 6-6 6 1 1 6-6 6 6 1-1-6-6z"/>
				</svg>
			{:else}
				<svg class="arrows {slottedSelect.disabled ? 'disabled' : ''}" width="24" height="24" viewBox="0 0 24 24">
					<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
				</svg>
			{/if}
		{/if}
	</div>
	<zoo-input-info class="input-info" {valid} {inputerrormsg} {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	:host {
		contain: layout;
	}

	.close, .arrows {
		position: absolute;
		right: 9px;
		top: 12px;
	}

	.close {
		cursor: pointer;
		right: 11px;
		top: 14px;
	}

	.arrows {
		pointer-events: none;

		path {
			fill: var(--primary-mid, #{$primary-mid});
		}

		&.disabled path {
			fill: $grey-light;
		}
	}

	::slotted(select) {
		-webkit-appearance: none;
		-moz-appearance: none;
		width: 100%;
		background: white;
		font-size: $p1-size;
		line-height: $p1-line-height;
		padding: 13px 25px 13px 15px;
		border: $stroked-box-grey;
		border-radius: $input-border-radius;
		color: $grey-dark;
		outline: none;
		box-sizing: border-box;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	::slotted(select:disabled) {
		border: $stroked-box-grey-light;
		background-color: $grey-ultralight;
		color: $grey-mid;
	}

	::slotted(select:disabled:hover) {
		cursor: not-allowed;
	}

	::slotted(select:focus) {
		border: $stroked-box-grey-dark-bold;
		padding: 12px 24px 12px 14px;
	}

	.input-slot.error ::slotted(select) {
		border: $stroked-box-warning-bold;
		padding: 12px 24px 12px 14px;
	}

	::slotted(label) {
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: 800;
		color: $grey-dark;
		text-align: left;
	}
</style>

<script>
	import { onMount } from 'svelte';

	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget = "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	export let loading = false;
	let slottedSelect;
	let selectSlot;
	let valueSelected;

	// todo support multiple slots
	onMount(() => {
		selectSlot.addEventListener("slotchange", () => {
			slottedSelect = selectSlot.assignedNodes()[0];
			valueSelected = slottedSelect.value && !slottedSelect.disabled ? true : false;
			slottedSelect.addEventListener('change', e => valueSelected = e.target.value ? true : false);
		});
	});

	const handleCrossClick = () => {
		slottedSelect.value = null;
		slottedSelect.dispatchEvent(new Event("change"));
	}
</script>
