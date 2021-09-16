"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequestHeaders = exports.buildRequestUrl = exports.SkynetClient = void 0;
const axios_1 = __importDefault(require("axios"));
const upload_1 = require("./upload");
const download_1 = require("./download");
const file_1 = require("./file");
const pin_1 = require("./pin");
const registry_1 = require("./registry");
const skydb_1 = require("./skydb");
const url_1 = require("./utils/url");
const mysky_1 = require("./mysky");
const utils_1 = require("./mysky/utils");
const string_1 = require("./utils/string");
/**
 * The Skynet Client which can be used to access Skynet.
 */
class SkynetClient {
    /**
     * The Skynet Client which can be used to access Skynet.
     *
     * @class
     * @param [initialPortalUrl] The initial portal URL to use to access Skynet, if specified. A request will be made to this URL to get the actual portal URL. To use the default portal while passing custom options, pass "".
     * @param [customOptions] Configuration for the client.
     */
    constructor(initialPortalUrl = "", customOptions = {}) {
        // Set methods (defined in other files).
        // Upload
        this.uploadFile = upload_1.uploadFile;
        this.uploadSmallFile = upload_1.uploadSmallFile;
        this.uploadSmallFileRequest = upload_1.uploadSmallFileRequest;
        this.uploadLargeFile = upload_1.uploadLargeFile;
        this.uploadLargeFileRequest = upload_1.uploadLargeFileRequest;
        this.uploadDirectory = upload_1.uploadDirectory;
        this.uploadDirectoryRequest = upload_1.uploadDirectoryRequest;
        // Download
        this.downloadFile = download_1.downloadFile;
        this.downloadFileHns = download_1.downloadFileHns;
        this.getSkylinkUrl = download_1.getSkylinkUrl;
        this.getHnsUrl = download_1.getHnsUrl;
        this.getHnsresUrl = download_1.getHnsresUrl;
        this.getMetadata = download_1.getMetadata;
        this.getFileContent = download_1.getFileContent;
        this.getFileContentHns = download_1.getFileContentHns;
        this.getFileContentRequest = download_1.getFileContentRequest;
        this.openFile = download_1.openFile;
        this.openFileHns = download_1.openFileHns;
        this.resolveHns = download_1.resolveHns;
        // Pin
        this.pinSkylink = pin_1.pinSkylink;
        // MySky
        this.extractDomain = utils_1.extractDomain;
        this.getFullDomainUrl = utils_1.getFullDomainUrl;
        this.loadMySky = mysky_1.loadMySky;
        // File API
        this.file = {
            getJSON: file_1.getJSON.bind(this),
            getEntryData: file_1.getEntryData.bind(this),
            getEntryLink: file_1.getEntryLink.bind(this),
            getJSONEncrypted: file_1.getJSONEncrypted.bind(this),
        };
        // SkyDB
        this.db = {
            deleteJSON: skydb_1.deleteJSON.bind(this),
            getJSON: skydb_1.getJSON.bind(this),
            setJSON: skydb_1.setJSON.bind(this),
            setDataLink: skydb_1.setDataLink.bind(this),
            getRawBytes: skydb_1.getRawBytes.bind(this),
        };
        // Registry
        this.registry = {
            getEntry: registry_1.getEntry.bind(this),
            getEntryUrl: registry_1.getEntryUrl.bind(this),
            getEntryLink: registry_1.getEntryLink.bind(this),
            setEntry: registry_1.setEntry.bind(this),
            postSignedEntry: registry_1.postSignedEntry.bind(this),
        };
        if (initialPortalUrl === "") {
            // Portal was not given, use the default portal URL. We'll still make a request for the resolved portal URL.
            initialPortalUrl = (0, url_1.defaultPortalUrl)();
        }
        else {
            // Portal was given, don't make the request for the resolved portal URL.
            this.customPortalUrl = initialPortalUrl;
        }
        this.initialPortalUrl = initialPortalUrl;
        this.customOptions = customOptions;
    }
    /**
     * Make the request for the API portal URL.
     *
     * @returns - A promise that resolves when the request is complete.
     */
    /* istanbul ignore next */
    async initPortalUrl() {
        if (this.customPortalUrl) {
            // Tried to make a request for the API portal URL when a custom URL was already provided.
            return;
        }
        if (!SkynetClient.resolvedPortalUrl) {
            SkynetClient.resolvedPortalUrl = this.resolvePortalUrl();
        }
        await SkynetClient.resolvedPortalUrl;
        return;
    }
    /**
     * Returns the API portal URL. Makes the request to get it if not done so already.
     *
     * @returns - the portal URL.
     */
    /* istanbul ignore next */
    async portalUrl() {
        if (this.customPortalUrl) {
            return this.customPortalUrl;
        }
        // Make the request if needed and not done so.
        await this.initPortalUrl();
        return await SkynetClient.resolvedPortalUrl; // eslint-disable-line
    }
    // ===============
    // Private Methods
    // ===============
    /**
     * Creates and executes a request.
     *
     * @param config - Configuration for the request.
     * @returns - The response from axios.
     */
    async executeRequest(config) {
        const url = await buildRequestUrl(this, config.endpointPath, config.url, config.extraPath, config.query);
        // Build headers.
        const headers = buildRequestHeaders(config.headers, config.customUserAgent, config.customCookie);
        const auth = config.APIKey ? { username: "", password: config.APIKey } : undefined;
        let onDownloadProgress = undefined;
        if (config.onDownloadProgress) {
            onDownloadProgress = function (event) {
                // Avoid NaN for 0-byte file.
                /* istanbul ignore next: Empty file test doesn't work yet. */
                const progress = event.total ? event.loaded / event.total : 1;
                // @ts-expect-error TS complains even though we've ensured this is defined.
                config.onDownloadProgress(progress, event);
            };
        }
        let onUploadProgress = undefined;
        if (config.onUploadProgress) {
            onUploadProgress = function (event) {
                // Avoid NaN for 0-byte file.
                /* istanbul ignore next: event.total is always 0 in Node. */
                const progress = event.total ? event.loaded / event.total : 1;
                // @ts-expect-error TS complains even though we've ensured this is defined.
                config.onUploadProgress(progress, event);
            };
        }
        return (0, axios_1.default)({
            url,
            method: config.method,
            data: config.data,
            headers,
            auth,
            onDownloadProgress,
            onUploadProgress,
            responseType: config.responseType,
            transformRequest: config.transformRequest,
            transformResponse: config.transformResponse,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            // Allow cross-site cookies.
            withCredentials: true,
        });
    }
    async resolvePortalUrl() {
        const response = await this.executeRequest({
            ...this.customOptions,
            method: "head",
            url: this.initialPortalUrl,
            endpointPath: "/",
        });
        if (typeof response.headers === "undefined") {
            throw new Error("Did not get 'headers' in response despite a successful request. Please try again and report this issue to the devs if it persists.");
        }
        const portalUrl = response.headers["skynet-portal-api"];
        if (!portalUrl) {
            throw new Error("Could not get portal URL for the given portal");
        }
        return (0, string_1.trimSuffix)(portalUrl, "/");
    }
}
exports.SkynetClient = SkynetClient;
// =======
// Helpers
// =======
/**
 * Helper function that builds the request URL.
 *
 * @param client - The Skynet client.
 * @param endpointPath - The endpoint to contact.
 * @param [url] - The base URL to use, instead of the portal URL.
 * @param [extraPath] - An optional path to append to the URL.
 * @param [query] - Optional query parameters to append to the URL.
 * @returns - The built URL.
 */
async function buildRequestUrl(client, endpointPath, url, extraPath, query) {
    // Build the URL.
    if (!url) {
        const portalUrl = await client.portalUrl();
        url = (0, url_1.makeUrl)(portalUrl, endpointPath, extraPath !== null && extraPath !== void 0 ? extraPath : "");
    }
    if (query) {
        url = (0, url_1.addUrlQuery)(url, query);
    }
    return url;
}
exports.buildRequestUrl = buildRequestUrl;
/**
 * Helper function that builds the request headers.
 *
 * @param [baseHeaders] - Any base headers.
 * @param [customUserAgent] - A custom user agent to set.
 * @param [customCookie] - A custom cookie.
 * @returns - The built headers.
 */
function buildRequestHeaders(baseHeaders, customUserAgent, customCookie) {
    const returnHeaders = { ...baseHeaders };
    // Set some headers from common options.
    if (customUserAgent) {
        returnHeaders["User-Agent"] = customUserAgent;
    }
    if (customCookie) {
        returnHeaders["Cookie"] = customCookie;
    }
    return returnHeaders;
}
exports.buildRequestHeaders = buildRequestHeaders;
