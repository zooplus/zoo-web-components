<svelte:options tag="zoo-link"></svelte:options>
{#if text && href}
	<div class="link-box">
		<a style="text-align: {textalign}" href="{href}" target="{target}" class="{type}" class:disabled="{disabled}">
			<span>{text}</span>
			<div class="bottom-line"></div>
		</a>
	</div>
{/if}

<style type='text/scss'>
	@import "variables";

	:host {
		contain: layout;
	}

	.link-box {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: relative;
	}

	a {
		text-decoration: none;
		font-size: $p2-size;
		line-height: $p2-line-height;

		&.disabled {
			color: $grey-light;

			&:hover {
				cursor: not-allowed;
			}
		}

		&.primary {
			color: var(--primary-mid, #{$primary-mid});

			&:hover, &:focus, &:active {
				color: var(--primary-dark, #{$primary-dark});
			}

			&:visited {
				color: var(--primary-light, #{$primary-light});
			}
		}

		&.negative {
			color: $white;

			&:hover, &:focus, &:active {
				color: $white;
				cursor: pointer;
			}

			&:visited {
				color: $white;
			}

			.bottom-line {
				position: absolute;
				bottom: -3px;
				left: 0;
				overflow: hidden;
				width: 0;
				border-bottom: 1px solid $white;
				color: $white;
			}

			&:hover .bottom-line {
				width: 100%;
			}
		}

		&.grey {
			color: $grey-mid;

			&:hover, &:focus, &:active {
				color: var(--primary-dark, #{$primary-dark});
			}

			&:visited {
				color: var(--primary-light, #{$primary-light});
			}
		}
	}
</style>

<script>
	import { onMount, afterUpdate } from 'svelte';

	export let href = "";
	export let text = "";
	export let target = "about:blank";
	export let type = "negative"; // primary, grey
	export let disabled = false;
	export let textalign = 'center';

	onMount(() => checkTypes());
	afterUpdate(() => checkTypes());

	const checkTypes = () => {
		if (type == 'standard') {
			console.warn(getWarnString('standard', 'negative'));
			type = 'negative';
		}
		if (type == 'green') {
			console.warn(getWarnString('green', 'primary'));
			type = 'primary';
		}
	}

	const getWarnString = (prev, actual) => {
		return 'type="' + prev + '" is not supported and will be removed from future version, use ' + actual + ' instead.';
	}
</script>