<svelte:options tag="zoo-feedback"></svelte:options>
<div class="box {type}">
	<svg class="{type}" width="30" height="30" viewBox="0 0 24 24">
		<path d="M12 15.75a1.125 1.125 0 11.001 2.25A1.125 1.125 0 0112 15.75zm.75-2.25a.75.75 0 11-1.5 0V5.25a.75.75 0 111.5 0v8.25zm7.205-9.455l.53-.53c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0l-.53.53zm0 0l-.53.53c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85l.53-.53z"/>
	</svg>
	<slot>
		<span>{text}</span>
	</slot>
</div>

<style type='text/scss'>
	@import "variables";

	.box {
		box-sizing: border-box;
		font-size: $p1-size;
		line-height: $p1-line-height;
		border-left: 3px solid;
		display: flex;
		align-items: center;
		width: 100%;
		height: 100%;
		padding: 5px 0;
	}

	svg {
		min-width: 30px;
		min-height: 30px;
		padding: 0 10px 0 15px;
	}

	span {
		display: flex;
		align-items: center;
		height: 100%;
		overflow: auto;
		box-sizing: border-box;
		padding: 5px 5px 5px 0;
	}

	.info {
		background: var(--info-ultralight, #{$info-ultralight});
		border-color: var(--info-mid, #{$info-mid});

		svg {
			fill: var(--info-mid, #{$info-mid});
		}
	}

	.error {
		background: var(--warning-ultralight, #{$warning-ultralight});
		border-color: var(--warning-mid, #{$warning-mid});

		svg {
			fill: var(--warning-mid, #{$warning-mid});
		}
	}

	.success {
		background: var(--primary-ultralight, #{$primary-ultralight});
		border-color: var(--primary-mid, #{$primary-mid});

		svg {
			fill: var(--primary-mid, #{$primary-mid});
		}
	}
</style>

<script>
	export let type = 'info'; // error, success
	export let text = '';
</script>