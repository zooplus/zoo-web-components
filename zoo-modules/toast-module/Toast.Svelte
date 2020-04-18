<svelte:options tag="zoo-toast"></svelte:options>
<div bind:this={toastRoot}>
	<span class="toast {hidden ? 'hide' : 'show'} {type}">
		<svg width="36" height="36" viewBox="0 0 24 24"><path d="M14.25 15.75a.75.75 0 1 1 0 1.5h-.75A2.25 2.25 0 0 1 11.25 15v-3.75h-.75a.75.75 0 0 1 0-1.5h.75a1.5 1.5 0 0 1 1.5 1.5V15c0 .414.336.75.75.75h.75zM11.625 6a1.125 1.125 0 1 1 0 2.25 1.125 1.125 0 0 1 0-2.25zm8.86-2.485c4.687 4.686 4.687 12.284 0 16.97-4.686 4.687-12.284 4.687-16.97 0-4.687-4.686-4.687-12.284 0-16.97 4.686-4.687 12.284-4.687 16.97 0zm-1.06 1.06c-4.1-4.1-10.75-4.1-14.85 0s-4.1 10.75 0 14.85 10.75 4.1 14.85 0 4.1-10.75 0-14.85z"/></svg>
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
