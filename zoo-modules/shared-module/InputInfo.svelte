<svelte:options tag="zoo-input-info"></svelte:options>
<div bind:this={root}>
	<div class="info" class:hidden="{!infotext}">
		<span class="info-text">{infotext}</span>
	</div>
	<div class="error" class:hidden="{valid || !inputerrormsg}">
		<span class="error-label">{inputerrormsg}</span>
	</div>
	<template id="icon">
		<style>svg {padding-right: 5px;}</style>
		<svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/></svg>
	</template>
</div>

<style type='text/scss'>
	@import "variables";

	.info, .error {
		padding: 0 2px 2px 0;
		font-size: $p2-size;
		color: $grey-dark;
		display: flex;
		align-items: center;

		&.hidden {
			display: none;
		}
	}

	.info svg path {
		fill: $info-mid;
	}

	.error {
		animation: hideshow 0.5s ease;
		color: var(--warning-mid, #{$warning-mid});

		svg path {
			fill: var(--warning-mid, #{$warning-mid});
		}
	}
	@keyframes hideshow {
		0% { opacity: 0; }

		100% { opacity: 1; }
	} 
</style>

<script>
	import { onMount } from 'svelte';
	export let valid = true;
	export let inputerrormsg = '';
	export let infotext = '';
	let root;
	onMount(() => {
		const iconContent = root.querySelector('#icon').content;
		root.querySelector('.info').prepend(iconContent.cloneNode(true));
		root.querySelector('.error').prepend(iconContent.cloneNode(true));
	});
</script>