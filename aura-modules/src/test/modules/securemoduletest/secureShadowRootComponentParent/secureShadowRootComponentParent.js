import { LightningElement, api } from "lwc";
import * as testUtils from "securemoduletest/testUtil";

const lockerBlacklist = [
    'append',
    'constructor',
    'dispatchEvent',
    'elementsFromPoint',
    'getElementById',
    'getSelection',
    'styleSheets',
    'pictureInPictureElement',
    'pointerLockElement',
    'prepend'
];

export default class SecureShadowRootComponentParent extends LightningElement {
    @api
     testTemplateSyncWithLockerWrapper() {
        const child = this.template.querySelector('securemoduletest-raw-component');
        const rawProperties = child.getTemplateProperties();
        const secureChild = this.template.querySelector('securemoduletest-secure-component');
        const secureProperties = secureChild.getTemplateProperties();

        testUtils.assertProperties(rawProperties, secureProperties, lockerBlacklist);
    }

    @api
    testBlacklistedProperties() {
        const { template } = this;

        for (let i = 0, n = lockerBlacklist.length; i < n; i++) {
            const blacklistedProperty = lockerBlacklist[i];
            if (blacklistedProperty in template) {
                testUtils.fail(`Expected "${blacklistedProperty}" property of SecureTemplate to be blacklisted.`);
            } else {
                testUtils.assertUndefined(template[blacklistedProperty], `Expected "${blacklistedProperty}" property of SecureTemplate to be undefined!`);
            }
        }
    }

    @api
    testNullProperties() {
        const { template } = this;
        const nullProperties = [
            'nodeValue',
            'namespaceURI',
            'nextSibling',
            'previousSibling',
            'nextElementSibling',
            'previousElementSibling',
            'localName',
            'parentNode',
            'parentElement'
        ];

        for (let i = 0, n = nullProperties.length; i < n; i++) {
            const nullProperty = nullProperties[i];
            if (nullProperty in template) {
                testUtils.assertNull(template[nullProperty], `Expected "${nullProperty}" property of SecureTemplate to be null!`);
            } else {
                testUtils.fail(`Expected "${nullProperty}" property of SecureTemplate to exist.`);
            }
        }
    }

    @api
    testUndefinedProperties() {
        const { template } = this;
        const undefinedProperties = [
            'prefix'
        ];

        for (let i = 0, n = undefinedProperties.length; i < n; i++) {
            const undefinedProperty = undefinedProperties[i];
            if (undefinedProperty in template) {
                testUtils.assertUndefined(template[undefinedProperty], `Expected "${undefinedProperty}" property of SecureTemplate to be undefined!`);
            } else {
                testUtils.fail(`Expected "${undefinedProperty}" property of SecureTemplate to exist.`);
            }
        }
    }

    @api
    testTemplateChildNodes() {
      const childNodes = this.template.childNodes;
      testUtils.assertEquals(6, childNodes.length);

      for (let i = 0; i < childNodes.length; i++) {
        testUtils.assertEquals(true, childNodes[i] instanceof Node);
      }

      testUtils.assertTrue(childNodes[0].className === 'div-in-parent');
      testUtils.assertTrue(childNodes[1].className === 'span-in-parent');
      testUtils.assertTrue(childNodes[2].className === 'securemoduletest-raw-component');
      testUtils.assertTrue(childNodes[3].className === 'securemoduletest-secure-component');
      testUtils.assertTrue(childNodes[4].className === 'child-same-namespace');
      testUtils.assertTrue(childNodes[5].className === 'child-different-namespace');
    }

    @api
    testTemplateHost() {
        // NOTE: The host of "this.template" belongs to a component, secureModuleTest/secureShadowRootTest, which is in the same namespace as "this".
        const host = this.template.host;
        testUtils.assertEquals('SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT-PARENT', host.tagName, 'Expected tagName to be "SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT-PARENT"');
        testUtils.assertEquals('SecureElement: [object HTMLElement]{ key: {"namespace":"secureModuleTest"} }', host.toString(), 'Expected a SecureElement: [object HTMLElement].');
        testUtils.assertEquals('', host.innerText, 'Expected "innerText" to be an empty string.');

        const child = this.template.querySelector('securemoduletest-secure-shadow-root-component');
        const childHost = child.host;
        testUtils.assertEquals(undefined, childHost, 'Expected host property on a child component element to be "undefined"');

        const returnHost = child.testTemplateHost();
        testUtils.assertEquals('SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT', returnHost.tagName, 'Expected tagName to be "SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT"');
        testUtils.assertEquals('SecureElement: [object HTMLElement]{ key: {"namespace":"secureModuleTest"} }', returnHost.toString(), 'Expected a SecureElement: [object HTMLElement].');
        testUtils.assertEquals('', returnHost.innerText, 'Expected "innerText" to be an empty string.');
    }

    @api
    testTemplateHostOtherNamespace() {
        const childOther = this.template.querySelector('secureothernamespace-secure-shadow-root-component');
        const childOtherHost = childOther.host;
        testUtils.assertEquals(undefined, childOtherHost, 'Expected host property on a child component element to be "undefined"');

        const returnHost = childOther.testTemplateHost();        
        testUtils.assertEquals('SECUREOTHERNAMESPACE-SECURE-SHADOW-ROOT-COMPONENT', returnHost.tagName, 'Expected tagName to be "SECUREOTHERNAMESPACE-SECURE-SHADOW-ROOT-COMPONENT"');
        testUtils.assertEquals('SecureElement: [object HTMLElement]{ key: {"namespace":"secureModuleTest"} }', returnHost.toString(), 'Expected a SecureElement: [object HTMLElement].');
        testUtils.assertEquals('', returnHost.innerText, 'Expected "innerText" to be an empty string.');
    }


    @api
    testTemplateQuerySelector() {
        const div = this.template.querySelector('.div-in-parent');
        testUtils.assertDefined(div);
        assertNodeDetail(div, {tagName: 'DIV', className: 'div-in-parent'});

        const component = this.template.querySelector('.child-same-namespace');
        testUtils.assertDefined(component);
        assertNodeDetail(component, {tagName: 'SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT', className: 'child-same-namespace'});
    }

    @api
    testTemplateQuerySelectorAll() {
        const childNodes = this.template.querySelectorAll('*');
        testUtils.assertEquals(6, childNodes.length);

        assertNodeDetail(childNodes[0], {tagName: 'DIV', className: 'div-in-parent'});
        assertNodeDetail(childNodes[1], {tagName: 'SPAN', className: 'span-in-parent'});
        assertNodeDetail(childNodes[2], {tagName: 'SECUREMODULETEST-RAW-COMPONENT', className: 'securemoduletest-raw-component'});
        assertNodeDetail(childNodes[3], {tagName: 'SECUREMODULETEST-SECURE-COMPONENT', className: 'securemoduletest-secure-component'});
        assertNodeDetail(childNodes[4], {tagName: 'SECUREMODULETEST-SECURE-SHADOW-ROOT-COMPONENT', className: 'child-same-namespace'});
        assertNodeDetail(childNodes[5], {tagName: 'SECUREOTHERNAMESPACE-SECURE-SHADOW-ROOT-COMPONENT', className: 'child-different-namespace'});
    }

    @api
    testShadowRootWithLockerWrapper() {
        const child = this.template.querySelector('securemoduletest-shadow-root-component');
        const rawProperties = Object.getOwnPropertyNames(child.shadowRoot);
        const secureChild = this.template.querySelector('securemoduletest-secure-shadow-root-component');
        const secureProperties = Object.getOwnPropertyNames(secureChild.shadowRoot);

        testUtils.assertProperties(rawProperties, secureProperties, 'Expected no API gap between raw "shadowRoot" and wrapped "shadowRoot" object!');
    }

    @api
    testShadowRoot() {
        testUtils.assertEquals(null, this.shadowRoot, 'Expected "this.shadowRoot" property to be "null"');

        const child = this.template.querySelector('securemoduletest-secure-shadow-root-component');
        const childShadowRoot = child.shadowRoot;

        testUtils.assertTrue(childShadowRoot instanceof ShadowRoot, 'Expected "child.shadowRoot" to be an "instanceof ShadowRoot"');
        testUtils.assertEquals('SecureTemplate: [object ShadowRoot]{ key: {"namespace":"secureModuleTest"} }',  childShadowRoot.toString(), 'Expected "child.shadowRoot" to be "SecureTemplate: [object ShadowRoot]"');
        testUtils.assertEquals('open', childShadowRoot.mode, 'Expected "child.shadowRoot.mode" property to be "closed"');
        testUtils.assertEquals(child, childShadowRoot.host, 'Expected "child.shadowRoot.host" property to be child element.');
        // ERROR: "eslint-lwc" - Using 'innerHTML/outputHTML/insertAdjacentHTML' is not allowed!
        // testUtils.assertEquals('', childShadowRoot.innerHTML, 'Expected "child.shadowRoot.innerHTML" property to be an empty string.');
        
        child.testShadowRoot();
    }

    @api
    testShadowRootOtherNamespace() {
        testUtils.assertEquals(null, this.shadowRoot, 'Expected "this.shadowRoot" property to be "null"');

        const child = this.template.querySelector('secureothernamespace-secure-shadow-root-component');
        const childShadowRoot = child.shadowRoot;

        testUtils.assertTrue(childShadowRoot instanceof ShadowRoot, 'Expected "child.shadowRoot" to be an "instanceof ShadowRoot"');
        testUtils.assertEquals('SecureTemplate: [object ShadowRoot]{ key: {"namespace":"secureModuleTest"} }',  childShadowRoot.toString(), 'Expected "child.shadowRoot" to be "SecureTemplate: [object ShadowRoot]"');
        testUtils.assertEquals('closed', childShadowRoot.mode, 'Expected "child.shadowRoot.mode" property to be "closed"');
        testUtils.assertEquals(child, childShadowRoot.host, 'Expected "child.shadowRoot.host" property to be child element.');
        // ERROR: "eslint-lwc" - Using 'innerHTML/outputHTML/insertAdjacentHTML' is not allowed!
        // testUtils.assertEquals('', childShadowRoot.innerHTML, 'Expected "child.shadowRoot.innerHTML" property to be an empty string.');
        
        child.testShadowRoot();
    }

    @api
    testInternalFieldsAreNotAccessibleOnTemplate() {
        const internalFields = Object.getOwnPropertySymbols(this.template);
        testUtils.assertEquals(0, internalFields.length, 'Did not expect internal symbols to be exposed on shadowRoot(aka template)');
    }
}

const secureElementRegex = /^SecureElement: \[object .*\]{ key: {"namespace":"secureModuleTest"} }/;
function assertNodeDetail(actualNode, expectedDetail) {
    for ( let [prop, expectedPropValue] of Object.entries(expectedDetail)) {
        testUtils.assertEquals(expectedPropValue, actualNode[prop]);
    }
    testUtils.assertTrue(secureElementRegex.test(actualNode.toString()));
}
