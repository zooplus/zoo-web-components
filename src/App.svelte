<svelte:options tag="my-app"></svelte:options>
<div class="app">
	<zoo-log-header imgsrc="logo.png" headertext="{headertext}">
		<div class="search-field-holder">
			<div class="header-search">
				<zoo-log-input>
					<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
					<span class="icon-search-default" slot="inputicon"></span>
				</zoo-log-input>
			</div>
			<div class="header-button">
				<zoo-log-button type="hot" size="medium">
					<div slot="buttoncontent">
						<span class="icon-cart-copy"></span>
						<span class="slotted-span">Shopping Cart</span>
					</div>
				</zoo-log-button>
			</div>
		</div>
	</zoo-log-header>
	<zoo-log-navigation class="nav">
		<div>
			{#each navlinks as link}
				<zoo-log-link href="{link.href}" target="{link.target}" type="{link.type}"
					text="{link.text}">
				</zoo-log-link>
			{/each}
		</div>
	</zoo-log-navigation>
	<form>
		<zoo-log-input labeltext="Input type text" 
			linktext="Forgotten your password?"
			linkhref="https://google.com"
			linktarget="about:blank"
			valid="{inputState}"
			inputerrormsg="invalid"
			infotext="Additional helpful information for our users" >
			<input slot="inputelement" type="text" placeholder="input"/>
		</zoo-log-input>
		<zoo-log-input labeltext="Input type number" 
			linktext="Forgotten your password?"
			linkhref="https://google.com"
			linktarget="about:blank"
			infotext="Additional helpful information for our users" >
			<input slot="inputelement" type="number" placeholder="input"/>
		</zoo-log-input>
		<zoo-log-input labeltext="This input has type date"
			linktext="Native date picker -> click me"
			linkhref="https://github.com/jcgertig/date-input-polyfill"
			linktarget="about:blank"
			infotext="Click on input to show context menu with date selection" >
			<input slot="inputelement" type="date" placeholder="Enter date"/>
		</zoo-log-input>
		<zoo-log-input labeltext="This input has type time"
			infotext="Select time" >
			<input slot="inputelement" type="time" placeholder="Enter time"/>
		</zoo-log-input>
		<zoo-log-input labeltext="Textarea example" valid="{inputState}">
			<textarea slot="inputelement" placeholder="Textarea"></textarea>
		</zoo-log-input>
		<zoo-log-select labeltext="Multiselect"
			valid="{inputState}"
			inputerrormsg="Value is required"
			infotext="Additional helpful information for our users" >
			<select slot="selectelement" multiple>
				<option class="placeholder" value="" disabled selected>Placeholder</option>
				<option>1</option>
				<option>2</option>
				<option>3</option>
			</select>
		</zoo-log-select>
		<zoo-log-select labeltext="Standard select"
			valid="{inputState}"
			inputerrormsg="Value is required"
			infotext="Additional helpful information for our users" >
			<select slot="selectelement">
				<option class="placeholder" value="" disabled selected>Placeholder</option>
				<option>1</option>
				<option>2</option>
				<option>3</option>
			</select>
		</zoo-log-select>
		<zoo-log-searchable-select labeltext="Searchable multiple select" placeholder="Placeholder" infotext="Additional helpful information for our users which is a long text. Additional helpful information for our users which is a long text">
			<select multiple slot="selectelement">
				{#each options as option}
					<option value="{option.value}" style="display: {option.display}">
						{option.text}
					</option>
				{/each}
			</select>
		</zoo-log-searchable-select>
		<zoo-log-searchable-select labeltext="Searchable select" placeholder="Placeholder" infotext="Additional helpful information for our users.">
			<select slot="selectelement">
				{#each options as option}
					<option value="{option.value}" style="display: {option.display}">
						{option.text}
					</option>
				{/each}
			</select>
		</zoo-log-searchable-select>
		<zoo-log-checkbox highlighted="{true}"
			valid="{inputState}"
			labeltext="An example checkbox with some additional event handling of clicks inside">
			<input slot="checkboxelement" type="checkbox"/>
		</zoo-log-checkbox>
		<zoo-log-radio valid="{inputState}" errormsg="errormsg" infotext="infotext">
			<template>
				<input type="radio" id="contactChoice1" name="contact" value="email" disabled>
				<label for="contactChoice1">Email</label>
				<input type="radio" id="contactChoice2" name="contact" value="phone">
				<label for="contactChoice2">Phone</label>
				<input type="radio" id="contactChoice3" name="contact" value="mail">
				<label for="contactChoice3">Mail</label>
			</template>
		</zoo-log-radio>

		<zoo-log-radio valid="{inputState}" errormsg="errormsg" infotext="infotext">
			<input type="radio" id="contactChoice4" name="contact" value="email" disabled>
			<label for="contactChoice4">Email</label>
			<input type="radio" id="contactChoice5" name="contact" value="phone">
			<label for="contactChoice5">Phone</label>
		</zoo-log-radio>
	</form>
	<div class="buttons">
		<zoo-log-button type="hot" size="medium" on:click="{changeState}">
			<div slot="buttoncontent">
				<span class="slotted-span">Trigger invalid state!</span>
				<span class="icon-angle-down"></span>
			</div>
		</zoo-log-button>
		<zoo-log-button size="medium">
			<div slot="buttoncontent">
				<span class="icon-angle-up"></span>
				<span class="slotted-span">Here we have a very long text indeed!</span>
				<span class="icon-angle-down"></span>
			</div>
		</zoo-log-button>
		<zoo-log-button size="medium" disabled="{true}" class="top-tooltip">
			<div slot="buttoncontent">
				Disabled :(
				<zoo-log-tooltip position="bottom"
					text="Just set disabled attribute on `zoo-log-button`">
				</zoo-log-tooltip>
			</div>
		</zoo-log-button>
		<zoo-log-button type="hot" size="medium" on:click="{showModal}">
			<div slot="buttoncontent">
				<span class="slotted-span">Show modal</span>
			</div>
		</zoo-log-button>
	</div> 
	<div class="content">
		<zoo-log-feedback 
			type="info" 
			text="This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered."></zoo-log-feedback>
		<br>
		<zoo-log-feedback type="error" text="This is an error message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered."></zoo-log-feedback>
		<br>
		<zoo-log-feedback type="success" text="This is a success message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered."></zoo-log-feedback>
		<br>
		<div class="special-tooltip"> 
			<span on:click="{showSpecialTooltip}">
				This element will show tooltip on top only when it is clicked.
			</span>
			<zoo-log-tooltip bind:this={specialTooltip} text="Hello from up above">
				<div>
					<zoo-log-input class="input-in-tooltip">
						<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
						<span class="icon-search-default" slot="inputicon"></span>
					</zoo-log-input>
					<zoo-log-tooltip class="nested-tooltip" position="right" text="Hello from nested tooltip.">
					</zoo-log-tooltip>
				</div>
			</zoo-log-tooltip>
		</div>
		<br>
		<div class="top-tooltip"> 
			This element will show tooltip on the right side on hover.
			<zoo-log-tooltip position="right" text="Hello from right side.">
			</zoo-log-tooltip>
		</div>
		<br>
		<div class="top-tooltip"> 
			This element will show tooltip on the left side on hover.
			<zoo-log-tooltip position="left" text="Hello from left side.">
			</zoo-log-tooltip>
		</div>
		<br>
		<div class="top-tooltip"> 
			This element will show tooltip on the bottom side on hover.
			<zoo-log-tooltip position="bottom" text="Hello from below">
			</zoo-log-tooltip>
		</div>
	</div>
	<zoo-log-modal style="display: none" headertext="Your basket contains licensed items" bind:this={modal} on:modalClosed="{handleModalClosed}">
		<div>
			<zoo-log-feedback 
			type="info" 
			text="This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.">
			</zoo-log-feedback>
			<br>
			<zoo-log-select labeltext="This product is for" 
				valid="{true}">
				<select slot="selectelement">
					<option class="placeholder" value="" disabled selected>Doge</option>
					<option>Doge</option>
					<option>Catz</option>
					<option>Snek</option>
				</select>
			</zoo-log-select>
			<br>
			<zoo-log-checkbox highlighted
				labeltext="I understand and confirm that ALL of the above statements are true">
				<input slot="checkboxelement" type="checkbox"/>
			</zoo-log-checkbox>
			<br>
			<zoo-log-button type="hot" size="medium">
				<div slot="buttoncontent">
					<span>Add to cart</span>
				</div>
			</zoo-log-button>
		</div>
	</zoo-log-modal>
	<zoo-log-footer footerlinks="{footerlinks}" bind:this={zooLogFooter}></zoo-log-footer> 
</div>

<style type='text/scss'>
	.nav {
		zoo-log-link {
			padding: 0 15px;
			&:hover, &:active {
				background: rgba(255, 255, 255, 0.3);
			}
		}
	}
	.btn-tooltip {
		position: relative;
		display: inline-block;
	}
	[class^="icon-"], [class*=" icon-"] {
		font-family: "zooplus-icons" !important;
		font-display: auto;
		speak: none;
		font-style: normal;
		font-weight: normal;
		font-variant: normal;
		text-transform: none;
		line-height: 1;

		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
	.icon-cart-copy {
		padding-right: 5px;
		height: 46px;
		align-items: center;
		display: flex;
	}
	.icon-cart-copy:before {
		content: "\EA12";
		position: relative;
		color: white;
		font-size: 27px;
	}
	.slotted-span {
	  text-overflow: ellipsis;
	  overflow: hidden;
	  white-space: nowrap;
	}
	.icon-angle-up:before, .icon-angle-down:after {
		position: relative;
		top: 30%;
		color: white;
	}
	.icon-angle-up:before {
		content: "\EA05";
	}
	.icon-angle-down:after {
		content: "\EA02";
	}
	.icon-search-default:before {
		content: "\EA73";
		position: absolute;
		right: 2%;
		top: 18%;
		padding: 5px;
		line-height: 20px;
		color: forestgreen;
		font-size: 25px;
	}
	.input-in-tooltip:hover~.nested-tooltip {
		display: block;
	}
	.app {
		max-width: 1280px;
		margin: 0 auto;
		height: 100%;
		display: flex;
		flex-direction: column;
		box-shadow: 15px 0px 40px 0px rgba(85,85,85, 0.3), -15px 0px 40px 0px rgba(85,85,85, 0.3);
	}
	form {
		max-width: 1280px;
		width: 70%;
		flex: 1 0 auto;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		grid-template-rows: 120px 150px 120px 70px;
		@media only screen and (max-width: 544px) {
			grid-template-rows: auto;
		}
		grid-gap: 20px;
	}
	.buttons {
		max-width: 1280px;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		grid-gap: 20px;
		width: 90%;
	}
	.content {
		flex: 1 0 auto;
		width: 70%;
		margin: 20px auto;
	}
	.special-tooltip {
		width: 200px;
		position: relative;
		cursor: pointer;
		zoo-log-tooltip {
			display: none;
		}
	}
	.top-tooltip {
		position: relative;
		display: inline-block;
		zoo-log-tooltip {
			display: none;
		}
		&:hover {
			zoo-log-tooltip {
				display: inline-block;
			}
		}
	}
	zoo-log-footer {
		flex-shrink: 0;
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
		zoo-log-button {
			align-self: center;
		}
		@media only screen and (max-width: 544px) {
			.slotted-span {
				display: none;
			}
		}
	}
</style>

<script>
	import { onMount, onDestroy } from 'svelte';
	let options = [
		{
			text: 'text',
			value: 'value'
		},
		{
			text: 'MATINA (BFB plus KFT.) (12009)',
			value: 'random'
		},
		{
			text: 'raNdOm',
			value: 'random'
		},
		{
			text: 'random1',
			value: 'random1'
		},
		{
			text: 'random2',
			value: 'random2'
		}
	];
	let zooLogFooter;
	let topBarLanguages = [
		{text: 'DE', active: true}, {text: 'PL', active: false}
	];
	let navlinks = [
		{
			href: 'https://google.com',
			text: 'Doge',
			type: 'standard',
			active: true
		},
		{
			href: 'https://google.com',
			text: 'Catz',
			type: 'standard',
		},
		{
			href: 'https://google.com',
			text: 'Snek',
			type: 'standard',
		}
	];
	let footerlinks = [
		{
			href: 'https://google.com',
			text: 'About us',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Careers',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Investor Relations',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Imprint',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Terms & Conditions',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Methods of Payment',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'WEEE',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Privacy',
			type: 'standard'
		},
		{
			href: 'https://google.com',
			text: 'Opt-out',
			type: 'standard'
		}
	];
	let headertext = 'header text';
	let imgsrc = '';
	let inputState = true;
	let helplink = {
		text: 'Help & Contact',
		href: 'https://google.com',
		type: 'green'
	};
	let reoderlink = {
		text: 'Reorder',
		href: 'https://google.com',
		type: 'grey'
	};

	let specialTooltip;
	let modal;

	const showModal = () => {
		modal.style.display = 'block';
	};
	const showSpecialTooltip = () => {
		const elStyle = specialTooltip.style;
		const display = !elStyle.display || elStyle.display === 'none' ? 'block' : 'none';
		elStyle.display = display;
	};
	const handleModalClosed = () => {
		console.log('modal closed');
	};
	const changeState = () => {
		inputState = !inputState;
	}
	export function asd() {
		console.log('asd');
	}
</script>