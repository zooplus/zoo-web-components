<svelte:options tag="app-buttons"></svelte:options>
<zoo-toast text="Search for more than 8.000 products." bind:this={toast}></zoo-toast>
<zoo-toast text="Added to cart!" bind:this={modalToast}></zoo-toast>
<app-context text="Buttons, tooltips, modal windows"></app-context>
<div class="buttons">
	<zoo-button size="small" on:click="{() => toast.show()}">
		<span slot="buttoncontent">Summon toast!</span>
	</zoo-button>
	<zoo-button size="small" disabled="{true}" class="top-tooltip">
		<div slot="buttoncontent">
			Disabled :(
			<zoo-tooltip position="bottom" text="Just set disabled attribute on `zoo-button`"></zoo-tooltip>
		</div>
	</zoo-button>
	<zoo-button type="secondary" size="small" on:click="{() => modal.openModal()}">
		<span slot="buttoncontent">Show modal</span>
	</zoo-button>
	<zoo-button type="hollow" size="small">
		<span slot="buttoncontent">Dummy button that does nothing</span>
	</zoo-button>
	<zoo-button size="small" class="icon-btn">
		<svg title="Example title" class="btn-svg" slot="buttoncontent" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g fill="#555" fill-rule="evenodd"><path d="M9 14.998a3 3 0 010 6v2.252a.75.75 0 11-1.5 0v-7.434a.75.75 0 01.747-.818h.753zm3.875-15c.597 0 1.17.238 1.591.66l5.871 5.87c.422.423.66.995.659 1.592v4.628a.75.75 0 11-1.5 0V8.12a.75.75 0 00-.22-.53l-5.87-5.872a.75.75 0 00-.531-.22H2.246a.75.75 0 00-.75.75v19.5c0 .414.336.75.75.75h3a.75.75 0 110 1.5h-3a2.25 2.25 0 01-2.25-2.25v-19.5a2.25 2.25 0 012.25-2.25h10.63zm10.371 15a.75.75 0 010 1.5h-1.5a.75.75 0 00-.75.75v2.251l1.504.001a.75.75 0 110 1.5l-1.504-.001v2.249a.75.75 0 11-1.5 0v-6a2.25 2.25 0 012.25-2.25h1.5zm-9 0a3.75 3.75 0 013.75 3.75v1.5a3.75 3.75 0 01-3.75 3.75.75.75 0 01-.75-.75v-7.5a.75.75 0 01.75-.75zm.75 1.628v5.744a2.25 2.25 0 001.5-2.122v-1.5a2.25 2.25 0 00-1.5-2.122zM9 16.498v3a1.5 1.5 0 000-3z"/><path d="M20.246 7.498a.75.75 0 110 1.5h-6a2.25 2.25 0 01-2.25-2.25v-6a.75.75 0 011.5 0v6c0 .414.336.75.75.75h6z"/></g></svg>
	</zoo-button>
	<zoo-button type="secondary" size="small" class="icon-btn">
		<svg title="Example title" class="btn-svg" slot="buttoncontent" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.324l1.036-1.035a6.423 6.423 0 019.094 9.071l-9.589 10.003a.75.75 0 01-1.082 0l-9.577-9.988A6.422 6.422 0 015.394 1.49a6.423 6.423 0 015.57 1.798L12 4.324z" fill="#555" fill-rule="evenodd"/></svg>
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
		<zoo-button style="margin: 0 auto" type="hollow" size="medium" on:click="{() => closeModal()}">
			<span slot="buttoncontent">Add to cart</span>
		</zoo-button>
	</div>
</zoo-modal>
<style type='text/scss'>

	:host {
		contain: layout;
	}
	.buttons {
		max-width: 1280px;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		grid-gap: 15px;
		width: 90%;
		justify-content: center;
		@media only screen and (max-width: 850px) {
			grid-template-columns: auto;
		}
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
				animation: fadeTooltipIn 0.2s;
			}
		}
	}

	.icon-btn {
		width: 40px;
	}

	.btn-svg {
		padding: 0;

		path {
			fill: white;
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