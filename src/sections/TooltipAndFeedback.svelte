<svelte:options tag="app-tooltip-and-feedback"></svelte:options>
<app-context text="Third section is a showcase of tooltips and feedback boxes."></app-context>
<div class="inner-content">
	<div class="feedback-tooltip">
		<zoo-feedback type="info" text="This is an info message. This element will show tooltip on the right side on hover."></zoo-feedback>
		<zoo-tooltip position="right" text="Hello from right side."></zoo-tooltip>
	</div>
	<div class="feedback-tooltip">
		<zoo-feedback type="error" text="This is an error message. This element will show tooltip on the left side on hover."></zoo-feedback>
		<zoo-tooltip position="left" text="Hello from left side."></zoo-tooltip>
	</div>
	<div class="feedback-tooltip">
		<zoo-feedback type="success" text="This is a success message. This element will show tooltip on the bottom side on hover."></zoo-feedback>
		<zoo-tooltip position="bottom" text="Hello from below"></zoo-tooltip>
	</div>
	<div class="special-tooltip"> 
		<zoo-button on:click="{showSpecialTooltip}">
			<span class="slotted-span" slot="buttoncontent">This element will show tooltip on top only when it is clicked.</span>
		</zoo-button>
		<zoo-tooltip bind:this={specialTooltip} text="Hello from up above">
			<zoo-input class="input-in-tooltip">
				<input slot="inputelement" placeholder="Search for more than 8.000 products"/>
			</zoo-input>
			<zoo-tooltip class="nested-tooltip" position="right" text="Hello from nested tooltip.">
			</zoo-tooltip>
		</zoo-tooltip>
	</div>
</div>

<style type='text/scss'>
	@import "variables";
	.inner-content {
		flex: 1 0 auto;
		width: 70%;
		.feedback-tooltip {
			height: 60px;
			margin-bottom: 15px;
			position: relative;
			&:hover {
				zoo-tooltip {
					display: block;
				}
			}
		}
	}
	.special-tooltip {
		width: 250px;
		position: relative;
		margin: 0 auto;
		cursor: pointer;
		.slotted-span {
			line-height: 25px;
		}
	}
	.top-tooltip {
		position: relative;
		display: inline-block;
		&:hover {
			zoo-tooltip {
				display: block;
			}
		}
	}
	zoo-tooltip {
		display: none;
	}
	.input-in-tooltip:hover~.nested-tooltip {
		display: block;
	}
</style>

<script>
	let specialTooltip;
	const showSpecialTooltip = () => {
		const elStyle = specialTooltip.style;
		const display = !elStyle.display || elStyle.display === 'none' ? 'block' : 'none';
		elStyle.display = display;
	};
</script>