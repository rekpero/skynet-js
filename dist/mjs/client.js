import axios from "axios";
import { uploadFile, uploadLargeFile, uploadDirectory, uploadDirectoryRequest, uploadSmallFile, uploadSmallFileRequest, uploadLargeFileRequest, } from "./upload";
import { downloadFile, downloadFileHns, getSkylinkUrl, getHnsUrl, getHnsresUrl, getMetadata, getFileContent, getFileContentHns, getFileContentRequest, openFile, openFileHns, resolveHns, } from "./download";
import { getJSONEncrypted, getEntryData, getEntryLink as fileGetEntryLink, getJSON as fileGetJSON } from "./file";
import { pinSkylink } from "./pin";
import { getEntry, getEntryUrl, getEntryLink, setEntry, postSignedEntry } from "./registry";
import { deleteJSON, getJSON, setJSON, setDataLink, getRawBytes } from "./skydb";
import { addUrlQuery, defaultPortalUrl, makeUrl } from "./utils/url";
import { loadMySky } from "./mysky";
import { extractDomain, getFullDomainUrl } from "./mysky/utils";
import { trimSuffix } from "./utils/string";
/**
 * The Skynet Client which can be used to access Skynet.
 */
export class SkynetClient {
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
        this.uploadFile = uploadFile;
        this.uploadSmallFile = uploadSmallFile;
        this.uploadSmallFileRequest = uploadSmallFileRequest;
        this.uploadLargeFile = uploadLargeFile;
        this.uploadLargeFileRequest = uploadLargeFileRequest;
        this.uploadDirectory = uploadDirectory;
        this.uploadDirectoryRequest = uploadDirectoryRequest;
        // Download
        this.downloadFile = downloadFile;
        this.downloadFileHns = downloadFileHns;
        this.getSkylinkUrl = getSkylinkUrl;
        this.getHnsUrl = getHnsUrl;
        this.getHnsresUrl = getHnsresUrl;
        this.getMetadata = getMetadata;
        this.getFileContent = getFileContent;
        this.getFileContentHns = getFileContentHns;
        this.getFileContentRequest = getFileContentRequest;
        this.openFile = openFile;
        this.openFileHns = openFileHns;
        this.resolveHns = resolveHns;
        // Pin
        this.pinSkylink = pinSkylink;
        // MySky
        this.extractDomain = extractDomain;
        this.getFullDomainUrl = getFullDomainUrl;
        this.loadMySky = loadMySky;
        // File API
        this.file = {
            getJSON: fileGetJSON.bind(this),
            getEntryData: getEntryData.bind(this),
            getEntryLink: fileGetEntryLink.bind(this),
            getJSONEncrypted: getJSONEncrypted.bind(this),
        };
        // SkyDB
        this.db = {
            deleteJSON: deleteJSON.bind(this),
            getJSON: getJSON.bind(this),
            setJSON: setJSON.bind(this),
            setDataLink: setDataLink.bind(this),
            getRawBytes: getRawBytes.bind(this),
        };
        // Registry
        this.registry = {
            getEntry: getEntry.bind(this),
            getEntryUrl: getEntryUrl.bind(this),
            getEntryLink: getEntryLink.bind(this),
            setEntry: setEntry.bind(this),
            postSignedEntry: postSignedEntry.bind(this),
        };
        if (initialPortalUrl === "") {
            // Portal was not given, use the default portal URL. We'll still make a request for the resolved portal URL.
            initialPortalUrl = defaultPortalUrl();
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
        return axios({
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
        return trimSuffix(portalUrl, "/");
    }
}
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
export async function buildRequestUrl(client, endpointPath, url, extraPath, query) {
    // Build the URL.
    if (!url) {
        const portalUrl = await client.portalUrl();
        url = makeUrl(portalUrl, endpointPath, extraPath !== null && extraPath !== void 0 ? extraPath : "");
    }
    if (query) {
        url = addUrlQuery(url, query);
    }
    return url;
}
/**
 * Helper function that builds the request headers.
 *
 * @param [baseHeaders] - Any base headers.
 * @param [customUserAgent] - A custom user agent to set.
 * @param [customCookie] - A custom cookie.
 * @returns - The built headers.
 */
export function buildRequestHeaders(baseHeaders, customUserAgent, customCookie) {
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
