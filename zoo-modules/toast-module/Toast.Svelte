<svelte:options tag="zoo-toast"></svelte:options>
<div bind:this={toastRoot}>
	<span class="toast {hidden ? 'hide' : 'show'} {type}">
		<svg width="36" height="36" viewBox="0 0 24 24"><path d="M14.2 21c.4.1.6.6.5 1a2.8 2.8 0 01-5.4 0 .7.7 0 111.4-.5 1.3 1.3 0 002.6 0c.1-.4.5-.6 1-.5zM12 0c.4 0 .8.3.8.8v1.5c4.2.4 7.4 3.9 7.4 8.2 0 3 .3 5.1.8 6.5l.4 1v.2c.6.4.3 1.3-.4 1.3H3c-.6 0-1-.7-.6-1.2.1-.2.4-.6.6-1.5.5-1.5.7-3.6.7-6.3 0-4.3 3.3-7.8 7.6-8.2V.8c0-.5.3-.8.7-.8zm0 3.8c-3.7 0-6.7 3-6.8 6.7a24.2 24.2 0 01-1 7.5h15.5l-.2-.5c-.5-1.6-.8-3.8-.8-7 0-3.7-3-6.8-6.7-6.8z" fill-rule="evenodd"/></svg>
		<span>{text}</span>
		<div class="close" on:click="{event => close(event)}">
			<svg class="{type}" width="24" height="24" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
		</div>
	</span>
</div>

<style type='text/scss'>
	:host {
		display: none;
		top: 20px;
		right: 20px;
		position: fixed;
		z-index: 10001;
	}

	.toast {
		width: 240px;
		min-height: 80px;
		background: white;
		box-shadow: 15px 0px 40px 0px rgba(85,85,85, 0.3), -15px 0px 40px 0px rgba(85,85,85, 0.3);
		border: 3px solid;
		display: flex;
		align-items: center;
		border-radius: 3px;
		word-break: break-word;

		&.info {
			border-color: #459FD0;
			color: #459FD0;

			svg {fill: #459FD0;}
		}

		&.error {
			border-color: #ED1C24;
			color: #ED1C24;

			svg {fill: #ED1C24;}
		}

		&.success {
			border-color: #3C9700;
			color: #3C9700;

			svg {fill: #3C9700;}
		}

		.close {
			cursor: pointer;
			margin-left: auto;
			align-self: flex-start;

			svg {
				min-width: auto;
			}
		}

		padding: 15px;
		transition: transform 0.3s, opacity 0.4s;

		svg {
			padding-right: 5px;
			min-width: 48px;
		}
	}

	.toast.hide {
		opacity: 0;
		transform: translate3d(100%,0,0);
	}

	.toast.show {
		opacity: 1;
		transform: translate3d(0,0,0);
	}
</style>

<script>
	export let type = 'info';
	export let text = '';
	export let timeout = 3;
	let hidden = true;
	let toastRoot;
	let timeoutVar;

	export const show = () => {
		if (!hidden) return;
		const root = toastRoot.getRootNode().host;
		root.style.display = 'block';
		timeoutVar = setTimeout(() => {
			hidden = !hidden;
			timeoutVar = setTimeout(() => {
				if (root && !hidden) {
					hidden = !hidden;
					timeoutVar = setTimeout(() => {root.style.display = 'none'}, 300);
				}
			}, timeout * 1000);
		}, 30);
	}
	export const close = () => {
		if (hidden) return;
		clearTimeout(timeoutVar);
		const root = toastRoot.getRootNode().host;
		setTimeout(() => {
			if (root && !hidden) {
				hidden = !hidden;
				setTimeout(() => {root.style.display = 'none'}, 300);
			}
		}, 30);
	}
</script>
