<svelte:options tag="zoo-input"></svelte:options>
<div class="box {labelposition} {linktext ? '' : 'link-absent'}">
	<zoo-input-label class="input-label" {labeltext}></zoo-input-label>
	<zoo-link class="input-link" href="{linkhref}" target="{linktarget}" type="{linktype}" text="{linktext}" textalign="right"></zoo-link>
	<span class="input-slot {valid ? '' : 'error'}">
		<slot name="inputelement"></slot>
		<svg class="error-circle" width="18" height="18" viewBox="0 0 24 24">
			<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
		</svg>
	</span>
	<zoo-input-info class="input-info" {valid} {inputerrormsg} {infotext}></zoo-input-info>
</div>

<style type='text/scss'>
	@import "variables";
	@import "input";

	:host {
		contain: layout;
	}

	.error-circle {
		position: absolute;
		right: 0;
		top: 14px;
		padding: 0 15px 0 5px;
		color: var(--warning-mid, #{$warning-mid});
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s;

		path {
			fill: var(--warning-mid, #{$warning-mid});
		}
	}

	.input-slot.error {
		::slotted(input),
		::slotted(textarea) {
			transition: border-color 0.3s ease;
			border: $stroked-box-warning-bold;
			padding: 12px 14px;
		}

		.error-circle {
			opacity: 1;
		}
	}

	::slotted(input),
	::slotted(textarea) {
		width: 100%;
		font-size: $p1-size;
		line-height: $p1-line-height;
		padding: 13px 15px;
		margin: 0;
		border: $stroked-box-grey;
		border-radius: $input-border-radius;
		color: $grey-dark;
		outline: none;
		box-sizing: border-box;
		text-overflow: ellipsis;
		-moz-appearance: textfield;
	}

	::slotted(input)::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	::slotted(input)::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	::slotted(input::placeholder),
	::slotted(textarea::placeholder) {
		color: $grey-mid;
		opacity: 1;
	}

	::slotted(input:disabled),
	::slotted(textarea:disabled) {
		border: $stroked-box-grey-light;
		background-color: $grey-ultralight;
		color: $grey-mid;
		cursor: not-allowed;
	}

	::slotted(input:focus),
	::slotted(textarea:focus) {
		border: $stroked-box-grey-dark-bold;
		padding: 12px 14px;
	}

	::slotted(input[type='date']), ::slotted(input[type='time']) {
		-webkit-appearance: none;
	}
</style>

<script>
	export let labelposition = "top";
	export let labeltext = "";
	export let linktext = "";
	export let linkhref = "";
	export let linktarget = "about:blank";
	export let inputerrormsg = "";
	export let infotext = "";
	export let valid = true;
	export let linktype = "primary";
</script>
