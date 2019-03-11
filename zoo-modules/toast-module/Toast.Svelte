<svelte:options tag="zoo-toast"></svelte:options>
<div bind:this={toastRoot}>
	<span class="toast {hidden ? 'hide' : 'show'} {type}">
		<svg width="48" height="48" viewBox="0 0 48 48"><path d="M22 30h4v4h-4zm0-16h4v12h-4zm1.99-10C12.94 4 4 12.95 4 24s8.94 20 19.99 20S44 35.05 44 24 35.04 4 23.99 4zM24 40c-8.84 0-16-7.16-16-16S15.16 8 24 8s16 7.16 16 16-7.16 16-16 16z"/></svg>
		<span>{text}</span>
		<div class="close" on:click="{event => close(event)}">
			<svg class="{type}" width="24" height="24" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
		</div>
	</span>
</div>

<style type='text/scss'>
	:host {
		display: none;
		position: relative;
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
		}

		padding: 15px;
		top: 20px;
		right: 20px;
		position: fixed;
		transition: transform 0.3s, opacity 0.4s;
		z-index: 9999;

		svg {
			padding-right: 5px;
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
