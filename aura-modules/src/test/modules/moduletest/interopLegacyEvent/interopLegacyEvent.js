import { LightningElement, api, unwrap } from "lwc";

export default class InteropLegacyEvent extends LightningElement {
    @api
    triggerEvent() {
        // a bug in Chrome prevents us from using focus() here. Fixed in Chome 67.
        this.template.querySelector('.trigger-click').click();
    }

    handleButtonClick(event) {
        let detail = {};

        if (this.getAttribute('data-aura-rendered-by')) {
            detail._originalEvent = unwrap(event);
        }

        const customEvent = new CustomEvent('focus', { detail });
        this.dispatchEvent(customEvent);
    }
}

InteropLegacyEvent.interopMap = {
    exposeNativeEvent: {
        'click': true,
        'focus': true
    }
};

