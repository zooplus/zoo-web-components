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
			<div class="header-button">
				<zoo-button type="{theme === 'random' ? 'hot' : 'cold'}" size="medium" on:click={() => generateRandomTheme()}>
					<span slot="buttoncontent" class="slotted-span">Random theme</span>
				</zoo-button>
			</div>
		</div>
	</zoo-header>
	<zoo-navigation class="nav">
		<div>
			{#each navlinks as link}
				<div class="nav-link">
					<a href="{link.href}">{link.text}</a>
				</div>
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
		max-width: 250px;
		min-width: 140px;
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

		.nav-link {
			cursor: pointer;
			display: flex;
   			align-items: center;
			&:hover {
				background: rgba(255, 255, 255, 0.3);
			}
			a {
				color: white;
				text-decoration: none;
				padding: 0 15px;
			}
		}
	}
</style>

<script>
	let theme = 'zoo';
	let navlinks = [
		{
			href: '#what',
			text: 'What is this project?'
		},
		{
			href: '#when',
			text: 'When can I use it?'
		},
		{
			href: '#how',
			text: 'How can I use it?'
		}
	];

	const changeTheme = (pallete) => {
		theme = pallete;
		switch (pallete) {
			case 'zoo':
				setColorVar('--main-color', '#3C9700');
				setColorVar('--main-color-light', '#66B100');
				setColorVar('--main-color-dark', '#286400');
				setColorVar('--secondary-color', '#FF6200');
				setColorVar('--secondary-color-light', '#FF8800');
				setColorVar('--secondary-color-dark', '#CC4E00');
				break;
			case 'grey':
				setColorVar('--main-color', '#676778');
				setColorVar('--main-color-light', '#838399');
				setColorVar('--main-color-dark', '#565664');
				setColorVar('--secondary-color', '#ff3e00');
				setColorVar('--secondary-color-light', '#ff794d');
				setColorVar('--secondary-color-dark', '#c53100');
				break;
			case 'black':
				setColorVar('--main-color', '#20232a');
				setColorVar('--main-color-light', '#3b414e');
				setColorVar('--main-color-dark', '#0e1013');
				setColorVar('--secondary-color', '#1cb11c');
				setColorVar('--secondary-color-light', '#39d639');
				setColorVar('--secondary-color-dark', '#157915');
				break;
			default:
				break;
		}
	}

	const setColorVar = (name, value) => {
		document.documentElement.style.setProperty(name, value);
	}

	const generateRandomTheme = () => {
		theme = 'random';
		const main = randomRgbaString();
		const mainHex = rgbToHex(main.r, main.g, main.b);
		setColorVar('--main-color', mainHex);
		setColorVar('--main-color-light', lightenDarkenColor(mainHex, 30));
		setColorVar('--main-color-dark', lightenDarkenColor(mainHex, -30));
		const second = randomRgbaString();
		const secondHex = rgbToHex(second.r, second.g, second.b);
		setColorVar('--secondary-color', rgbToHex(second.r, second.g, second.b));
		setColorVar('--secondary-color-light', lightenDarkenColor(secondHex, 30));
		setColorVar('--secondary-color-dark', lightenDarkenColor(secondHex, -30));
	}

	const randomRgbaString = () => {
		let r = Math.floor(Math.random() * 255);
		let g = Math.floor(Math.random() * 255);
		let b = Math.floor(Math.random() * 255);
		return {r: r, g: g, b: b};
	}

	const rgbToHex = (r, g, b) => {
    	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
	}

	const componentToHex = (c) => {
		let hex = c.toString(16);
		return hex.length == 1 ? "0" + hex : hex;
	}

	const lightenDarkenColor = (col, amt) => {
	
		var usePound = false;
	
		if (col[0] == "#") {
			col = col.slice(1);
			usePound = true;
		}
	
		var num = parseInt(col,16);
	
		var r = (num >> 16) + amt;
	
		if (r > 255) r = 255;
		else if  (r < 0) r = 0;
	
		var b = ((num >> 8) & 0x00FF) + amt;
	
		if (b > 255) b = 255;
		else if  (b < 0) b = 0;
	
		var g = (num & 0x0000FF) + amt;
	
		if (g > 255) g = 255;
		else if (g < 0) g = 0;
	
		return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
	
	}
</script>
