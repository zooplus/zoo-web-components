import Header from '../zoo-modules/header-module/Header.html';
import Modal from '../zoo-modules/modal-module/Modal.html';
import Footer from '../zoo-modules/footer-module/Footer.html';
import Input from '../zoo-modules/input-module/Input.html';
import Button from '../zoo-modules/button-module/Button.html';
import Checkbox from '../zoo-modules/checkbox-module/Checkbox.html';
import Feedback from '../zoo-modules/feedback-module/Feedback.html';
import Tooltip from '../zoo-modules/tooltip-module/Tooltip.html';
import Select from '../zoo-modules/select-module/Select.html';
import Link from '../zoo-modules/link-module/Link.html';
import InputInfo from '../zoo-modules/shared-module/InputInfo.html'

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
	modal: new Modal()
};