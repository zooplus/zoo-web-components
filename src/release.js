import Header from '../zoo-modules/header-module/Header.svelte';
import Modal from '../zoo-modules/modal-module/Modal.svelte';
import Footer from '../zoo-modules/footer-module/Footer.svelte';
import Input from '../zoo-modules/input-module/Input.svelte';
import Button from '../zoo-modules/button-module/Button.svelte';
import Checkbox from '../zoo-modules/checkbox-module/Checkbox.svelte';
import Feedback from '../zoo-modules/feedback-module/Feedback.svelte';
import Tooltip from '../zoo-modules/tooltip-module/Tooltip.svelte';
import Select from '../zoo-modules/select-module/Select.svelte';
import SearchableSelect from '../zoo-modules/select-module/SearchableSelect.svelte';
import Link from '../zoo-modules/link-module/Link.svelte';
import InputInfo from '../zoo-modules/shared-module/InputInfo.svelte';
import Navigation from '../zoo-modules/navigation-module/Navigation.svelte';
import InputLabel from '../zoo-modules/shared-module/InputLabel.svelte';

export default {
	inputinfo: new InputInfo(),
	link: new Link(),
	header: new Header(),
	footer: new Footer(),
	checkbox: new Checkbox(),
	input: new Input(),
	select: new Select(),
	feedback: new Feedback(),
	tooltip: new Tooltip(),
	button: new Button(),
	modal: new Modal(),
	navigation: new Navigation(),
	inputLabel: new InputLabel(),
	searchableSelect: new SearchableSelect()
};