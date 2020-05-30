<zoo-header headertext="Zooplus web components">
	<img slot="img" alt="Zooplus logo" src="logo.png"/>
	<div class="buttons-holder">
		<div class="header-button">
			<zoo-button type="{theme === 'zoo' ? 'secondary' : 'primary'}" on:click={() => changeTheme('zoo')}>
				<span slot="buttoncontent">Zoo+ theme</span>
			</zoo-button>
		</div>
		<div class="header-button">
			<zoo-button type="{theme === 'grey' ? 'secondary' : 'primary'}" on:click={() => changeTheme('grey')}>
				<span slot="buttoncontent">Grey theme</span>
			</zoo-button>
		</div>
		<div class="header-button">
			<zoo-button type="{theme === 'random' ? 'secondary' : 'primary'}" on:click={() => generateRandomTheme()}>
				<span slot="buttoncontent">Random theme</span>
			</zoo-button>
		</div>
	</div>
</zoo-header>
<zoo-navigation>
	{#each navlinks as link}
		<div class="nav-link">
			<a href="{link.href}">{link.text}</a>
		</div>
	{/each}
</zoo-navigation>

<style type='text/scss'>
	@import "variables";
	
	.buttons-holder {
		display: flex;
		justify-content: flex-end;
		flex-direction: row;
		flex-grow: 1;
		padding: 0 25px 0 0;

		@media only screen and (max-width: 900px) {
			justify-content: initial;
			overflow: scroll;
			max-width: 250px;
		}
		@media only screen and (max-width: 544px) {
			justify-content: initial;
			overflow: scroll;
			max-width: 250px;
		}
	}

	.header-button {
		display: flex;
		max-width: 250px;
		min-width: 140px;
		margin-left: 15px;

		zoo-button {
			align-self: center;
		}
	}

	zoo-navigation {
		font-size: $p1-size;
		line-height: $p1-line-height;
		font-weight: bold;
		cursor: pointer;

		.nav-link {
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			height: 100%;

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
				setColorVar('--primary-mid', '#3C9700');
				setColorVar('--primary-light', '#66B100');
				setColorVar('--primary-dark', '#286400');
				setColorVar('--primary-ultralight', '#EBF4E5');
				setColorVar('--secondary-mid', '#FF6200');
				setColorVar('--secondary-light', '#FF8800');
				setColorVar('--secondary-dark', '#CC4E00');
				break;
			case 'grey':
				setColorVar('--primary-mid', '#676778');
				setColorVar('--primary-light', '#838399');
				setColorVar('--primary-dark', '#565664');
				setColorVar('--primary-ultralight', '#838399');
				setColorVar('--secondary-mid', '#ff3e00');
				setColorVar('--secondary-light', '#ff794d');
				setColorVar('--secondary-dark', '#c53100');
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
		setColorVar('--primary-mid', mainHex);
		setColorVar('--primary-light', lightenDarkenColor(mainHex, 30));
		setColorVar('--primary-dark', lightenDarkenColor(mainHex, -30));
		setColorVar('--primary-ultralight', lightenDarkenColor(mainHex, 60));
		const second = randomRgbaString();
		const secondHex = rgbToHex(second.r, second.g, second.b);
		setColorVar('--secondary-mid', rgbToHex(second.r, second.g, second.b));
		setColorVar('--secondary-light', lightenDarkenColor(secondHex, 30));
		setColorVar('--secondary-dark', lightenDarkenColor(secondHex, -30));
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
