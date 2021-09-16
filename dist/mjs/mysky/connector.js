/* istanbul ignore file */
import { ParentHandshake, WindowMessenger } from "post-me";
import { createIframe, defaultHandshakeAttemptsInterval, defaultHandshakeMaxAttempts } from "skynet-mysky-utils";
import { addUrlQuery } from "../utils/url";
export const DEFAULT_CONNECTOR_OPTIONS = {
    dev: false,
    debug: false,
    alpha: false,
    handshakeMaxAttempts: defaultHandshakeMaxAttempts,
    handshakeAttemptsInterval: defaultHandshakeAttemptsInterval,
};
export class Connector {
    constructor(url, client, childFrame, connection, options) {
        this.url = url;
        this.client = client;
        this.childFrame = childFrame;
        this.connection = connection;
        this.options = options;
    }
    // Static initializer
    static async init(client, domain, customOptions) {
        const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...customOptions };
        // Get the URL for the domain on the current portal.
        let domainUrl = await client.getFullDomainUrl(domain);
        if (opts.dev) {
            domainUrl = addUrlQuery(domainUrl, { dev: "true" });
        }
        if (opts.debug) {
            domainUrl = addUrlQuery(domainUrl, { debug: "true" });
        }
        if (opts.alpha) {
            domainUrl = addUrlQuery(domainUrl, { alpha: "true" });
        }
        // Create the iframe.
        const childFrame = createIframe(domainUrl, domainUrl);
        // The frame window should always exist. Sanity check + make TS happy.
        if (!childFrame.contentWindow) {
            throw new Error("'childFrame.contentWindow' was null");
        }
        const childWindow = childFrame.contentWindow;
        // Connect to the iframe.
        const messenger = new WindowMessenger({
            localWindow: window,
            remoteWindow: childWindow,
            remoteOrigin: "*",
        });
        const connection = await ParentHandshake(messenger, {}, opts.handshakeMaxAttempts, opts.handshakeAttemptsInterval);
        // Construct the component connector.
        return new Connector(domainUrl, client, childFrame, connection, opts);
    }
    async call(method, ...args) {
        return this.connection.remoteHandle().call(method, ...args);
    }
}
