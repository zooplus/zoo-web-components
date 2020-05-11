<svelte:options tag="docs-grid"></svelte:options>

<app-context text="Grid component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>loading</b> - whether to show the loader on the grid <br> (for example, when waiting for backend to respond).
					</li>
					<li>
						<b>stickyheader</b> - whether the header of the grid should be sticky.
					</li>
					<li>
						<b>paginator</b> - whether the paginator for the grid should be shown.
					</li>
					<li>
						<b>currentpage</b> - current page that the user is on.
					</li>
					<li>
						<b>maxpages</b> - maximum number of pages
					</li>
					<li>
						<b>Event (sortChange)</b> - whenever user changes sorting<br> the following object will be dispatched in event:<br>
						<b>{sortChangeExample}</b><br>
						<b>$propertyName</b> - is the name of property<br>passed to 'sortable' header cell via 'sortableproperty' property;<br>
						<b>$direction</b> - either desc, asc or undefined.
					</li>
					<li>
						<b>Event (pageChange)</b> - whenever user changes current page<br>the following object will be dispatched in event:<br>
						<b>{pageChangeExample}</b><br>
						<b>$pageNumber</b> - number of the page user wants to go to.
					</li>
					<li>
						<b>resizable</b> - whether columns should be resizable. To prevent resizing particular column set `min-width` and `max-width`;
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts following slots:
				<ul style="white-space: pre">
					<li>{headerSlotExample}</li>
					<li>{rowSlotExample}</li>
					<li>{paginatorSlotExample}</li>
					<li>{pageSizeSlotExample}</li>
				</ul>
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="padding: 10px;">
			<zoo-grid paginator currentpage="1" maxpages="50">
				<div slot="headercell" sortable sortableproperty="title1">Title 1</div>
				<div slot="headercell">Title 2</div>
				<div slot="row">
					<div>Cell 1</div>
					<div>Cell 2</div>
				</div>
				<div slot="row">
					<div>Cell 3</div>
					<div>Cell 4</div>
				</div>
			</zoo-grid>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let sortChangeExample = `{detail: { property: $propertyName, direction: $direction }}`;
	let pageChangeExample = `{detail: { pageNumber: $pageNumber }}`;
	let headerSlotExample = `Headers: \n{#each headers as header}\n  <div slot="headercell"\n  sortable={header.sortable ? 'sortable' : null}\n  sortableproperty='{header.sortProperty}'>\n  {header.title}\n  </div>\n{/each}`;
	let rowSlotExample = `Rows: \n{#each data as row} 
	<div class="example-row" slot="row">
		<div>{row.activated}</div>
		<div>{row.createdDate}</div>
		<div>{row.status}</div>
		<div>{row.minWeight}</div>
		<div>{row.maxWeight}</div>
		<div>{row.deliveryDate}</div>
		<div>{row.noOfPieces}</div>
		<div>{row.price}</div>
	</div>
{/each}`;
	let example = `<zoo-grid paginator currentpage="1" maxpages="50">
	<div slot="headercell" sortable sortableproperty="title1">Title 1</div>
	<div slot="headercell">Title 2</div>
	<div slot="row">
		<div>Cell 1</div>
		<div>Cell 2</div>
	</div>
	<div slot="row">
		<div>Cell 3</div>
		<div>Cell 4</div>
	</div>
</zoo-grid>`;
	let paginatorSlotExample = `Paginator (you can provide your own implementation):\n<zoo-grid-paginator>
	<slot name="pagesizeselector" 
		slot="pagesizeselector">
	</slot>
</zoo-grid-paginator>`;
	let pageSizeSlotExample = `Items per page selector\n(you should provide your own implementation):
<zoo-select labeltext="Items per page"
	slot="pagesizeselector">
	<select slot="selectelement">
		{#each possibleNumberOfItems as number}
			<option>{number}</option>
		{/each}
	</select>
</zoo-select>`;
	onMount(() => {
		list.items = [
			{
				header: 'API'
			},
			{
				header: 'Slots'
			}
		];
	});
</script>