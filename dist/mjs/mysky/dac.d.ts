import { Permission } from "skynet-mysky-utils";
import { SkynetClient } from "../client";
import { Connector, CustomConnectorOptions } from "./connector";
export declare abstract class DacLibrary {
    protected dacDomain: string;
    protected connector?: Connector;
    constructor(dacDomain: string);
    init(client: SkynetClient, customOptions: CustomConnectorOptions): Promise<void>;
    abstract getPermissions(): Permission[];
    onUserLogin(): Promise<void>;
}
//# sourceMappingURL=dac.d.ts.map