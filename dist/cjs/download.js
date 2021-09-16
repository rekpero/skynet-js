"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHns = exports.openFileHns = exports.openFile = exports.getFileContentRequest = exports.getFileContentHns = exports.getFileContent = exports.getMetadata = exports.getHnsresUrl = exports.getHnsUrl = exports.getSkylinkUrlForPortal = exports.getSkylinkUrl = exports.downloadFileHns = exports.downloadFile = exports.DEFAULT_DOWNLOAD_OPTIONS = void 0;
const format_1 = require("./skylink/format");
const parse_1 = require("./skylink/parse");
const string_1 = require("./utils/string");
const options_1 = require("./utils/options");
const url_1 = require("./utils/url");
const validation_1 = require("./utils/validation");
exports.DEFAULT_DOWNLOAD_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    endpointDownload: "/",
    download: false,
    path: undefined,
    range: undefined,
    responseType: undefined,
    subdomain: false,
};
const DEFAULT_GET_METADATA_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    endpointGetMetadata: "/skynet/metadata",
};
const DEFAULT_DOWNLOAD_HNS_OPTIONS = {
    ...exports.DEFAULT_DOWNLOAD_OPTIONS,
    endpointDownloadHns: "hns",
    hnsSubdomain: "hns",
    // Default to subdomain format for HNS URLs.
    subdomain: true,
};
const DEFAULT_RESOLVE_HNS_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    endpointResolveHns: "hnsres",
};
/**
 * Initiates a download of the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character skylink, or a valid skylink URL. Can be followed by a path. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
async function downloadFile(skylinkUrl, customOptions) {
    // Validation is done in `getSkylinkUrl`.
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions, download: true };
    const url = await this.getSkylinkUrl(skylinkUrl, opts);
    // Download the url.
    window.location.assign(url);
    return url;
}
exports.downloadFile = downloadFile;
/**
 * Initiates a download of the content of the skylink at the Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
async function downloadFileHns(domain, customOptions) {
    // Validation is done in `getHnsUrl`.
    const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions, download: true };
    const url = await this.getHnsUrl(domain, opts);
    // Download the url.
    window.location.assign(url);
    return url;
}
exports.downloadFileHns = downloadFileHns;
/**
 * Constructs the full URL for the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
async function getSkylinkUrl(skylinkUrl, customOptions) {
    // Validation is done in `getSkylinkUrlForPortal`.
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const portalUrl = await this.portalUrl();
    return getSkylinkUrlForPortal(portalUrl, skylinkUrl, opts);
}
exports.getSkylinkUrl = getSkylinkUrl;
/**
 * Gets the skylink URL without an initialized client.
 *
 * @param portalUrl - The portal URL.
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint.
 * @returns - The full URL for the skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
function getSkylinkUrlForPortal(portalUrl, skylinkUrl, customOptions) {
    var _a;
    (0, validation_1.validateString)("portalUrl", portalUrl, "parameter");
    (0, validation_1.validateString)("skylinkUrl", skylinkUrl, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_DOWNLOAD_OPTIONS);
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...customOptions };
    const query = {};
    if (opts.download) {
        // Set the "attachment" parameter.
        query.attachment = true;
    }
    // URL-encode the path.
    let path = "";
    if (opts.path) {
        if (typeof opts.path !== "string") {
            throw new Error(`opts.path has to be a string, ${typeof opts.path} provided`);
        }
        // Encode each element of the path separately and join them.
        //
        // Don't use encodeURI because it does not encode characters such as '?'
        // etc. These are allowed as filenames on Skynet and should be encoded so
        // they are not treated as URL separators.
        path = opts.path
            .split("/")
            .map((element) => encodeURIComponent(element))
            .join("/");
    }
    let url;
    if (opts.subdomain) {
        // The caller wants to use a URL with the skylink as a base32 subdomain.
        //
        // Get the path from the skylink. Use the empty string if not found.
        const skylinkPath = (_a = (0, parse_1.parseSkylink)(skylinkUrl, { onlyPath: true })) !== null && _a !== void 0 ? _a : "";
        // Get just the skylink.
        let skylink = (0, parse_1.parseSkylink)(skylinkUrl);
        if (skylink === null) {
            throw new Error(`Could not get skylink out of input '${skylinkUrl}'`);
        }
        // Convert the skylink (without the path) to base32.
        skylink = (0, format_1.convertSkylinkToBase32)(skylink);
        url = (0, url_1.addSubdomain)(portalUrl, skylink);
        url = (0, url_1.makeUrl)(url, skylinkPath, path);
    }
    else {
        // Get the skylink including the path.
        const skylink = (0, parse_1.parseSkylink)(skylinkUrl, { includePath: true });
        if (skylink === null) {
            throw new Error(`Could not get skylink with path out of input '${skylinkUrl}'`);
        }
        // Add additional path if passed in.
        url = (0, url_1.makeUrl)(portalUrl, opts.endpointDownload, skylink);
        url = (0, url_1.makeUrl)(url, path);
    }
    return (0, url_1.addUrlQuery)(url, query);
}
exports.getSkylinkUrlForPortal = getSkylinkUrlForPortal;
/**
 * Constructs the full URL for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the HNS domain.
 * @throws - Will throw if the input domain is not a string.
 */
async function getHnsUrl(domain, customOptions) {
    (0, validation_1.validateString)("domain", domain, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", DEFAULT_DOWNLOAD_HNS_OPTIONS);
    const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };
    const query = {};
    if (opts.download) {
        query.attachment = true;
    }
    domain = (0, string_1.trimUriPrefix)(domain, url_1.URI_HANDSHAKE_PREFIX);
    const portalUrl = await this.portalUrl();
    const url = opts.subdomain
        ? (0, url_1.addSubdomain)((0, url_1.addSubdomain)(portalUrl, opts.hnsSubdomain), domain)
        : (0, url_1.makeUrl)(portalUrl, opts.endpointDownloadHns, domain);
    return (0, url_1.addUrlQuery)(url, query);
}
exports.getHnsUrl = getHnsUrl;
/**
 * Constructs the full URL for the resolver for the given HNS domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointResolveHns="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL for the resolver for the HNS domain.
 * @throws - Will throw if the input domain is not a string.
 */
async function getHnsresUrl(domain, customOptions) {
    (0, validation_1.validateString)("domain", domain, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", DEFAULT_RESOLVE_HNS_OPTIONS);
    const opts = { ...DEFAULT_RESOLVE_HNS_OPTIONS, ...this.customOptions, ...customOptions };
    domain = (0, string_1.trimUriPrefix)(domain, url_1.URI_HANDSHAKE_PREFIX);
    const portalUrl = await this.portalUrl();
    return (0, url_1.makeUrl)(portalUrl, opts.endpointResolveHns, domain);
}
exports.getHnsresUrl = getHnsresUrl;
/**
 * Gets only the metadata for the given skylink without the contents.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointGetMetadata="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The metadata in JSON format. Empty if no metadata was found.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
async function getMetadata(skylinkUrl, customOptions) {
    var _a;
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", DEFAULT_GET_METADATA_OPTIONS);
    // Rest of validation is done in `getSkylinkUrl`.
    const opts = { ...DEFAULT_GET_METADATA_OPTIONS, ...this.customOptions, ...customOptions };
    // Don't include the path for now since the endpoint doesn't support it.
    const path = (0, parse_1.parseSkylink)(skylinkUrl, { onlyPath: true });
    if (path) {
        throw new Error("Skylink string should not contain a path");
    }
    const getSkylinkUrlOpts = { endpointDownload: opts.endpointGetMetadata };
    const url = await this.getSkylinkUrl(skylinkUrl, getSkylinkUrlOpts);
    const response = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointGetMetadata,
        method: "GET",
        url,
    });
    validateGetMetadataResponse(response);
    const metadata = response.data;
    const portalUrl = (_a = response.headers["skynet-portal-api"]) !== null && _a !== void 0 ? _a : "";
    const skylink = response.headers["skynet-skylink"] ? (0, format_1.formatSkylink)(response.headers["skynet-skylink"]) : "";
    return { metadata, portalUrl, skylink };
}
exports.getMetadata = getMetadata;
/**
 * Gets the contents of the file at the given skylink.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
async function getFileContent(skylinkUrl, customOptions) {
    // Validation is done in `getSkylinkUrl`.
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const url = await this.getSkylinkUrl(skylinkUrl, opts);
    return this.getFileContentRequest(url, opts);
}
exports.getFileContent = getFileContent;
/**
 * Gets the contents of the file at the given Handshake domain.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the domain does not contain a skylink.
 */
async function getFileContentHns(domain, customOptions) {
    // Validation is done in `getHnsUrl`.
    const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };
    const url = await this.getHnsUrl(domain, opts);
    return this.getFileContentRequest(url, opts);
}
exports.getFileContentHns = getFileContentHns;
/**
 * Does a GET request of the skylink, returning the data property of the response.
 *
 * @param this - SkynetClient
 * @param url - URL.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the request does not succeed or the response is missing data.
 */
async function getFileContentRequest(url, customOptions) {
    // Not publicly available, don't validate input.
    var _a, _b;
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const headers = opts.range ? { Range: opts.range } : undefined;
    // GET request the data at the skylink.
    const response = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointDownload,
        method: "get",
        url,
        headers,
    });
    if (typeof response.data === "undefined") {
        throw new Error("Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists.");
    }
    if (typeof response.headers === "undefined") {
        throw new Error("Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists.");
    }
    const contentType = (_a = response.headers["content-type"]) !== null && _a !== void 0 ? _a : "";
    const portalUrl = (_b = response.headers["skynet-portal-api"]) !== null && _b !== void 0 ? _b : "";
    const skylink = response.headers["skynet-skylink"] ? (0, format_1.formatSkylink)(response.headers["skynet-skylink"]) : "";
    return { data: response.data, contentType, portalUrl, skylink };
}
exports.getFileContentRequest = getFileContentRequest;
/**
 * Opens the content of the skylink within the browser.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - Skylink string. See `downloadFile`.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFile` for the full list.
 * @param [customOptions.endpointDownload="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path option is not a string.
 */
async function openFile(skylinkUrl, customOptions) {
    // Validation is done in `getSkylinkUrl`.
    const opts = { ...exports.DEFAULT_DOWNLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const url = await this.getSkylinkUrl(skylinkUrl, opts);
    window.open(url, "_blank");
    return url;
}
exports.openFile = openFile;
/**
 * Opens the content of the skylink from the given Handshake domain within the browser.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param [customOptions] - Additional settings that can optionally be set. See `downloadFileHns` for the full list.
 * @param [customOptions.endpointDownloadHns="/hns"] - The relative URL path of the portal endpoint to contact.
 * @returns - The full URL that was used.
 * @throws - Will throw if the input domain is not a string.
 */
async function openFileHns(domain, customOptions) {
    // Validation is done in `getHnsUrl`.
    const opts = { ...DEFAULT_DOWNLOAD_HNS_OPTIONS, ...this.customOptions, ...customOptions };
    const url = await this.getHnsUrl(domain, opts);
    // Open the url in a new tab.
    window.open(url, "_blank");
    return url;
}
exports.openFileHns = openFileHns;
/**
 * Resolves the given HNS domain to its skylink and returns it and the raw data.
 *
 * @param this - SkynetClient
 * @param domain - Handshake resolver domain.
 * @param [customOptions={}] - Additional settings that can optionally be set.
 * @param [customOptions.endpointResolveHns="/hnsres"] - The relative URL path of the portal endpoint to contact.
 * @returns - The raw data and corresponding skylink.
 * @throws - Will throw if the input domain is not a string.
 */
async function resolveHns(domain, customOptions) {
    // Validation is done in `getHnsresUrl`.
    const opts = { ...DEFAULT_RESOLVE_HNS_OPTIONS, ...this.customOptions, ...customOptions };
    const url = await this.getHnsresUrl(domain, opts);
    // Get the txt record from the hnsres domain on the portal.
    const response = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointResolveHns,
        method: "get",
        url,
    });
    validateResolveHnsResponse(response);
    if (response.data.skylink) {
        return { data: response.data, skylink: response.data.skylink };
    }
    else {
        const skylink = await this.registry.getEntryLink(response.data.registry.publickey, response.data.registry.datakey, {
            hashedDataKeyHex: true,
        });
        return { data: response.data, skylink };
    }
}
exports.resolveHns = resolveHns;
/**
 * Validates the response from getMetadata.
 *
 * @param response - The Axios response.
 * @throws - Will throw if the response does not contain the expected fields.
 */
function validateGetMetadataResponse(response) {
    try {
        if (!response.data) {
            throw new Error("response.data field missing");
        }
        if (!response.headers) {
            throw new Error("response.headers field missing");
        }
    }
    catch (err) {
        throw new Error(`Metadata response invalid despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`);
    }
}
/**
 * Validates the response from resolveHns.
 *
 * @param response - The Axios response.
 * @throws - Will throw if the response contains an unexpected format.
 */
function validateResolveHnsResponse(response) {
    try {
        if (!response.data) {
            throw new Error("response.data field missing");
        }
        if (response.data.skylink) {
            (0, validation_1.validateString)("response.data.skylink", response.data.skylink, "resolveHns response field");
        }
        else if (response.data.registry) {
            (0, validation_1.validateObject)("response.data.registry", response.data.registry, "resolveHns response field");
            (0, validation_1.validateString)("response.data.registry.publickey", response.data.registry.publickey, "resolveHns response field");
            (0, validation_1.validateString)("response.data.registry.datakey", response.data.registry.datakey, "resolveHns response field");
        }
        else {
            (0, validation_1.throwValidationError)("response.data", response.data, "response data object", "object containing skylink or registry field");
        }
    }
    catch (err) {
        throw new Error(`Did not get a complete resolve HNS response despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`);
    }
}
