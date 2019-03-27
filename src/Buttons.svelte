<svelte:options tag="app-buttons"></svelte:options>
<zoo-toast text="Search for more than 8.000 products." bind:this={toast}>
</zoo-toast>
<div class="context">
	<h2>Second section is a showcase of buttons and modals.</h2>
</div>
<div class="buttons">
	<zoo-button size="medium" on:click="{() => toast.show()}">
		<span slot="buttoncontent" class="slotted-span">Here we have a very long text indeed!</span>
	</zoo-button>
	<zoo-button size="medium" disabled="{true}" class="top-tooltip">
		<div slot="buttoncontent">
			Disabled :(
			<zoo-tooltip position="bottom"
				text="Just set disabled attribute on `zoo-button`">
			</zoo-tooltip>
		</div>
	</zoo-button>
	<zoo-button type="hot" size="medium" on:click="{() => modal.openModal()}">
		<span slot="buttoncontent" class="slotted-span">Show modal</span>
	</zoo-button>
</div> 
<zoo-modal style="display: none" headertext="Your basket contains licensed items" bind:this={modal}>
	<div>
		<zoo-feedback 
		type="info" 
		text="This is an info message. Only one coupon can be accepted with each order. Please choose one coupon that you just entered.">
		</zoo-feedback>
		<br>
		<zoo-select labeltext="This product is for" 
			valid="{true}">
			<select slot="selectelement">
				<option class="placeholder" value="" disabled selected>Doge</option>
				<option>Doge</option>
				<option>Catz</option>
				<option>Snek</option>
			</select>
		</zoo-select>
		<br>
		<zoo-checkbox highlighted
			labeltext="I understand and confirm that ALL of the above statements are true">
			<input slot="checkboxelement" type="checkbox"/>
		</zoo-checkbox>
		<br>
		<zoo-button type="hot" size="medium" on:click="{() => modal.closeModal()}">
			<span slot="buttoncontent">Add to cart</span>
		</zoo-button>
	</div>
</zoo-modal>
<style type='text/scss'>
	@import "variables";
	.context {
		height: 80px;
		h2 {
			color: $main-color;
			text-align: center;
		}
	}
	.buttons {
		max-width: 1280px;
		margin: 20px auto;
		display: flex;
		width: 90%;
		zoo-button {
			margin-left: 15px;
			&:first-of-type {
				margin-left: 0;
			}
		}
	}
	.slotted-span {
		display: block;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}
	zoo-tooltip {
		display: none;
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
</style>
<script>
	let toast;
	let modal;

	const showModal = () => {
		modal.style.display = 'block';
	};
</script>