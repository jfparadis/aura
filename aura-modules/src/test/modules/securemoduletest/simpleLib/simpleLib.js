import * as testUtil from "securemoduletest/testUtil";

export function testWindowIsSecure() {
    testUtil.assertStartsWith("SecureWindow", window.toString(), "Expected window to"
        + " return SecureWindow in library");
    windowIsSecureInLocalFunc();
    return true;
}

export function testDollarAuraNotAccessibleInModules() {
    testUtil.assertEquals("undefined", typeof $A, "Expected $A to be not accessible in library"); // eslint-disable-line lwc/no-aura
    dollarAuraNotAccessibleInLocalFunc();
    return true;
}

export function addition(a, b) {
    return a + b;
}

function windowIsSecureInLocalFunc() {
    testUtil.assertStartsWith("SecureWindow", window.toString(), "Expected window to"
        + " return SecureWindow in local functions of library module");
}

function dollarAuraNotAccessibleInLocalFunc() {
    testUtil.assertEquals("undefined", typeof $A, "Expected $A to be not accessible in local functions of library module"); // eslint-disable-line lwc/no-aura
}