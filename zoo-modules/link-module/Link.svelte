<svelte:options tag="zoo-link"/>
<div class="box">
	<slot name="pre"></slot>
	<a style="text-align: {textalign}" href="{href}" target="{target}" class="{type} {size}" class:disabled="{disabled}" on:click="{e => handleClick(e)}">
		<span>{text}</span>
		<div class="bottom-line"></div>
	</a>
	<slot name="post"></slot>
</div>

<style type='text/scss'>
	@import 'variables';

	:host {
		contain: layout;
		display: flex;
	}

	.box {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: relative;
		padding: 0 5px;
	}

	a {
		text-decoration: none;
		font-size: $p2-size;
		line-height: $p2-line-height;
		padding: 0 2px;
		color: $white;

		&:hover, &:focus, &:active {
			color: $white;
			cursor: pointer;
		}
	}

	.negative:hover .bottom-line {
		width: 100%;
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

	.disabled {
		color: $grey-mid !important;

		&:hover, &:focus {
			cursor: not-allowed;
		}
	}

	.primary {
		color: var(--primary-mid, #{$primary-mid});

		&:visited {
			color: var(--primary-light, #{$primary-light});
		}

		&:hover, &:focus, &:active {
			color: var(--primary-dark, #{$primary-dark});
		}
	}

	.grey {
		color: $grey-mid;

		&:hover, &:focus, &:active {
			color: var(--primary-dark, #{$primary-dark});
		}
	}

	.warning {
		color: $warning-mid;

		&:hover, &:focus, &:active {
			color: var(--warning-dark, #{$warning-dark});
		}
	}

	.large {
		font-size: $h3-size;
		line-height: $h3-line-height;
		font-weight: bold;
	}

	.bold {
		font-weight: bold;

		&:active {
			background: $grey-light;
			border-radius: $border-radius;
		}
	}
</style>

<script>
	export let href = '';
	export let text = '';
	export let target = 'about:blank';
	export let type = 'negative'; // primary, grey, warning
	export let disabled = false;
	export let textalign = 'center';
	export let size = 'regular'; // bold, large

	const handleClick = e => {
		if (disabled) e.preventDefault();
	}
</script>