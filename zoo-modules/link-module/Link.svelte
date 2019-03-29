<svelte:options tag="zoo-link"></svelte:options>
{#if text && href}
	<div class="link-box">
		<a style="text-align: {textalign}" href="{href}" target="{target}" class="{type}" class:disabled="{disabled}">
			<span>{text}</span>
			<div class="bottom-line"></div>
		</a>
	</div>
{/if}

<style type='text/scss'>
	@import "variables";
	.link-box {
	  width: 100%;
	  height: 100%;
	  display: flex;
	  flex-direction: column;
	  justify-content: center;
	  position: relative;
	  a {
	    text-decoration: none;
	    font-size: 12px;
		line-height: 16px;
		&.disabled {
	        color: $grey-chateau;
	        &:hover {
	          cursor: not-allowed;
	        }
		}
	    &.green {
	       color: var(--main-color);
	      &:hover, &:focus, &:active {
	        color: var(--main-color-dark);
	      }
	      &:visited {
	        color: var(--main-color-light);
	      }
	    }
	    &.standard {
	      color: white;
	      &:hover, &:focus, &:active {
	        color: $white;
	        cursor: pointer;
	      }
	      &:visited {
	        color: $white;
	      }
		  .bottom-line {
				position: absolute;
				bottom: -3px;
				left: 0;
				overflow: hidden;
				width: 0;
				border-bottom: 1px solid #fff;
				color: #fff;
				transition: width 0.3s;
			}
			&:hover .bottom-line {
				width: 100%;
			}
	    }
	    &.grey {
	      color: $placeholder-color;
	    }
	  }
	}
</style>

<script>
	export let href = "";
	export let text = "";
	export let target = "about:blank";
	export let type = "standard";
	export let disabled = false;
	export let textalign = 'center';
</script>