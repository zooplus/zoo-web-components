<svelte:options tag="zoo-radio"></svelte:options>
<span class="template-slot">
	<slot bind:this={_templateSlot}></slot>
</span>
<zoo-input-info class="input-info" valid="{valid}" inputerrormsg="{errormsg}" infotext="{infotext}">
</zoo-input-info>

<style type='text/scss'>
	@import "variables";
	:host {
		display: flex;
		flex-direction: column;
	}
	.template-slot {
		display: flex;
	}
	::slotted(input[type="radio"]) {
	  position: relative;
	  margin: 0;
	  -webkit-appearance: none;
	  -moz-appearance: none;
	  outline: none;
	  cursor: pointer;
	}
	::slotted(input[type="radio"]):focus::before {
	  border-color: $matterhorn;
	}
	::slotted(input[type="radio"])::before {
	  position: relative;
	  display: inline-block;
	  width: 16px;
	  height: 16px;
	  content: "";
	  border-radius: 50%;
	  border: 2px solid var(--main-color);
	  background: white;
	}
	::slotted(input[type="radio"]:checked)::before {
		background: white;
	}
	::slotted(input[type="radio"]:checked)::after, ::slotted(input[type="radio"].focused)::after {
	  content: "";
	  position: absolute;
	  top: 5px;
	  left: 5px;
	  width: 6px;
	  height: 6px;
	  transform: rotate(40deg);
	  color: var(--main-color);
	  border: 2px solid;
	  border-radius: 50%;
	}

	::slotted(input[type="radio"]:checked)::after {
		background: var(--main-color);
	}

	::slotted(input[type="radio"].focused)::after {
		background: $whisper;
		color: $whisper;
	}

	::slotted(input.focused)::before {
		border-color: $matterhorn;
	}

	::slotted(label) {
		cursor: pointer;
		margin: 0 5px;
		align-self: center;
	}

	::slotted(input[type="radio"]:disabled) {
	  cursor: not-allowed;
	}
	::slotted(input[type="radio"]:disabled) {
	  cursor: not-allowed;
	}
	::slotted(input[type="radio"]:disabled)::before {
	  border-color: $grey;
	  background-color: $whisper;
	}
	::slotted(input[type="radio"].error)::before {
	  border-color: $error-text-color;
	}
	::slotted(label.error) {
	  color: $error-text-color;
	}
</style>

<script>
	import { beforeUpdate, onMount } from 'svelte';

	export let valid = true;
	export let errormsg = '';
	export let infotext = '';
	let _prevValid;
	let _templateSlot;
	let clone;

	const changeValidState = (valid) => {
		if (_templateSlot) {
			_templateSlot.assignedNodes().forEach(el => {
				if (el.classList) {
					if (valid === false) {
						el.classList.add('error');
					} else if (valid) {
						el.classList.remove('error');
					}
				}
			});
		}
	}

	beforeUpdate(() => {
		if (valid !== _prevValid) {
			_prevValid = valid;
			changeValidState(valid);
		}
	});
	  
	onMount(() => {
		_templateSlot.addEventListener("slotchange", e => {
			if (!clone) {
				const template = _templateSlot.assignedNodes()[0];
				if (template.content) {
					clone = template.content.cloneNode(true);
					_templateSlot.getRootNode().querySelector('slot').assignedNodes()[0].remove();
					_templateSlot.getRootNode().host.appendChild(clone);
				}
				_templateSlot.getRootNode().host.querySelectorAll('input').forEach(input => {
					input.addEventListener('focus', e => {
						e.target.classList.add('focused');
					});
					input.addEventListener('blur', e => {
						e.target.classList.remove('focused');
					});
				})
			}
		});
	});
</script>