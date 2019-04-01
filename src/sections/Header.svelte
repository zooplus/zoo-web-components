<svelte:options tag="app-header"></svelte:options>
<header>
	<zoo-header imgsrc="logo.png" headertext="Zooplus web components">
		<div class="buttons-holder">
			<div class="header-button">
				<zoo-button type="{theme === 'zoo' ? 'hot' : 'cold'}" size="medium" on:click={() => changeTheme('zoo')}>
					<span slot="buttoncontent" class="slotted-span">Zoo+ theme</span>
				</zoo-button>
			</div>
			<div class="header-button">
				<zoo-button type="{theme === 'grey' ? 'hot' : 'cold'}" size="medium" on:click={() => changeTheme('grey')}>
					<span slot="buttoncontent" class="slotted-span">Grey theme</span>
				</zoo-button>
			</div>
		</div>
	</zoo-header>
	<zoo-navigation class="nav">
		<div>
			{#each navlinks as link}
				<zoo-link href="{link.href}" target="{link.target}" type="{link.type}"
					text="{link.text}">
				</zoo-link>
			{/each}
		</div>
	</zoo-navigation>
</header>

<style type='text/scss'>
	header {
		position: relative;
	}

	.buttons-holder {
		display: flex;
		justify-content: flex-end;
		flex-direction: row;
		flex-grow: 1;
		padding: 0 25px 0 0;
	}

	.header-button {
		display: flex;
		width: 250px;
		margin-left: 15px;

		zoo-button {
			align-self: center;
		}
		@media only screen and (max-width: 544px) {
			.slotted-span {
				display: none;
			}
		}
	}

	.nav {
		position: sticky;
		top: 0;
		color: white;
		font-size: 14px;
		font-weight: bold;
		line-height: 16px;
		cursor: pointer;

		zoo-link {
			padding: 0 15px;
			cursor: pointer;

			&:hover, &:active {
				background: rgba(255, 255, 255, 0.3);
			}
		}
	}
</style>

<script>
	let theme = 'zoo';
	let navlinks = [
		{
			href: '#what',
			text: 'What is this project?',
			type: 'standard',
			target: '',
			active: false
		},
		{
			href: '#when',
			text: 'When can I use it?',
			type: 'standard',
			target: '',
			active: false
		},
		{
			href: '#how',
			text: 'How can I use it?',
			type: 'standard',
			target: '',
			active: false
		}
	];

	const changeTheme = (pallete) => {
		theme = pallete;
		switch (pallete) {
			case 'zoo':
				document.documentElement.style.setProperty('--main-color', '#3C9700');
				document.documentElement.style.setProperty('--main-color-light', '#66B100');
				document.documentElement.style.setProperty('--main-color-dark', '#286400');
				document.documentElement.style.setProperty('--secondary-color', '#FF6200');
				document.documentElement.style.setProperty('--secondary-color-light', '#FF8800');
				document.documentElement.style.setProperty('--secondary-color-dark', '#CC4E00');
				break;
			case 'grey':
				document.documentElement.style.setProperty('--main-color', '#676778');
				document.documentElement.style.setProperty('--main-color-light', '#838399');
				document.documentElement.style.setProperty('--main-color-dark', '#565664');
				document.documentElement.style.setProperty('--secondary-color', '#ff3e00');
				document.documentElement.style.setProperty('--secondary-color-light', '#ff794d');
				document.documentElement.style.setProperty('--secondary-color-dark', '#c53100');
			default:
				break;
		}
	}
</script>
