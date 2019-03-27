<svelte:options tag="app-header"></svelte:options>
<header>
	<zoo-header imgsrc="logo.png" headertext="Zooplus web components">
		<div class="search-field-holder">
			<div class="header-search">
				<zoo-input>
					<input slot="inputelement" placeholder="Example placeholder"/>
				</zoo-input>
			</div>
			<div class="header-button">
				<zoo-button type="hot" size="medium">
					<span slot="buttoncontent" class="slotted-span">Just a button</span>
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
	.search-field-holder {
		display: flex;
		flex-direction: row;
		flex-grow: 1;
		padding: 0 25px 0 0;
	}

	.header-search, .header-button {
		margin-left: auto;
	}
	.header-search {
		flex-grow: 0.5;
	}
	.header-button {
		display: flex;
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
	let navlinks = [
		{
			href: '#app-form',
			text: 'Form section',
			type: 'standard',
			target: '',
			active: false
		},
		{
			href: '#app-buttons',
			text: 'Buttons section',
			type: 'standard',
			target: '',
			active: false
		},
		{
			href: '#app-tooltip-and-feedback',
			text: 'Tooltip and feedback section',
			type: 'standard',
			target: '',
			active: false
		},
		{
			href: 'https://google.com',
			text: 'Example navigation 4',
			type: 'standard',
			active: false
		},
		{
			href: 'https://google.com',
			text: 'Example navigation 5',
			type: 'standard',
			active: false
		}
	];
</script>
