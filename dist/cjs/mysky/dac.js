"use strict";
/* istanbul ignore file */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DacLibrary = void 0;
const connector_1 = require("./connector");
class DacLibrary {
    constructor(dacDomain) {
        this.dacDomain = dacDomain;
    }
    async init(client, customOptions) {
        this.connector = await connector_1.Connector.init(client, this.dacDomain, customOptions);
        await this.connector.connection.remoteHandle().call("init");
    }
    async onUserLogin() {
        if (!this.connector) {
            throw new Error("init was not called");
        }
        await this.connector.connection.remoteHandle().call("onUserLogin");
    }
}
exports.DacLibrary = DacLibrary;
