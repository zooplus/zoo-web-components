<svelte:options tag="zoo-input-info"/>
<div class="info" class:hidden={!infotext}>{infotext}</div>
<div class="error" class:hidden={valid || !inputerrormsg}>{inputerrormsg}</div>
<template bind:this={template}>
	<style>svg {padding-right: 5px;}</style>
	<svg width="18" height="18" viewBox="0 0 24 24">
		<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
	</svg>
</template>

<style type='text/scss'>
	@import 'variables';

	.info, .error {
		padding: 0 2px 2px 0;
		font-size: $p2-size;
		line-height: $p2-line-height;
		color: $grey-dark;
		display: flex;
		align-items: center;

		&.hidden {
			display: none;
		}
	}

	.info svg path {
		fill: var(--info-mid, #{$info-mid});
	}

	.error svg path {
		fill: var(--warning-mid, #{$warning-mid});
	}
</style>

<script>
	import { onMount } from 'svelte';
	export let valid = true;
	export let inputerrormsg = '';
	export let infotext = '';
	let template;
	onMount(() => {
		const iconContent = template.content;
		const root = template.getRootNode();
		root.querySelector('.info').prepend(iconContent.cloneNode(true));
		root.querySelector('.error').prepend(iconContent.cloneNode(true));
	});
</script>