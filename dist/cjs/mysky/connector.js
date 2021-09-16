"use strict";
/* istanbul ignore file */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = exports.DEFAULT_CONNECTOR_OPTIONS = void 0;
const post_me_1 = require("post-me");
const skynet_mysky_utils_1 = require("skynet-mysky-utils");
const url_1 = require("../utils/url");
exports.DEFAULT_CONNECTOR_OPTIONS = {
    dev: false,
    debug: false,
    alpha: false,
    handshakeMaxAttempts: skynet_mysky_utils_1.defaultHandshakeMaxAttempts,
    handshakeAttemptsInterval: skynet_mysky_utils_1.defaultHandshakeAttemptsInterval,
};
class Connector {
    constructor(url, client, childFrame, connection, options) {
        this.url = url;
        this.client = client;
        this.childFrame = childFrame;
        this.connection = connection;
        this.options = options;
    }
    // Static initializer
    static async init(client, domain, customOptions) {
        const opts = { ...exports.DEFAULT_CONNECTOR_OPTIONS, ...customOptions };
        // Get the URL for the domain on the current portal.
        let domainUrl = await client.getFullDomainUrl(domain);
        if (opts.dev) {
            domainUrl = (0, url_1.addUrlQuery)(domainUrl, { dev: "true" });
        }
        if (opts.debug) {
            domainUrl = (0, url_1.addUrlQuery)(domainUrl, { debug: "true" });
        }
        if (opts.alpha) {
            domainUrl = (0, url_1.addUrlQuery)(domainUrl, { alpha: "true" });
        }
        // Create the iframe.
        const childFrame = (0, skynet_mysky_utils_1.createIframe)(domainUrl, domainUrl);
        // The frame window should always exist. Sanity check + make TS happy.
        if (!childFrame.contentWindow) {
            throw new Error("'childFrame.contentWindow' was null");
        }
        const childWindow = childFrame.contentWindow;
        // Connect to the iframe.
        const messenger = new post_me_1.WindowMessenger({
            localWindow: window,
            remoteWindow: childWindow,
            remoteOrigin: "*",
        });
        const connection = await (0, post_me_1.ParentHandshake)(messenger, {}, opts.handshakeMaxAttempts, opts.handshakeAttemptsInterval);
        // Construct the component connector.
        return new Connector(domainUrl, client, childFrame, connection, opts);
    }
    async call(method, ...args) {
        return this.connection.remoteHandle().call(method, ...args);
    }
}
exports.Connector = Connector;
