import App from './App.svelte';
// import '../zoo-modules/top-bar-module/TopBar.svelte';
import '../zoo-modules/header-module/Header.svelte';
import '../zoo-modules/modal-module/Modal.svelte';
import '../zoo-modules/navigation-module/Navigation.svelte';
import '../zoo-modules/footer-module/Footer.svelte';
import '../zoo-modules/button-module/Button.svelte';
import '../zoo-modules/input-module/Input.svelte';
import '../zoo-modules/checkbox-module/Checkbox.svelte';
import '../zoo-modules/feedback-module/Feedback.svelte';
import '../zoo-modules/link-module/Link.svelte';
import '../zoo-modules/tooltip-module/Tooltip.svelte';
import '../zoo-modules/select-module/Select.svelte';
import '../zoo-modules/searchable-select-module/SearchableSelect.svelte';
import '../zoo-modules/shared-module/InputInfo.svelte';
import '../zoo-modules/shared-module/InputLabel.svelte';

const app = new App({
	target: document.body
});

export default app;