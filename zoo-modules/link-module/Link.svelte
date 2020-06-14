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
		font-size: 12px;
		line-height: 16px;
		padding: 0 2px;
		color: #FFFFFF;

		&:hover, &:focus, &:active {
			color: #FFFFFF;
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
		border-bottom: 1px solid #FFFFFF;
		color: #FFFFFF;
	}

	.disabled {
		color: #767676 !important;

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
		color: #767676;

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
			background: #E6E6E6;
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