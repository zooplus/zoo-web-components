<svelte:options tag="zoo-feedback"></svelte:options>
<div class="box {type}">
	<svg class="{type}" width="30" height="30" viewBox="0 0 24 24">
		<path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z" fill-rule="evenodd"/>
	</svg>
	<span class="text">{text}</span>
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
		border-bottom-right-radius: 3px;
		border-top-right-radius: 3px;
		width: 100%;
		height: 100%;
		padding: 5px 0;

		&.info {
			background: var(--info-ultralight, #{$info-ultralight});
			border-color: var(--info-mid, #{$info-mid});

			svg {
				fill: var(--info-mid, #{$info-mid});
			}
		}

		&.error {
			background: var(--warning-ultralight, #{$warning-ultralight});
			border-color: var(--warning-mid, #{$warning-mid});

			svg {
				fill: var(--warning-mid, #{$warning-mid});
			}
		}

		&.success {
			background: var(--primary-ultralight, #{$primary-ultralight});
			border-color: var(--primary-mid, #{$primary-mid});

			svg {
				fill: var(--primary-mid, #{$primary-mid});
			}
		}

		svg {
			min-width: 24px;
			min-height: 24px;
			padding: 0 10px 0 15px;
		}

		.text {
			display: flex;
			flex-direction: row;
			align-items: center;
			height: 100%;
			overflow: auto;
			box-sizing: border-box;
			padding: 5px 5px 5px 0;
		}
	}
</style>

<script>
	export let type = 'info'; // error, success
	export let text = '';
</script>