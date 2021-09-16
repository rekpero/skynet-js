/* istanbul ignore file */
export { DacLibrary } from "./dac";
import { ParentHandshake, WindowMessenger } from "post-me";
import { dispatchedErrorEvent, errorWindowClosed, monitorWindowError, PermCategory, Permission, PermType, } from "skynet-mysky-utils";
import { Connector, DEFAULT_CONNECTOR_OPTIONS } from "./connector";
import { DEFAULT_GET_ENTRY_OPTIONS, DEFAULT_SET_ENTRY_OPTIONS, } from "../registry";
import { DEFAULT_GET_JSON_OPTIONS, DEFAULT_SET_JSON_OPTIONS, getOrCreateRegistryEntry, getNextRegistryEntry, getOrCreateRawBytesRegistryEntry, } from "../skydb";
import { deriveDiscoverableFileTweak } from "./tweak";
import { popupCenter } from "./utils";
import { extractOptions } from "../utils/options";
import { throwValidationError, validateBoolean, validateObject, validateOptionalObject, validateString, validateUint8Array, } from "../utils/validation";
import { decodeSkylink, RAW_SKYLINK_SIZE } from "../skylink/sia";
import { decryptJSONFile, deriveEncryptedFileKeyEntropy, deriveEncryptedFileTweak, ENCRYPTED_JSON_RESPONSE_VERSION, encryptJSONFile, } from "./encrypted_files";
/**
 * The domain for MySky.
 */
export const MYSKY_DOMAIN = "skynet-mysky.hns";
/**
 * @deprecated please use MYSKY_DOMAIN.
 */
export const mySkyDomain = MYSKY_DOMAIN;
/**
 * The domain for MySky dev.
 */
export const MYSKY_DEV_DOMAIN = "skynet-mysky-dev.hns";
/**
 * @deprecated please use MYSKY_DEV_DOMAIN.
 */
export const mySkyDevDomain = MYSKY_DEV_DOMAIN;
/**
 * The domain for MySky alpha. Intentionally not exported in index file.
 */
export const MYSKY_ALPHA_DOMAIN = "sandbridge.hns";
/**
 * The maximum length for entry data when setting entry data.
 */
export const MAX_ENTRY_LENGTH = 70;
const mySkyUiRelativeUrl = "ui.html";
const mySkyUiTitle = "MySky UI";
const [mySkyUiW, mySkyUiH] = [600, 600];
/**
 * Loads MySky. Note that this does not log in the user.
 *
 * @param this - The Skynet client.
 * @param skappDomain - The domain of the host skapp. For this domain permissions will be requested and, by default, automatically granted.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - Loaded (but not logged-in) MySky instance.
 */
export async function loadMySky(skappDomain, customOptions) {
    const mySky = await MySky.New(this, skappDomain, customOptions);
    return mySky;
}
export class MySky {
    // ============
    // Constructors
    // ============
    constructor(connector, permissions, hostDomain) {
        this.connector = connector;
        this.hostDomain = hostDomain;
        // Holds the loaded DACs.
        this.dacs = [];
        // Holds the currently granted permissions.
        this.grantedPermissions = [];
        this.pendingPermissions = permissions;
    }
    static async New(client, skappDomain, customOptions) {
        const opts = { ...DEFAULT_CONNECTOR_OPTIONS, ...customOptions };
        // Enforce singleton.
        if (MySky.instance) {
            return MySky.instance;
        }
        let domain = MYSKY_DOMAIN;
        if (opts.alpha) {
            domain = MYSKY_ALPHA_DOMAIN;
        }
        else if (opts.dev) {
            domain = MYSKY_DEV_DOMAIN;
        }
        const connector = await Connector.init(client, domain, customOptions);
        const hostDomain = await client.extractDomain(window.location.hostname);
        const permissions = [];
        if (skappDomain) {
            const perm1 = new Permission(hostDomain, skappDomain, PermCategory.Discoverable, PermType.Write);
            const perm2 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Read);
            const perm3 = new Permission(hostDomain, skappDomain, PermCategory.Hidden, PermType.Write);
            permissions.push(perm1, perm2, perm3);
        }
        MySky.instance = new MySky(connector, permissions, hostDomain);
        return MySky.instance;
    }
    // ==========
    // Public API
    // ==========
    /**
     * Loads the given DACs.
     *
     * @param dacs - The DAC library instances to call `init` on.
     */
    async loadDacs(...dacs) {
        const promises = [];
        for (const dac of dacs) {
            promises.push(this.loadDac(dac));
        }
        this.dacs.push(...dacs);
        await Promise.all(promises);
    }
    async addPermissions(...permissions) {
        this.pendingPermissions.push(...permissions);
    }
    async checkLogin() {
        const [seedFound, permissionsResponse] = await this.connector.connection
            .remoteHandle()
            .call("checkLogin", this.pendingPermissions);
        // Save granted and failed permissions.
        const { grantedPermissions, failedPermissions } = permissionsResponse;
        this.grantedPermissions = grantedPermissions;
        this.pendingPermissions = failedPermissions;
        const loggedIn = seedFound && failedPermissions.length === 0;
        await this.handleLogin(loggedIn);
        return loggedIn;
    }
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
    async destroy() {
        // TODO: For all connected dacs, send a destroy call.
        // TODO: Delete all connected dacs.
        // Close the connection.
        this.connector.connection.close();
        // Close the child iframe.
        const frame = this.connector.childFrame;
        if (frame) {
            // The parent node should always exist. Sanity check + make TS happy.
            if (!frame.parentNode) {
                throw new Error("'childFrame.parentNode' was not set");
            }
            frame.parentNode.removeChild(frame);
        }
    }
    async logout() {
        return await this.connector.connection.remoteHandle().call("logout");
    }
    async requestLoginAccess() {
        let uiWindow;
        let uiConnection;
        let seedFound = false;
        // Add error listener.
        const { promise: promiseError, controller: controllerError } = monitorWindowError();
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise(async (resolve, reject) => {
            // Make this promise run in the background and reject on window close or any errors.
            promiseError.catch((err) => {
                if (err === errorWindowClosed) {
                    // Resolve without updating the pending permissions.
                    resolve();
                    return;
                }
                reject(err);
            });
            try {
                // Launch the UI.
                uiWindow = this.launchUI();
                uiConnection = await this.connectUi(uiWindow);
                // Send the UI the list of required permissions.
                // TODO: This should be a dual-promise that also calls ping() on an interval and rejects if no response was found in a given amount of time.
                const [seedFoundResponse, permissionsResponse] = await uiConnection
                    .remoteHandle()
                    .call("requestLoginAccess", this.pendingPermissions);
                seedFound = seedFoundResponse;
                // Save failed permissions.
                const { grantedPermissions, failedPermissions } = permissionsResponse;
                this.grantedPermissions = grantedPermissions;
                this.pendingPermissions = failedPermissions;
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
        await promise
            .catch((err) => {
            throw err;
        })
            .finally(() => {
            // Close the window.
            if (uiWindow) {
                uiWindow.close();
            }
            // Close the connection.
            if (uiConnection) {
                uiConnection.close();
            }
            // Clean up the event listeners and promises.
            controllerError.cleanup();
        });
        const loggedIn = seedFound && this.pendingPermissions.length === 0;
        await this.handleLogin(loggedIn);
        return loggedIn;
    }
    async userID() {
        return await this.connector.connection.remoteHandle().call("userID");
    }
    /**
     * Gets Discoverable JSON at the given path through MySky, if the user has
     * given Discoverable Read permissions to do so.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the json data as well as the skylink for the data.
     * @throws - Will throw if the user does not have Discoverable Read permission on the path.
     */
    async getJSON(path, customOptions) {
        validateString("path", path, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_GET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        return await this.connector.client.db.getJSON(publicKey, dataKey, opts);
    }
    /**
     * Gets the entry link for the entry at the given path. This is a v2 skylink.
     * This link stays the same even if the content at the entry changes.
     *
     * @param path - The data path.
     * @returns - The entry link.
     */
    async getEntryLink(path) {
        validateString("path", path, "parameter");
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        // Do not hash the tweak anymore.
        const opts = { ...DEFAULT_GET_ENTRY_OPTIONS, hashedDataKeyHex: true };
        return await this.connector.client.registry.getEntryLink(publicKey, dataKey, opts);
    }
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
    async setJSON(path, json, customOptions) {
        validateString("path", path, "parameter");
        validateObject("json", json, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_SET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const [entry, dataLink] = await getOrCreateRegistryEntry(this.connector.client, publicKey, dataKey, json, opts);
        const signature = await this.signRegistryEntry(entry, path);
        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);
        return { data: json, dataLink };
    }
    /**
     * Sets entry at the given path to point to the data link. Like setJSON, but it doesn't upload a file.
     *
     * @param path - The data path.
     * @param dataLink - The data link to set at the path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An empty promise.
     * @throws - Will throw if the user does not have Discoverable Write permission on the path.
     */
    async setDataLink(path, dataLink, customOptions) {
        validateString("path", path, "parameter");
        validateString("dataLink", dataLink, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_SET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
        const entry = await getNextRegistryEntry(this.connector.client, publicKey, dataKey, decodeSkylink(dataLink), getEntryOpts);
        const signature = await this.signRegistryEntry(entry, path);
        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);
    }
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
    async deleteJSON(path, customOptions) {
        validateString("path", path, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_SET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
        const entry = await getNextRegistryEntry(this.connector.client, publicKey, dataKey, new Uint8Array(RAW_SKYLINK_SIZE), getEntryOpts);
        const signature = await this.signRegistryEntry(entry, path);
        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);
    }
    /**
     * Gets the raw registry entry data for the given path, if the user has given
     * Discoverable Read permissions.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - The entry data.
     * @throws - Will throw if the user does not have Discoverable Read permission on the path.
     */
    async getEntryData(path, customOptions) {
        validateString("path", path, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_ENTRY_OPTIONS);
        const opts = {
            ...DEFAULT_GET_ENTRY_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const { entry } = await this.connector.client.registry.getEntry(publicKey, dataKey, opts);
        if (!entry) {
            return { data: null };
        }
        return { data: entry.data };
    }
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
    async setEntryData(path, data, customOptions) {
        validateString("path", path, "parameter");
        validateUint8Array("data", data, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_ENTRY_OPTIONS);
        if (data.length > MAX_ENTRY_LENGTH) {
            throwValidationError("data", data, "parameter", `'Uint8Array' of length <= ${MAX_ENTRY_LENGTH}, was length ${data.length}`);
        }
        const opts = {
            ...DEFAULT_SET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        const publicKey = await this.userID();
        const dataKey = deriveDiscoverableFileTweak(path);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const getEntryOpts = extractOptions(opts, DEFAULT_GET_ENTRY_OPTIONS);
        const entry = await getNextRegistryEntry(this.connector.client, publicKey, dataKey, data, getEntryOpts);
        const signature = await this.signRegistryEntry(entry, path);
        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);
        return { data: entry.data };
    }
    // ===============
    // Encrypted Files
    // ===============
    /**
     * Lets you get the share-able path seed, which can be passed to
     * file.getJSONEncrypted. Requires Hidden Read permission on the path.
     *
     * @param path - The given path.
     * @param isDirectory - Whether the path is a directory.
     * @returns - The seed for the path.
     * @throws - Will throw if the user does not have Hidden Read permission on the path.
     */
    async getEncryptedFileSeed(path, isDirectory) {
        validateString("path", path, "parameter");
        validateBoolean("isDirectory", isDirectory, "parameter");
        return await this.connector.connection.remoteHandle().call("getEncryptedFileSeed", path, isDirectory);
    }
    /**
     * Gets Encrypted JSON at the given path through MySky, if the user has given
     * Hidden Read permissions to do so.
     *
     * @param path - The data path.
     * @param [customOptions] - Additional settings that can optionally be set.
     * @returns - An object containing the decrypted json data.
     * @throws - Will throw if the user does not have Hidden Read permission on the path.
     */
    async getJSONEncrypted(path, customOptions) {
        validateString("path", path, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_GET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_GET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
            hashedDataKeyHex: true, // Do not hash the tweak anymore.
        };
        // Call MySky which checks for read permissions on the path.
        const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedFileSeed(path, false)]);
        // Fetch the raw encrypted JSON data.
        const dataKey = deriveEncryptedFileTweak(pathSeed);
        const { data } = await this.connector.client.db.getRawBytes(publicKey, dataKey, opts);
        if (data === null) {
            return { data: null };
        }
        const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);
        const json = decryptJSONFile(data, encryptionKey);
        return { data: json };
    }
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
    async setJSONEncrypted(path, json, customOptions) {
        validateString("path", path, "parameter");
        validateObject("json", json, "parameter");
        validateOptionalObject("customOptions", customOptions, "parameter", DEFAULT_SET_JSON_OPTIONS);
        const opts = {
            ...DEFAULT_SET_JSON_OPTIONS,
            ...this.connector.client.customOptions,
            ...customOptions,
        };
        // Call MySky which checks for read permissions on the path.
        const [publicKey, pathSeed] = await Promise.all([this.userID(), this.getEncryptedFileSeed(path, false)]);
        const dataKey = deriveEncryptedFileTweak(pathSeed);
        opts.hashedDataKeyHex = true; // Do not hash the tweak anymore.
        const encryptionKey = deriveEncryptedFileKeyEntropy(pathSeed);
        // Pad and encrypt json file.
        const data = encryptJSONFile(json, { version: ENCRYPTED_JSON_RESPONSE_VERSION }, encryptionKey);
        const entry = await getOrCreateRawBytesRegistryEntry(this.connector.client, publicKey, dataKey, data, opts);
        // Call MySky which checks for write permissions on the path.
        const signature = await this.signEncryptedRegistryEntry(entry, path);
        const setEntryOpts = extractOptions(opts, DEFAULT_SET_ENTRY_OPTIONS);
        await this.connector.client.registry.postSignedEntry(publicKey, entry, signature, setEntryOpts);
        return { data: json };
    }
    // ================
    // Internal Methods
    // ================
    async catchError(errorMsg) {
        const event = new CustomEvent(dispatchedErrorEvent, { detail: errorMsg });
        window.dispatchEvent(event);
    }
    launchUI() {
        const mySkyUrl = new URL(this.connector.url);
        mySkyUrl.pathname = mySkyUiRelativeUrl;
        const uiUrl = mySkyUrl.toString();
        // Open the window.
        const childWindow = popupCenter(uiUrl, mySkyUiTitle, mySkyUiW, mySkyUiH);
        if (!childWindow) {
            throw new Error(`Could not open window at '${uiUrl}'`);
        }
        return childWindow;
    }
    async connectUi(childWindow) {
        const options = this.connector.options;
        // Complete handshake with UI window.
        const messenger = new WindowMessenger({
            localWindow: window,
            remoteWindow: childWindow,
            remoteOrigin: "*",
        });
        const methods = {
            catchError: this.catchError,
        };
        const connection = await ParentHandshake(messenger, methods, options.handshakeMaxAttempts, options.handshakeAttemptsInterval);
        return connection;
    }
    async loadDac(dac) {
        // Initialize DAC.
        await dac.init(this.connector.client, this.connector.options);
        // Add DAC permissions.
        const perms = dac.getPermissions();
        await this.addPermissions(...perms);
    }
    async handleLogin(loggedIn) {
        if (loggedIn) {
            await Promise.all(this.dacs.map(async (dac) => {
                try {
                    await dac.onUserLogin();
                }
                catch (error) {
                    // Don't throw on error, just print a console warning.
                    console.warn(error);
                }
            }));
        }
    }
    async signRegistryEntry(entry, path) {
        return await this.connector.connection.remoteHandle().call("signRegistryEntry", entry, path);
    }
    async signEncryptedRegistryEntry(entry, path) {
        return await this.connector.connection.remoteHandle().call("signEncryptedRegistryEntry", entry, path);
    }
}
MySky.instance = null;
