## API
- `loading` - whether to show the loader on the grid (for example, when waiting for backend to respond);
- `stickyheader` - whether the header of the grid should be sticky;
- `paginator` - whether the paginator for the grid should be shown;
- `currentpage` - current page that the user is on;
- `maxpages` - maximum number of pages;
- `resizable` - whether columns should be resizable. To prevent resizing particular column set `min-width` and `max-width`;
- `reorderable` - whether columns can be reordered.
- `--grid-column-sizes` - css custom property.      
By default, grid will calculate number of headers supplied via slot, and apply `repeat(var(--grid-column-num), minmax(50px, 1fr))` css rule to header and each row; If you want to change some of widths of some columns you can set `--grid-column-sizes` css custom property on `zoo-grid` to change width of columns, for example: `--grid-column-sizes: 150px repeat(9, minmax(50px, 1fr)) !important;` to force first column to be 150px wide.      
However, when `resizable` attribute is supplied, grid will set column widths automatically on element level, so `--grid-column-sizes` will not work, to force width of any column use the following css:
```
zoo-grid div[column="1"] {
	min-width: 150px;
}
```
- `(sortChange)` - output event, whenever user changes sorting the following object will be dispatched in event:      
```
{
	detail: {
		property: $propertyName,
		direction: $direction
	}
}
```
where:       
`$propertyName` - is the name of property passed to `sortable` header cell via `sortableproperty` property;      
`$direction` - either desc, asc or undefined;      
- `(pageChange)` - output event, whenever user changes current page the following object will be dispatched in event:
```
{
	detail: {
		pageNumber: $pageNumber
	}
}
```
where:      
`$pageNumber` - number of the page user wants to go to;

### Slots
This component accepts following slots:      
- headers: <zoo-grid-header slot="headercell"></zoo-grid-header>, `headercell` accepts `sortable` attribute and `sortableproperty` attribute;
- rows: <div slot="row"></div> ;
- paginator (optional): <div slot="paginator"></div>, when not provided, default `<zoo-grid-paginator>` will be used;
- page size selector (optional): <div slot="pagesizeselector"></div>;

## Example usage (using some Svelte syntax):
```
<zoo-grid stickyheader paginator currentpage="5" maxpages="20" resizable
			on:sortChange="{e => handleSortChange(e.detail)}" on:pageChange="{e => handlePageChange(e.detail)}">

	{#each headers as header}
		<zoo-grid-header slot="headercell" sortable={header.sortable ? 'sortable' : null} sortableproperty='{header.sortProperty}'>{header.title}</zoo-grid-header>
	{/each}
	{#each data as row} 
		<div slot="row">
			<div>{row.minWeight}</div>
			<div>{row.maxWeight}</div>
			<div>{row.noOfPieces}</div>
			<div>{row.price}</div>
		</div>
	{/each}

	<div slot="pagesizeselector">
		<zoo-select labeltext="Page size" labelposition="left" >
			<select slot="selectelement" class="item-per-page-selector">
				{#each possibleNumberOfItems as number, idx}
					<option selected="{idx == 0}">{number}</option>
				{/each}
			</select>
		</zoo-select>
	</div>
</zoo-grid>
```
