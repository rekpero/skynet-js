"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCachedDataLink = exports.getNextRevisionFromEntry = exports.getOrCreateRegistryEntry = exports.getNextRegistryEntry = exports.getOrCreateRawBytesRegistryEntry = exports.getRawBytes = exports.setDataLink = exports.deleteJSON = exports.setJSON = exports.getJSON = exports.DEFAULT_SET_JSON_OPTIONS = exports.DEFAULT_GET_JSON_OPTIONS = void 0;
const tweetnacl_1 = require("tweetnacl");
const download_1 = require("./download");
const registry_1 = require("./registry");
const sia_1 = require("./skylink/sia");
const number_1 = require("./utils/number");
const url_1 = require("./utils/url");
const string_1 = require("./utils/string");
const format_1 = require("./skylink/format");
const upload_1 = require("./upload");
const array_1 = require("./utils/array");
const encoding_1 = require("./utils/encoding");
const options_1 = require("./utils/options");
const validation_1 = require("./utils/validation");
const JSON_RESPONSE_VERSION = 2;
/**
 * The default options for get JSON. Includes the default get entry and download
 * options.
 */
exports.DEFAULT_GET_JSON_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    ...registry_1.DEFAULT_GET_ENTRY_OPTIONS,
    ...download_1.DEFAULT_DOWNLOAD_OPTIONS,
    cachedDataLink: undefined,
};
/**
 * The default options for set JSON. Includes the default upload, get JSON, and
 * set entry options.
 */
exports.DEFAULT_SET_JSON_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    ...upload_1.DEFAULT_UPLOAD_OPTIONS,
    ...exports.DEFAULT_GET_JSON_OPTIONS,
    ...registry_1.DEFAULT_SET_ENTRY_OPTIONS,
};
// ====
// JSON
// ====
/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
async function getJSON(publicKey, dataKey, customOptions) {
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_GET_JSON_OPTIONS);
    // Rest of validation is done in `getEntry`.
    const opts = {
        ...exports.DEFAULT_GET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    // Lookup the registry entry.
    const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
    if (entry === null) {
        return { data: null, dataLink: null };
    }
    // Determine the data link.
    // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
    const { rawDataLink, dataLink } = parseDataLink(entry.data, true);
    // If a cached data link is provided and the data link hasn't changed, return.
    if (checkCachedDataLink(rawDataLink, opts.cachedDataLink)) {
        return { data: null, dataLink };
    }
    // Download the data in the returned data link.
    const downloadOpts = (0, options_1.extractOptions)(opts, download_1.DEFAULT_DOWNLOAD_OPTIONS);
    const { data } = await this.getFileContent(dataLink, downloadOpts);
    if (typeof data !== "object" || data === null) {
        throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
    }
    if (!(data["_data"] && data["_v"])) {
        // Legacy data prior to skynet-js v4, return as-is.
        return { data, dataLink };
    }
    const actualData = data["_data"];
    if (typeof actualData !== "object" || data === null) {
        throw new Error(`File data '_data' for the entry at data key '${dataKey}' is not JSON.`);
    }
    return { data: actualData, dataLink };
}
exports.getJSON = getJSON;
/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 */
async function setJSON(privateKey, dataKey, json, customOptions) {
    (0, validation_1.validateHexString)("privateKey", privateKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateObject)("json", json, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_SET_JSON_OPTIONS);
    const opts = {
        ...exports.DEFAULT_SET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    const { publicKey: publicKeyArray } = tweetnacl_1.sign.keyPair.fromSecretKey((0, string_1.hexToUint8Array)(privateKey));
    const [entry, dataLink] = await getOrCreateRegistryEntry(this, (0, string_1.toHexString)(publicKeyArray), dataKey, json, opts);
    // Update the registry.
    const setEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);
    return { data: json, dataLink: (0, format_1.formatSkylink)(dataLink) };
}
exports.setJSON = setJSON;
/**
 * Deletes a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 */
async function deleteJSON(privateKey, dataKey, customOptions) {
    (0, validation_1.validateHexString)("privateKey", privateKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_SET_JSON_OPTIONS);
    const opts = {
        ...exports.DEFAULT_SET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    const { publicKey: publicKeyArray } = tweetnacl_1.sign.keyPair.fromSecretKey((0, string_1.hexToUint8Array)(privateKey));
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getNextRegistryEntry(this, (0, string_1.toHexString)(publicKeyArray), dataKey, new Uint8Array(sia_1.RAW_SKYLINK_SIZE), getEntryOpts);
    // Update the registry.
    const setEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);
}
exports.deleteJSON = deleteJSON;
/**
 * Sets the datalink for the entry at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param dataLink - The data link to set at the entry.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 */
async function setDataLink(privateKey, dataKey, dataLink, customOptions) {
    (0, validation_1.validateHexString)("privateKey", privateKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateString)("dataLink", dataLink, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_SET_JSON_OPTIONS);
    const opts = {
        ...exports.DEFAULT_SET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    const { publicKey: publicKeyArray } = tweetnacl_1.sign.keyPair.fromSecretKey((0, string_1.hexToUint8Array)(privateKey));
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getNextRegistryEntry(this, (0, string_1.toHexString)(publicKeyArray), dataKey, (0, sia_1.decodeSkylink)(dataLink), getEntryOpts);
    // Update the registry.
    const setEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);
}
exports.setDataLink = setDataLink;
// =========
// Raw Bytes
// =========
/**
 * Gets the raw bytes corresponding to the publicKey and dataKey. The caller is responsible for setting any metadata in the bytes.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned bytes.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 */
async function getRawBytes(publicKey, dataKey, 
// TODO: Take a new options type?
customOptions) {
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_GET_JSON_OPTIONS);
    // Rest of validation is done in `getEntry`.
    const opts = {
        ...exports.DEFAULT_GET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    // Lookup the registry entry.
    const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
    if (entry === null) {
        return { data: null, dataLink: null };
    }
    // Determine the data link.
    // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
    const { rawDataLink, dataLink } = parseDataLink(entry.data, false);
    // If a cached data link is provided and the data link hasn't changed, return.
    if (checkCachedDataLink(rawDataLink, opts.cachedDataLink)) {
        return { data: null, dataLink };
    }
    // Download the data in the returned data link.
    const downloadOpts = {
        ...(0, options_1.extractOptions)(opts, download_1.DEFAULT_DOWNLOAD_OPTIONS),
        responseType: "arraybuffer",
    };
    const { data: buffer } = await this.getFileContent(dataLink, downloadOpts);
    return { data: new Uint8Array(buffer), dataLink };
}
exports.getRawBytes = getRawBytes;
/* istanbul ignore next */
/**
 * Gets the registry entry for the given raw bytes or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The raw byte data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
// TODO: Rename & refactor after the SkyDB caching refactor.
async function getOrCreateRawBytesRegistryEntry(client, publicKey, dataKey, data, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...exports.DEFAULT_SET_JSON_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Create the data to upload to acquire its skylink.
    let dataKeyHex = dataKey;
    if (!opts.hashedDataKeyHex) {
        dataKeyHex = (0, string_1.toHexString)((0, string_1.stringToUint8ArrayUtf8)(dataKey));
    }
    const file = new File([data], `dk:${dataKeyHex}`, { type: "application/octet-stream" });
    // Start file upload, do not block.
    const uploadOpts = (0, options_1.extractOptions)(opts, upload_1.DEFAULT_UPLOAD_OPTIONS);
    const skyfilePromise = client.uploadFile(file, uploadOpts);
    // Fetch the current value to find out the revision.
    //
    // Start getEntry, do not block.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entryPromise = client.registry.getEntry(publicKey, dataKey, getEntryOpts);
    // Block until both getEntry and uploadFile are finished.
    const [signedEntry, skyfile] = await Promise.all([
        entryPromise,
        skyfilePromise,
    ]);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const dataLink = (0, string_1.trimUriPrefix)(skyfile.skylink, url_1.URI_SKYNET_PREFIX);
    const rawDataLink = (0, encoding_1.decodeSkylinkBase64)(dataLink);
    (0, validation_1.validateUint8ArrayLen)("rawDataLink", rawDataLink, "skylink byte array", sia_1.RAW_SKYLINK_SIZE);
    const entry = {
        dataKey,
        data: rawDataLink,
        revision,
    };
    return entry;
}
exports.getOrCreateRawBytesRegistryEntry = getOrCreateRawBytesRegistryEntry;
// =======
// Helpers
// =======
/**
 * Gets the next entry for the given public key and data key, setting the data to be the given data and the revision number accordingly.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
async function getNextRegistryEntry(client, publicKey, dataKey, data, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...registry_1.DEFAULT_GET_ENTRY_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Get the latest entry.
    // TODO: Can remove this once we start caching the latest revision.
    const signedEntry = await client.registry.getEntry(publicKey, dataKey, opts);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const entry = {
        dataKey,
        data,
        revision,
    };
    return entry;
}
exports.getNextRegistryEntry = getNextRegistryEntry;
/**
 * Gets the registry entry and data link or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param json - The JSON to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
async function getOrCreateRegistryEntry(client, publicKey, dataKey, json, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...exports.DEFAULT_SET_JSON_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Set the hidden _data and _v fields.
    const fullData = { _data: json, _v: JSON_RESPONSE_VERSION };
    // Create the data to upload to acquire its skylink.
    let dataKeyHex = dataKey;
    if (!opts.hashedDataKeyHex) {
        dataKeyHex = (0, string_1.toHexString)((0, string_1.stringToUint8ArrayUtf8)(dataKey));
    }
    const file = new File([JSON.stringify(fullData)], `dk:${dataKeyHex}`, { type: "application/json" });
    // Start file upload, do not block.
    const uploadOpts = (0, options_1.extractOptions)(opts, upload_1.DEFAULT_UPLOAD_OPTIONS);
    const skyfilePromise = client.uploadFile(file, uploadOpts);
    // Fetch the current value to find out the revision.
    //
    // Start getEntry, do not block.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entryPromise = client.registry.getEntry(publicKey, dataKey, getEntryOpts);
    // Block until both getEntry and uploadFile are finished.
    const [signedEntry, skyfile] = await Promise.all([
        entryPromise,
        skyfilePromise,
    ]);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const dataLink = (0, string_1.trimUriPrefix)(skyfile.skylink, url_1.URI_SKYNET_PREFIX);
    const data = (0, encoding_1.decodeSkylinkBase64)(dataLink);
    (0, validation_1.validateUint8ArrayLen)("data", data, "skylink byte array", sia_1.RAW_SKYLINK_SIZE);
    const entry = {
        dataKey,
        data,
        revision,
    };
    return [entry, (0, format_1.formatSkylink)(dataLink)];
}
exports.getOrCreateRegistryEntry = getOrCreateRegistryEntry;
/**
 * Gets the next revision from a returned entry (or 0 if the entry was not found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
function getNextRevisionFromEntry(entry) {
    let revision;
    if (entry === null) {
        revision = BigInt(0);
    }
    else {
        revision = entry.revision + BigInt(1);
    }
    // Throw if the revision is already the maximum value.
    if (revision > number_1.MAX_REVISION) {
        throw new Error("Current entry already has maximum allowed revision, could not update the entry");
    }
    return revision;
}
exports.getNextRevisionFromEntry = getNextRevisionFromEntry;
/**
 * Checks whether the raw data link matches the cached data link, if provided.
 *
 * @param rawDataLink - The raw, unformatted data link.
 * @param cachedDataLink - The cached data link, if provided.
 * @returns - Whether the cached data link is a match.
 * @throws - Will throw if the given cached data link is not a valid skylink.
 */
function checkCachedDataLink(rawDataLink, cachedDataLink) {
    if (cachedDataLink) {
        cachedDataLink = (0, validation_1.validateSkylinkString)("cachedDataLink", cachedDataLink, "optional parameter");
        return rawDataLink === cachedDataLink;
    }
    return false;
}
exports.checkCachedDataLink = checkCachedDataLink;
/**
 * Gets the registry entry, returning null if the entry contains an empty skylink (the deletion sentinel).
 *
 * @param client - The Skynet Client
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param opts - Additional settings.
 * @returns - The registry entry, or null if not found or deleted.
 */
async function getSkyDBRegistryEntry(client, publicKey, dataKey, opts) {
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const { entry } = await client.registry.getEntry(publicKey, dataKey, getEntryOpts);
    if (entry === null || (0, array_1.areEqualUint8Arrays)(entry.data, sia_1.EMPTY_SKYLINK)) {
        return null;
    }
    return entry;
}
/**
 * Parses a data link out of the given registry entry data.
 *
 * @param data - The raw registry entry data.
 * @param legacy - Whether to check for possible legacy skylink data, encoded as base64.
 * @returns - The raw, unformatted data link and the formatted data link.
 * @throws - Will throw if the data is not of the expected length for a skylink.
 */
function parseDataLink(data, legacy) {
    let rawDataLink = "";
    if (legacy && data.length === sia_1.BASE64_ENCODED_SKYLINK_SIZE) {
        // Legacy data, convert to string for backwards compatibility.
        rawDataLink = (0, string_1.uint8ArrayToStringUtf8)(data);
    }
    else if (data.length === sia_1.RAW_SKYLINK_SIZE) {
        // Convert the bytes to a base64 skylink.
        rawDataLink = (0, encoding_1.encodeSkylinkBase64)(data);
    }
    else {
        (0, validation_1.throwValidationError)("entry.data", data, "returned entry data", `length ${sia_1.RAW_SKYLINK_SIZE} bytes`);
    }
    return { rawDataLink, dataLink: (0, format_1.formatSkylink)(rawDataLink) };
}
