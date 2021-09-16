import { Connection } from "post-me";
import { SkynetClient } from "../client";
/**
 * Custom connector options.
 *
 * @property [dev] - Whether to use the dev build of mysky. It is functionally equivalent to the default production mysky, except that all permissions are granted automatically and data lives in a separate sandbox from production.
 * @property [debug] - Whether to tell mysky and DACs to print debug messages.
 * @property [alpha] - Whether to use the alpha build of mysky. This is the build where development occurs and it can be expected to break. This takes precedence over the 'dev' option if that is also set.
 * @property [handshakeMaxAttempts=150] - The amount of handshake attempts to make when starting a connection.
 * @property [handshakeAttemptsInterval=100] - The time interval to wait between handshake attempts.
 */
export declare type CustomConnectorOptions = {
    dev?: boolean;
    debug?: boolean;
    alpha?: boolean;
    handshakeMaxAttempts?: number;
    handshakeAttemptsInterval?: number;
};
export declare const DEFAULT_CONNECTOR_OPTIONS: {
    dev: boolean;
    debug: boolean;
    alpha: boolean;
    handshakeMaxAttempts: number;
    handshakeAttemptsInterval: number;
};
export declare class Connector {
    url: string;
    client: SkynetClient;
    childFrame: HTMLIFrameElement;
    connection: Connection;
    options: CustomConnectorOptions;
    constructor(url: string, client: SkynetClient, childFrame: HTMLIFrameElement, connection: Connection, options: CustomConnectorOptions);
    static init(client: SkynetClient, domain: string, customOptions?: CustomConnectorOptions): Promise<Connector>;
    call(method: string, ...args: unknown[]): Promise<unknown>;
}
//# sourceMappingURL=connector.d.ts.map