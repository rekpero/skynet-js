import type { AxiosResponse, ResponseType, Method } from "axios";
import { uploadFile, uploadLargeFile, uploadDirectory, uploadDirectoryRequest, uploadSmallFile, uploadSmallFileRequest, uploadLargeFileRequest } from "./upload";
import { downloadFile, downloadFileHns, getSkylinkUrl, getHnsUrl, getHnsresUrl, getMetadata, getFileContent, getFileContentHns, getFileContentRequest, openFile, openFileHns, resolveHns } from "./download";
import { pinSkylink } from "./pin";
import { loadMySky } from "./mysky";
import { extractDomain, getFullDomainUrl } from "./mysky/utils";
/**
 * Custom client options.
 *
 * @property [APIKey] - Authentication password to use.
 * @property [customUserAgent] - Custom user agent header to set.
 * @property [customCookie] - Custom cookie header to set.
 * @property [onDownloadProgress] - Optional callback to track download progress.
 * @property [onUploadProgress] - Optional callback to track upload progress.
 */
export declare type CustomClientOptions = {
    APIKey?: string;
    customUserAgent?: string;
    customCookie?: string;
    onDownloadProgress?: (progress: number, event: ProgressEvent) => void;
    onUploadProgress?: (progress: number, event: ProgressEvent) => void;
};
/**
 * Config options for a single request.
 *
 * @property endpointPath - The endpoint to contact.
 * @property [data] - The data for a POST request.
 * @property [url] - The full url to contact. Will be computed from the portalUrl and endpointPath if not provided.
 * @property [method] - The request method.
 * @property [query] - Query parameters.
 * @property [extraPath] - An additional path to append to the URL, e.g. a 46-character skylink.
 * @property [headers] - Any request headers to set.
 * @property [responseType] - The response type.
 * @property [transformRequest] - A function that allows manually transforming the request.
 * @property [transformResponse] - A function that allows manually transforming the response.
 */
export declare type RequestConfig = CustomClientOptions & {
    endpointPath: string;
    data?: FormData | Record<string, unknown>;
    url?: string;
    method?: Method;
    headers?: Headers;
    query?: Record<string, unknown>;
    extraPath?: string;
    responseType?: ResponseType;
    transformRequest?: (data: unknown) => string;
    transformResponse?: (data: string) => Record<string, unknown>;
};
/**
 * The Skynet Client which can be used to access Skynet.
 */
export declare class SkynetClient {
    customOptions: CustomClientOptions;
    protected initialPortalUrl: string;
    protected static resolvedPortalUrl?: Promise<string>;
    protected customPortalUrl?: string;
    uploadFile: typeof uploadFile;
    protected uploadSmallFile: typeof uploadSmallFile;
    protected uploadSmallFileRequest: typeof uploadSmallFileRequest;
    protected uploadLargeFile: typeof uploadLargeFile;
    protected uploadLargeFileRequest: typeof uploadLargeFileRequest;
    uploadDirectory: typeof uploadDirectory;
    protected uploadDirectoryRequest: typeof uploadDirectoryRequest;
    downloadFile: typeof downloadFile;
    downloadFileHns: typeof downloadFileHns;
    getSkylinkUrl: typeof getSkylinkUrl;
    getHnsUrl: typeof getHnsUrl;
    getHnsresUrl: typeof getHnsresUrl;
    getMetadata: typeof getMetadata;
    getFileContent: typeof getFileContent;
    getFileContentHns: typeof getFileContentHns;
    protected getFileContentRequest: typeof getFileContentRequest;
    openFile: typeof openFile;
    openFileHns: typeof openFileHns;
    resolveHns: typeof resolveHns;
    pinSkylink: typeof pinSkylink;
    extractDomain: typeof extractDomain;
    getFullDomainUrl: typeof getFullDomainUrl;
    loadMySky: typeof loadMySky;
    file: {
        getJSON: (userID: string, path: string, customOptions?: import("./skydb").CustomGetJSONOptions | undefined) => Promise<import("./skydb").JSONResponse>;
        getEntryData: (userID: string, path: string, customOptions?: import("./registry").CustomGetEntryOptions | undefined) => Promise<import("./mysky").EntryData>;
        getEntryLink: (userID: string, path: string) => Promise<string>;
        getJSONEncrypted: (userID: string, pathSeed: string, customOptions?: import("./skydb").CustomGetJSONOptions | undefined) => Promise<import("./mysky/encrypted_files").EncryptedJSONResponse>;
    };
    db: {
        deleteJSON: (privateKey: string, dataKey: string, customOptions?: import("./skydb").CustomSetJSONOptions | undefined) => Promise<void>;
        getJSON: (publicKey: string, dataKey: string, customOptions?: import("./skydb").CustomGetJSONOptions | undefined) => Promise<import("./skydb").JSONResponse>;
        setJSON: (privateKey: string, dataKey: string, json: import(".").JsonData, customOptions?: import("./skydb").CustomSetJSONOptions | undefined) => Promise<import("./skydb").JSONResponse>;
        setDataLink: (privateKey: string, dataKey: string, dataLink: string, customOptions?: import("./skydb").CustomSetJSONOptions | undefined) => Promise<void>;
        getRawBytes: (publicKey: string, dataKey: string, customOptions?: import("./skydb").CustomGetJSONOptions | undefined) => Promise<import("./skydb").RawBytesResponse>;
    };
    registry: {
        getEntry: (publicKey: string, dataKey: string, customOptions?: import("./registry").CustomGetEntryOptions | undefined) => Promise<import("./registry").SignedRegistryEntry>;
        getEntryUrl: (publicKey: string, dataKey: string, customOptions?: import("./registry").CustomGetEntryOptions | undefined) => Promise<string>;
        getEntryLink: (publicKey: string, dataKey: string, customOptions?: import("./registry").CustomGetEntryOptions | undefined) => Promise<string>;
        setEntry: (privateKey: string, entry: import("./registry").RegistryEntry, customOptions?: import("./registry").CustomSetEntryOptions | undefined) => Promise<void>;
        postSignedEntry: (publicKey: string, entry: import("./registry").RegistryEntry, signature: Uint8Array, customOptions?: import("./registry").CustomSetEntryOptions | undefined) => Promise<void>;
    };
    /**
     * The Skynet Client which can be used to access Skynet.
     *
     * @class
     * @param [initialPortalUrl] The initial portal URL to use to access Skynet, if specified. A request will be made to this URL to get the actual portal URL. To use the default portal while passing custom options, pass "".
     * @param [customOptions] Configuration for the client.
     */
    constructor(initialPortalUrl?: string, customOptions?: CustomClientOptions);
    /**
     * Make the request for the API portal URL.
     *
     * @returns - A promise that resolves when the request is complete.
     */
    initPortalUrl(): Promise<void>;
    /**
     * Returns the API portal URL. Makes the request to get it if not done so already.
     *
     * @returns - the portal URL.
     */
    portalUrl(): Promise<string>;
    /**
     * Creates and executes a request.
     *
     * @param config - Configuration for the request.
     * @returns - The response from axios.
     */
    protected executeRequest(config: RequestConfig): Promise<AxiosResponse>;
    resolvePortalUrl(): Promise<string>;
}
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
export declare function buildRequestUrl(client: SkynetClient, endpointPath: string, url?: string, extraPath?: string, query?: Record<string, unknown>): Promise<string>;
declare type Headers = {
    [key: string]: string;
};
/**
 * Helper function that builds the request headers.
 *
 * @param [baseHeaders] - Any base headers.
 * @param [customUserAgent] - A custom user agent to set.
 * @param [customCookie] - A custom cookie.
 * @returns - The built headers.
 */
export declare function buildRequestHeaders(baseHeaders?: Headers, customUserAgent?: string, customCookie?: string): Headers;
export {};
//# sourceMappingURL=client.d.ts.map