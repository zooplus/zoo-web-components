<svelte:options tag="zoo-log-footer"></svelte:options>
<div class="footer-links">
	<div class="list-holder">
		<ul>
			{#each footerlinks as footerlink}
			<li>
				<zoo-log-link href="{footerlink.href}" target="{footerlink.target}" type="{footerlink.type}"
				disabled="{footerlink.disabled}" text="{footerlink.text}">
				</zoo-log-link>
			</li>
			{/each}
		</ul>
	</div>
</div>
<div class="footer-copyright">
	© zooplus AG {currentYear}
</div>

<style type='text/scss'>
	@import "variables";
	:host {
		contain: style;
	}
	.footer-links {
	  display: flex;
	  background-image: linear-gradient(left, $main-color, $main-color-light);
	  background-image: -webkit-linear-gradient(left, $main-color, $main-color-light);
	  justify-content: center;
	  padding: 10px 30px;
	  flex-wrap: wrap;
	  .list-holder {
		position: relative;
		overflow: hidden;
			ul {
				display: flex;
				flex-direction: row;
				flex-wrap: wrap;
				justify-content: center;
				list-style: none;
				margin-left: -1px;
				padding-left: 0;
				margin-top: 0;
				margin-bottom: 0;
				li {
					flex-grow: 1;
					flex-basis: auto;
					margin: 5px 0;
					padding: 0 5px;
					text-align: center;
					border-left: 1px solid #e6e6e6;
				}
			}
		}
	}
	.footer-copyright {
	  font-size: 12px;
	  line-height: 16px;
	  text-align: left;
	  background: $white;
	  color: $matterhorn;
	  padding: 10px 0 10px 30px;
	  @media only screen and (max-width: 544px) {
		  text-align: center;
		  padding: 10px 0;
	  }
	}
</style>

<script>
	export let footerlinks = [];
	let currentYear = new Date().getFullYear();
</script>