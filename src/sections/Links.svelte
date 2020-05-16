<svelte:options tag="app-links"></svelte:options>
<app-context text="Fifth section is a showcase of links"></app-context>
<div class="links">
	<zoo-link type="primary" size="large" text="Primary large link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="warning" size="large" text="Warning large link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="primary" size="bold" text="Primary bold link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="warning" size="bold" text="Warning bold link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="primary" size="regular" text="Primary regular link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="warning" size="regular" text="Warning regular link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="grey" size="regular" text="Grey regular link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link type="grey" disabled="true" size="regular" text="Disabled link" href="https://github.com/zooplus/zoo-web-components"></zoo-link>
	<zoo-link class="with-icon" type="primary" size="regular" text="Icon before" href="https://github.com/zooplus/zoo-web-components">
		<svg slot="pre" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" width="18px" height="18px"><rect fill="none" height="24" width="24"/><path d="M3,4V1h2v3h3v2H5v3H3V6H0V4H3z M6,10V7h3V4h7l1.83,2H21c1.1,0,2,0.9,2,2v12c0,1.1-0.9,2-2,2H5c-1.1,0-2-0.9-2-2V10H6z M13,19c2.76,0,5-2.24,5-5s-2.24-5-5-5s-5,2.24-5,5S10.24,19,13,19z M9.8,14c0,1.77,1.43,3.2,3.2,3.2s3.2-1.43,3.2-3.2 s-1.43-3.2-3.2-3.2S9.8,12.23,9.8,14z"/></svg>
	</zoo-link>
	<zoo-link class="with-icon" type="primary" size="regular" text="Icon after" href="https://github.com/zooplus/zoo-web-components">
		<svg slot="post" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
	</zoo-link>
	<zoo-link class="with-icon" type="primary" size="regular" text="Icons around" href="https://github.com/zooplus/zoo-web-components">
		<svg slot="pre" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24" width="18px" height="18px"><rect fill="none" height="24" width="24"/><path d="M3,4V1h2v3h3v2H5v3H3V6H0V4H3z M6,10V7h3V4h7l1.83,2H21c1.1,0,2,0.9,2,2v12c0,1.1-0.9,2-2,2H5c-1.1,0-2-0.9-2-2V10H6z M13,19c2.76,0,5-2.24,5-5s-2.24-5-5-5s-5,2.24-5,5S10.24,19,13,19z M9.8,14c0,1.77,1.43,3.2,3.2,3.2s3.2-1.43,3.2-3.2 s-1.43-3.2-3.2-3.2S9.8,12.23,9.8,14z"/></svg>
		<svg slot="post" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
	</zoo-link>
</div>
<style type='text/scss'>
	@import "variables";

	:host {
		contain: layout;
	}

	.links {
		max-width: 1280px;
		margin: 20px auto;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		grid-gap: 15px;
		width: 90%;
		justify-content: center;
		@media only screen and (max-width: 850px) {
			grid-template-columns: auto;
		}
	}

	.with-icon svg {
		fill: $primary-mid;
	}
</style>
<script>
	
</script>