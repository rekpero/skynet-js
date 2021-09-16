/* istanbul ignore file */
import { Connector } from "./connector";
export class DacLibrary {
    constructor(dacDomain) {
        this.dacDomain = dacDomain;
    }
    async init(client, customOptions) {
        this.connector = await Connector.init(client, this.dacDomain, customOptions);
        await this.connector.connection.remoteHandle().call("init");
    }
    async onUserLogin() {
        if (!this.connector) {
            throw new Error("init was not called");
        }
        await this.connector.connection.remoteHandle().call("onUserLogin");
    }
}
