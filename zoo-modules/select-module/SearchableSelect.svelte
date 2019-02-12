<div class="searchable-select-box">
	<input class="searchable-input" 
		placeholder="{searchableplaceholder}" 
		type="text" on:keyup="handleSearchChange(event)" 
		ref:searchableInput>
	<zoo-log-select labeltext="{labeltext}" 
		searchable="{true}"
		labelposition="{labelposition}"
		linktext="{linktext}"
		linkhref="{linkhref}"
		linktarget="{linktarget}"
		inputerrormsg="{inputerrormsg}"
		infotext="{infotext}"
		valid="{valid}">
		<select slot="selectelement">
			{#each options as option}
				<option value="{option.value}">{option.text}</option>
			{/each}
		</select>
	</zoo-log-select>
</div>

<style>
</style>
<script>
	export default {
	  tag: "zoo-log-searchable-select",
	  data() {
	    return {
			labelposition: "top",
	        labeltext: "",
	        linktext: "",
	        linkhref: "",
	        linktarget: "about:blank",
	        inputerrormsg: "",
	        infotext: "",
	        valid: true,
			_slottedSelect: undefined,
			options: [
				{
					text: 'text',
					value: 'value'
				}
			]
	    };
	  },
	  methods: {
		  handleSearchChange(event) {
			console.log(event);
			const inputVal = this.refs.searchableInput.value;
			console.log(inputVal);
		}
	  }
	}
</script>