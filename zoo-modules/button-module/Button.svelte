<svelte:options tag="zoo-button"/>
<div>
	<button {disabled} type="button" on:click="{e => disabled ? e.preventDefault() : ''}">
		<slot></slot>
	</button>
</div>

<style type='text/scss'>
	@import 'variables';

	:host {
		display: flex;
		max-width: 330px;
		min-height: 36px;
		position: relative;
	}

	div {
		display: flex;
		width: 100%;
		min-height: 100%;
	}

	button {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		color: $white;
		border: 0;
		border-radius: $input-border-radius;
		cursor: pointer;
		width: 100%;
		min-height: 100%;
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: bold;
		text-align: center;
		background: linear-gradient(to right, var(--primary-mid, #{$primary-mid}), var(--primary-light, #{$primary-light}));

		&:hover, &:focus {
			background: var(--primary-mid, #{$primary-mid});
		}

		&:active {
			background: var(--primary-dark, #{$primary-dark});
			transform: translateY(1px);
		}

		&:disabled {
			background: $grey-ultralight !important;
			color: $grey-mid !important;
			border: $stroked-box-grey-light !important;
			cursor: not-allowed;
			transform: translateY(0);
		}
	}

	:host([type="secondary"]) button {
		background: linear-gradient(to right, var(--secondary-mid, #{$secondary-mid}), var(--secondary-light, #{$secondary-light}));

		&:hover, &:focus {
			background: var(--secondary-mid, #{$secondary-mid});
		}

		&:active {
			background: var(--secondary-dark, #{$secondary-dark});
		}
	}

	:host([type="hollow"]) button {
		border: $stroked-box-primary-bold;
		color: var(--primary-mid, #{$primary-mid});
		background: transparent;

		&:hover, &:focus, &:active {
			color: $white;
			background: var(--primary-mid, #{$primary-mid});
		}

		&:active {
			background: var(--primary-dark, #{$primary-dark});
		}
	}

	:host([type="empty"]) button {
		color: initial;
		background: transparent;

		&:hover, &:focus {
			background: $grey-light;
		}
	}

	:host([size="medium"]) {
		min-height: 46px;
	}

	::slotted(*) {
		padding: 0 20px;
	}
</style>

<script>
	export let disabled = false;
</script>