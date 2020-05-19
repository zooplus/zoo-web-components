<svelte:options tag="docs-input"></svelte:options>

<app-context text="Input component API."></app-context>
<div class="doc-element">
	<div class="list">
		<zoo-collapsable-list bind:this={list}>
			<zoo-collapsable-list-item slot="item0">
				<ul>
					<li>
						<b>labelposition</b> - accepts following values: <b>top</b>, <b>left</b>. Default is <b>top</b>
					</li>
					<li>
						<b>labeltext</b> - text to be presented as the label of the input
					</li>
					<li>
						<b>linktext</b> - text to be presented as a link text
					</li>
					<li>
						<b>linkhref</b> - where the link should lead
					</li>
					<li>
						<b>linktarget</b> - target of the anchor link, default is <b>about:blank</b>
					</li>
					<li>
						<b>inputerrormsg</b> - error message to be presented when input is in invalid state
					</li>
					<li>
						<b>infotext</b> - text to be presented below the input
					</li>
					<li>
						<b>valid</b> - flag which indicates whether the input is valid or not
					</li>
				</ul>
			</zoo-collapsable-list-item>
			<zoo-collapsable-list-item slot="item1">
				This component accepts the following slots:
				<ul>
					<li>
						<b>{inputSlotExample}</b> - replaced with provided <b>input</b> so that you can catch events/provide your css/attach framework specific directives from/to this element.<br>
					</li>
					<li>
						<b>{labelSlotExample}</b> - replaced with provided <b>label</b> for a11y reasons.
					</li>
				</ul>
			</zoo-collapsable-list-item>
		</zoo-collapsable-list>
	</div>
	<div class="example">
		<code><pre>{example}</pre></code>
		will produce the following:
		<div style="width: 250px;">
			<zoo-input labeltext="Input label" 
				linktext="Forgotten your password?"
				linkhref="https://google.com"
				linktarget="about:blank"
				valid="{true}"
				infotext="Additional helpful information for our users" >
				<input slot="inputelement" placeholder="input"/>
			</zoo-input>
		</div>
	</div>
</div>

<style type="text/scss">
	@import "shared";
</style>

<script>
	import { onMount } from 'svelte';
	let list;
	let inputSlotExample = `<slot name="inputelement"></slot>`;
	let labelSlotExample = `<slot name="inputlabel"></slot>`;
	let example = `<div style="width: 250px;">\n  <zoo-input labeltext="Input label"\n    linktext="Forgotten your password?"\n    linkhref="https://google.com"\n    linktarget="about:blank"\n    infotext="Additional helpful information for our users" >\n    <input slot="inputelement" placeholder="input"/>\n  </zoo-input>\n</div>`;
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