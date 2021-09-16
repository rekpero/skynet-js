"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.popupCenter = exports.extractDomain = exports.getFullDomainUrl = void 0;
const skynet_mysky_utils_1 = require("skynet-mysky-utils");
const url_1 = require("../utils/url");
/**
 * Constructs the full URL for the given component domain,
 * e.g. "dac.hns" => "https://dac.hns.siasky.net"
 *
 * @param this - SkynetClient
 * @param domain - Component domain.
 * @returns - The full URL for the component.
 */
async function getFullDomainUrl(domain) {
    const portalUrl = await this.portalUrl();
    return (0, url_1.getFullDomainUrlForPortal)(portalUrl, domain);
}
exports.getFullDomainUrl = getFullDomainUrl;
/**
 * Extracts the domain from the current portal URL,
 * e.g. ("dac.hns.siasky.net") => "dac.hns"
 *
 * @param this - SkynetClient
 * @param fullDomain - Full URL.
 * @returns - The extracted domain.
 */
async function extractDomain(fullDomain) {
    const portalUrl = await this.portalUrl();
    return (0, url_1.extractDomainForPortal)(portalUrl, fullDomain);
}
exports.extractDomain = extractDomain;
/* istanbul ignore next */
/**
 * Create a new popup window. From SkyID.
 *
 * @param url - The URL to open.
 * @param title - The title of the popup window.
 * @param w - The width of the popup window.
 * @param h - the height of the popup window.
 * @returns - The window.
 * @throws - Will throw if the window could not be opened.
 */
function popupCenter(url, title, w, h) {
    url = (0, skynet_mysky_utils_1.ensureUrl)(url);
    // Fixes dual-screen position                             Most browsers      Firefox
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const width = window.innerWidth
        ? window.innerWidth
        : document.documentElement.clientWidth
            ? document.documentElement.clientWidth
            : screen.width;
    const height = window.innerHeight
        ? window.innerHeight
        : document.documentElement.clientHeight
            ? document.documentElement.clientHeight
            : screen.height;
    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    const newWindow = window.open(url, title, `
scrollbars=yes,
width=${w / systemZoom},
height=${h / systemZoom},
top=${top},
left=${left}
`);
    if (!newWindow) {
        throw new Error("could not open window");
    }
    if (newWindow.focus) {
        newWindow.focus();
    }
    return newWindow;
}
exports.popupCenter = popupCenter;
