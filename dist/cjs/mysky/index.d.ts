export type { CustomConnectorOptions } from "./connector";
export { DacLibrary } from "./dac";
import { Connection } from "post-me";
import { Permission } from "skynet-mysky-utils";
import { Connector, CustomConnectorOptions } from "./connector";
import { SkynetClient } from "../client";
import { DacLibrary } from "./dac";
import { CustomGetEntryOptions, RegistryEntry } from "../registry";
import { CustomGetJSONOptions, CustomSetJSONOptions, JSONResponse } from "../skydb";
import { Signature } from "../crypto";
import { JsonData } from "../utils/types";
import { EncryptedJSONResponse } from "./encrypted_files";
/**
 * The domain for MySky.
 */
export declare const MYSKY_DOMAIN = "skynet-mysky.hns";
/**
 * @deprecated please use MYSKY_DOMAIN.
 */
export declare const mySkyDomain = "skynet-mysky.hns";
/**
 * The domain for MySky dev.
 */
export declare const MYSKY_DEV_DOMAIN = "skynet-mysky-dev.hns";
/**
 * @deprecated please use MYSKY_DEV_DOMAIN.
 */
export declare const mySkyDevDomain = "skynet-mysky-dev.hns";
/**
 * The domain for MySky alpha. Intentionally not exported in index file.
 */
export declare const MYSKY_ALPHA_DOMAIN = "sandbridge.hns";
/**
 * The maximum length for entry data when setting entry data.
 */
export declare const MAX_ENTRY_LENGTH = 70;
export declare type EntryData = {
    data: Uint8Array | null;
};
/**
 * Loads MySky. Note that this does not log in the user.
 *
 * @param this - The Skynet client.
 * @param skappDomain - The domain of the host skapp. For this domain permissions will be requested and, by default, automatically granted.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - Loaded (but not logged-in) MySky instance.
 */
export declare function loadMySky(this: SkynetClient, skappDomain?: string, customOptions?: CustomConnectorOptions): Promise<MySky>;
export declare class MySky {
    protected connector: Connector;
    protected hostDomain: string;
    static instance: MySky | null;
    dacs: DacLibrary[];
    grantedPermissions: Permission[];
    pendingPermissions: Permission[];
    constructor(connector: Connector, permissions: Permission[], hostDomain: string);
    static New(client: SkynetClient, skappDomain?: string, customOptions?: CustomConnectorOptions): Promise<MySky>;
    /**
     * Loads the given DACs.
     *
     * @param dacs - The DAC library instances to call `init` on.
     */
    loadDacs(...dacs: DacLibrary[]): Promise<void>;
    addPermissions(...permissions: Permission[]): Promise<void>;
    checkLogin(): Promise<boolean>;
    /**
     * Destroys the mysky connection by:
     *
     * 1. Destroying the connected DACs.
     *
     * 2. Closing the connection.
     *
     * 3. Closing the child iframe.
     *
     * @throws - Will throw if there is an unexpected DOM error.
     */
    destroy(): Promise<void>;
    logout(): Promise<void>;
    requestLoginAccess(): Promise<boolean>;
    userID(): Promise<string>;
    /**
     * Gets Discoverable JSON at the given path through MySky, if the user has
     * given Discoverable Read permissions to do so.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the json data as well as the skylink for the data.
     * @throws - Will throw if the user does not have Discoverable Read permission on the path.
     */
    getJSON(path: string, customOptions?: CustomGetJSONOptions): Promise<JSONResponse>;
    /**
     * Gets the entry link for the entry at the given path. This is a v2 skylink.
     * This link stays the same even if the content at the entry changes.
     *
     * @param path - The data path.
     * @returns - The entry link.
     */
    getEntryLink(path: string): Promise<string>;
    /**
     * Sets Discoverable JSON at the given path through MySky, if the user has
     * given Discoverable Write permissions to do so.
     *
     * @param path - The data path.
     * @param json - The json to set.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the json data as well as the skylink for the data.
     * @throws - Will throw if the user does not have Discoverable Write permission on the path.
     */
    setJSON(path: string, json: JsonData, customOptions?: CustomSetJSONOptions): Promise<JSONResponse>;
    /**
     * Sets entry at the given path to point to the data link. Like setJSON, but it doesn't upload a file.
     *
     * @param path - The data path.
     * @param dataLink - The data link to set at the path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An empty promise.
     * @throws - Will throw if the user does not have Discoverable Write permission on the path.
     */
    setDataLink(path: string, dataLink: string, customOptions?: CustomSetJSONOptions): Promise<void>;
    /**
     * Deletes Discoverable JSON at the given path through MySky, if the user has
     * given Discoverable Write permissions to do so.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An empty promise.
     * @throws - Will throw if the revision is already the maximum value.
     * @throws - Will throw if the user does not have Discoverable Write permission on the path.
     */
    deleteJSON(path: string, customOptions?: CustomSetJSONOptions): Promise<void>;
    /**
     * Gets the raw registry entry data for the given path, if the user has given
     * Discoverable Read permissions.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - The entry data.
     * @throws - Will throw if the user does not have Discoverable Read permission on the path.
     */
    getEntryData(path: string, customOptions?: CustomGetEntryOptions): Promise<EntryData>;
    /**
     * Sets the entry data at the given path, if the user has given Discoverable
     * Write permissions.
     *
     * @param path - The data path.
     * @param data - The raw entry data to set.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - The entry data.
     * @throws - Will throw if the length of the data is > 70 bytes.
     * @throws - Will throw if the user does not have Discoverable Write permission on the path.
     */
    setEntryData(path: string, data: Uint8Array, customOptions?: CustomSetJSONOptions): Promise<EntryData>;
    /**
     * Lets you get the share-able path seed, which can be passed to
     * file.getJSONEncrypted. Requires Hidden Read permission on the path.
     *
     * @param path - The given path.
     * @param isDirectory - Whether the path is a directory.
     * @returns - The seed for the path.
     * @throws - Will throw if the user does not have Hidden Read permission on the path.
     */
    getEncryptedFileSeed(path: string, isDirectory: boolean): Promise<string>;
    /**
     * Gets Encrypted JSON at the given path through MySky, if the user has given
     * Hidden Read permissions to do so.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the decrypted json data.
     * @throws - Will throw if the user does not have Hidden Read permission on the path.
     */
    getJSONEncrypted(path: string, customOptions?: CustomGetJSONOptions): Promise<EncryptedJSONResponse>;
    /**
     * Sets Encrypted JSON at the given path through MySky, if the user has given
     * Hidden Write permissions to do so.
     *
     * @param path - The data path.
     * @param json - The json to encrypt and set.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the original json data.
     * @throws - Will throw if the user does not have Hidden Write permission on the path.
     */
    setJSONEncrypted(path: string, json: JsonData, customOptions?: CustomSetJSONOptions): Promise<EncryptedJSONResponse>;
    protected catchError(errorMsg: string): Promise<void>;
    protected launchUI(): Window;
    protected connectUi(childWindow: Window): Promise<Connection>;
    protected loadDac(dac: DacLibrary): Promise<void>;
    protected handleLogin(loggedIn: boolean): Promise<void>;
    protected signRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature>;
    protected signEncryptedRegistryEntry(entry: RegistryEntry, path: string): Promise<Signature>;
}
//# sourceMappingURL=index.d.ts.map