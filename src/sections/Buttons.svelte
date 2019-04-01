<svelte:options tag="app-buttons"></svelte:options>
<zoo-toast text="Search for more than 8.000 products." bind:this={toast}></zoo-toast>
<zoo-toast text="Added to cart!" bind:this={modalToast}></zoo-toast>
<app-context text="Second section is a showcase of buttons and modals"></app-context>
<div class="buttons">
	<zoo-button size="small" on:click="{() => toast.show()}">
		<span slot="buttoncontent" class="slotted-span">Here we have a very long text indeed!</span>
	</zoo-button>
	<zoo-button size="small" disabled="{true}" class="top-tooltip">
		<div slot="buttoncontent">
			Disabled :(
			<zoo-tooltip position="bottom"
				text="Just set disabled attribute on `zoo-button`">
			</zoo-tooltip>
		</div>
	</zoo-button>
	<zoo-button type="hot" size="small" on:click="{() => modal.openModal()}">
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
		<zoo-button type="hot" size="medium" on:click="{() => closeModal()}">
			<span slot="buttoncontent">Add to cart</span>
		</zoo-button>
	</div>
</zoo-modal>
<style type='text/scss'>
	.buttons {
		max-width: 1280px;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		grid-gap: 15px;
		width: 90%;
		@media only screen and (max-width: 768px) {
			grid-template-columns: auto;
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
	let modalToast;

	const showModal = () => {
		modal.style.display = 'block';
	};
	const closeModal = () => {
		modal.closeModal();
		modalToast.show();
	}
</script>