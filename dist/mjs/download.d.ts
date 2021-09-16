import { ResponseType } from "axios";
import { SkynetClient } from "./client";
import { BaseCustomOptions } from "./utils/options";
import { JsonData } from "./utils/types";
/**
 * Custom download options.
 *
 * @property [endpointDownload] - The relative URL path of the portal endpoint to contact.
 * @property [download=false] - Indicates to `getSkylinkUrl` whether the file should be downloaded (true) or opened in the browser (false). `downloadFile` and `openFile` override this value.
 * @property [path] - A path to append to the skylink, e.g. `dir1/dir2/file`. A Unix-style path is expected. Each path component will be URL-encoded.
 * @property [range] - The Range request header to set for the download. Not applicable for in-borwser downloads.
 * @property [responseType] - The response type.
 * @property [subdomain=false] - Whether to return the final skylink in subdomain format.
 */
export declare type CustomDownloadOptions = BaseCustomOptions & {
    endpointDownload?: string;
    download?: boolean;
    path?: string;
    range?: string;
    responseType?: ResponseType;
    subdomain?: boolean;
};
/**
 * Custom HNS download options.
 *
 * @property [endpointDownloadHns] - The relative URL path of the portal endpoint to contact.
 * @property [hnsSubdomain="hns"] - The name of the hns subdomain on the portal.
 */
export declare type CustomHnsDownloadOptions = CustomDownloadOptions & {
    endpointDownloadHns?: string;
    hnsSubdomain?: string;
};
export declare type CustomGetMetadataOptions = BaseCustomOptions & {
    endpointGetMetadata?: string;
};
export declare type CustomHnsResolveOptions = BaseCustomOptions & {
    endpointResolveHns?: string;
};
/**
 * The response for a get file content request.
 *
 * @property data - The returned file content. Its type is stored in contentType.
 * @property contentType - The type of the content.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export declare type GetFileContentResponse<T = unknown> = {
    data: T;
    contentType: string;
    portalUrl: string;
    skylink: string;
};
/**
 * The response for a get metadata request.
 *
 * @property metadata - The metadata in JSON format.
 * @property portalUrl - The URL of the portal.
 * @property skylink - 46-character skylink.
 */
export declare type GetMetadataResponse = {
    metadata: Record<string, unknown>;
    portalUrl: string;
    skylink: string;
};
/**
 * The response for a resolve HNS request.
 *
 * @property skylink - 46-character skylink.
 */
export declare type ResolveHnsResponse = {
    data: JsonData;
    skylink: string;
};
export declare const DEFAULT_DOWNLOAD_OPTIONS: {
    endpointDownload: string;
    download: boolean;
    path: undefined;
    range: undefined;
    responseType: undefined;
    subdomain: boolean;
    APIKey: string;
    customUserAgent: string;
    customCookie: string;
    onDownloadProgress: undefined;
    onUploadProgress: undefined;
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
export declare function downloadFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): Promise<string>;
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
export declare function downloadFileHns(this: SkynetClient, domain: string, customOptions?: CustomDownloadOptions): Promise<string>;
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
export declare function getSkylinkUrl(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): Promise<string>;
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
export declare function getSkylinkUrlForPortal(portalUrl: string, skylinkUrl: string, customOptions?: CustomDownloadOptions): string;
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
export declare function getHnsUrl(this: SkynetClient, domain: string, customOptions?: CustomHnsDownloadOptions): Promise<string>;
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
export declare function getHnsresUrl(this: SkynetClient, domain: string, customOptions?: CustomHnsResolveOptions): Promise<string>;
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
export declare function getMetadata(this: SkynetClient, skylinkUrl: string, customOptions?: CustomGetMetadataOptions): Promise<GetMetadataResponse>;
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
export declare function getFileContent<T = unknown>(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): Promise<GetFileContentResponse<T>>;
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
export declare function getFileContentHns<T = unknown>(this: SkynetClient, domain: string, customOptions?: CustomHnsDownloadOptions): Promise<GetFileContentResponse<T>>;
/**
 * Does a GET request of the skylink, returning the data property of the response.
 *
 * @param this - SkynetClient
 * @param url - URL.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An object containing the data of the file, the content-type, metadata, and the file's skylink.
 * @throws - Will throw if the request does not succeed or the response is missing data.
 */
export declare function getFileContentRequest<T = unknown>(this: SkynetClient, url: string, customOptions?: CustomDownloadOptions): Promise<GetFileContentResponse<T>>;
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
export declare function openFile(this: SkynetClient, skylinkUrl: string, customOptions?: CustomDownloadOptions): Promise<string>;
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
export declare function openFileHns(this: SkynetClient, domain: string, customOptions?: CustomHnsDownloadOptions): Promise<string>;
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
export declare function resolveHns(this: SkynetClient, domain: string, customOptions?: CustomHnsResolveOptions): Promise<ResolveHnsResponse>;
//# sourceMappingURL=download.d.ts.map