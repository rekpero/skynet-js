"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDirectoryRequest = exports.uploadDirectory = exports.uploadLargeFileRequest = exports.uploadLargeFile = exports.uploadSmallFileRequest = exports.uploadSmallFile = exports.uploadFile = exports.DEFAULT_UPLOAD_OPTIONS = void 0;
const tus_js_client_1 = require("tus-js-client");
const file_1 = require("./utils/file");
const options_1 = require("./utils/options");
const format_1 = require("./skylink/format");
const client_1 = require("./client");
const validation_1 = require("./utils/validation");
/**
 * The tus chunk size is (4MiB - encryptionOverhead) * dataPieces, set in skyd.
 */
const TUS_CHUNK_SIZE = (1 << 22) * 10;
/**
 * A number indicating how many parts should be uploaded in parallel.
 */
const TUS_PARALLEL_UPLOADS = 2;
/**
 * The retry delays, in ms. Data is stored in skyd for up to 20 minutes, so the
 * total delays should not exceed that length of time.
 */
const DEFAULT_TUS_RETRY_DELAYS = [0, 5000, 15000, 60000, 300000, 600000];
/**
 * The portal file field name.
 */
const PORTAL_FILE_FIELD_NAME = "file";
/**
 * The portal directory file field name.
 */
const PORTAL_DIRECTORY_FILE_FIELD_NAME = "files[]";
exports.DEFAULT_UPLOAD_OPTIONS = {
    ...options_1.DEFAULT_BASE_OPTIONS,
    endpointUpload: "/skynet/skyfile",
    endpointLargeUpload: "/skynet/tus",
    customFilename: "",
    errorPages: undefined,
    largeFileSize: TUS_CHUNK_SIZE,
    retryDelays: DEFAULT_TUS_RETRY_DELAYS,
    tryFiles: undefined,
};
/**
 * Uploads a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointUpload="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact for small uploads.
 * @param [customOptions.endpointLargeUpload="/skynet/tus"] - The relative URL path of the portal endpoint to contact for large uploads.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
async function uploadFile(file, customOptions) {
    // Validation is done in `uploadFileRequest` or `uploadLargeFileRequest`.
    const opts = { ...exports.DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    if (file.size < opts.largeFileSize) {
        return this.uploadSmallFile(file, opts);
    }
    else {
        return this.uploadLargeFile(file, opts);
    }
}
exports.uploadFile = uploadFile;
/**
 * Uploads a small file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointUpload="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
async function uploadSmallFile(file, customOptions) {
    const response = await this.uploadSmallFileRequest(file, customOptions);
    // Sanity check.
    validateUploadResponse(response);
    const skylink = (0, format_1.formatSkylink)(response.data.skylink);
    return { skylink };
}
exports.uploadSmallFile = uploadSmallFile;
/**
 * Makes a request to upload a small file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 */
async function uploadSmallFileRequest(file, customOptions) {
    validateFile("file", file, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_UPLOAD_OPTIONS);
    const opts = { ...exports.DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const formData = new FormData();
    file = ensureFileObjectConsistency(file);
    if (opts.customFilename) {
        formData.append(PORTAL_FILE_FIELD_NAME, file, opts.customFilename);
    }
    else {
        formData.append(PORTAL_FILE_FIELD_NAME, file);
    }
    const response = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointUpload,
        method: "post",
        data: formData,
    });
    return response;
}
exports.uploadSmallFileRequest = uploadSmallFileRequest;
/* istanbul ignore next */
/**
 * Uploads a large file to Skynet using tus.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointLargeUpload="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
async function uploadLargeFile(file, customOptions) {
    // Validation is done in `uploadLargeFileRequest`.
    const response = await this.uploadLargeFileRequest(file, customOptions);
    // Sanity check.
    validateLargeUploadResponse(response);
    // Get the skylink.
    let skylink = response.headers["skynet-skylink"];
    // Format the skylink.
    skylink = (0, format_1.formatSkylink)(skylink);
    return { skylink };
}
exports.uploadLargeFile = uploadLargeFile;
/* istanbul ignore next */
/**
 * Makes a request to upload a file to Skynet.
 *
 * @param this - SkynetClient
 * @param file - The file to upload.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointLargeUpload="/skynet/tus"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 */
async function uploadLargeFileRequest(file, customOptions) {
    validateFile("file", file, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_UPLOAD_OPTIONS);
    const opts = { ...exports.DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    // TODO: Add back upload options once they are implemented in skyd.
    const url = await (0, client_1.buildRequestUrl)(this, opts.endpointLargeUpload);
    const headers = (0, client_1.buildRequestHeaders)(undefined, opts.customUserAgent, opts.customCookie);
    file = ensureFileObjectConsistency(file);
    let filename = file.name;
    if (opts.customFilename) {
        filename = opts.customFilename;
    }
    const onProgress = opts.onUploadProgress &&
        function (bytesSent, bytesTotal) {
            const progress = bytesSent / bytesTotal;
            // @ts-expect-error TS complains.
            opts.onUploadProgress(progress, { loaded: bytesSent, total: bytesTotal });
        };
    // Make an OPTIONS request to find out whether parallel uploads are supported.
    // TODO: Remove this once parallel uploads are fully supported and rolled-out.
    const resp = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointLargeUpload,
        method: "options",
    });
    let parallelUploads = 1;
    if (resp.headers["Tus-Extension"].contains("concatenation")) {
        parallelUploads = TUS_PARALLEL_UPLOADS;
    }
    return new Promise((resolve, reject) => {
        const tusOpts = {
            endpoint: url,
            chunkSize: TUS_CHUNK_SIZE,
            retryDelays: opts.retryDelays,
            metadata: {
                filename,
                filetype: file.type,
            },
            parallelUploads,
            headers,
            onProgress,
            onBeforeRequest: function (req) {
                const xhr = req.getUnderlyingObject();
                xhr.withCredentials = true;
            },
            onError: (error) => {
                // Return error body rather than entire error.
                // @ts-expect-error tus-client-js Error is not typed correctly.
                const res = error.originalResponse;
                const newError = res ? new Error(res.getBody().trim()) || error : error;
                reject(newError);
            },
            onSuccess: async () => {
                if (!upload.url) {
                    reject(new Error("'upload.url' was not set"));
                    return;
                }
                // Call HEAD to get the metadata, including the skylink.
                const resp = await this.executeRequest({
                    ...opts,
                    url: upload.url,
                    endpointPath: opts.endpointLargeUpload,
                    method: "head",
                    headers: { ...headers, "Tus-Resumable": "1.0.0" },
                });
                resolve(resp);
            },
        };
        const upload = new tus_js_client_1.Upload(file, tusOpts);
        upload.start();
    });
}
exports.uploadLargeFileRequest = uploadLargeFileRequest;
/**
 * Uploads a directory to Skynet.
 *
 * @param this - SkynetClient
 * @param directory - File objects to upload, indexed by their path strings.
 * @param filename - The name of the directory.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The returned skylink.
 * @throws - Will throw if the request is successful but the upload response does not contain a complete response.
 */
async function uploadDirectory(directory, filename, customOptions) {
    // Validation is done in `uploadDirectoryRequest`.
    const response = await this.uploadDirectoryRequest(directory, filename, customOptions);
    // Sanity check.
    validateUploadResponse(response);
    const skylink = (0, format_1.formatSkylink)(response.data.skylink);
    return { skylink };
}
exports.uploadDirectory = uploadDirectory;
/**
 * Makes a request to upload a directory to Skynet.
 *
 * @param this - SkynetClient
 * @param directory - File objects to upload, indexed by their path strings.
 * @param filename - The name of the directory.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/skynet/skyfile"] - The relative URL path of the portal endpoint to contact.
 * @returns - The upload response.
 * @throws - Will throw if the input filename is not a string.
 */
async function uploadDirectoryRequest(directory, filename, customOptions) {
    (0, validation_1.validateObject)("directory", directory, "parameter");
    (0, validation_1.validateString)("filename", filename, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", exports.DEFAULT_UPLOAD_OPTIONS);
    const opts = { ...exports.DEFAULT_UPLOAD_OPTIONS, ...this.customOptions, ...customOptions };
    const formData = new FormData();
    Object.entries(directory).forEach(([path, file]) => {
        file = ensureFileObjectConsistency(file);
        formData.append(PORTAL_DIRECTORY_FILE_FIELD_NAME, file, path);
    });
    const query = { filename };
    if (opts.tryFiles) {
        query.tryfiles = JSON.stringify(opts.tryFiles);
    }
    if (opts.errorPages) {
        query.errorpages = JSON.stringify(opts.errorPages);
    }
    const response = await this.executeRequest({
        ...opts,
        endpointPath: opts.endpointUpload,
        method: "post",
        data: formData,
        query,
    });
    return response;
}
exports.uploadDirectoryRequest = uploadDirectoryRequest;
/**
 * Sometimes file object might have had the type property defined manually with
 * Object.defineProperty and some browsers (namely firefox) can have problems
 * reading it after the file has been appended to form data. To overcome this,
 * we recreate the file object using native File constructor with a type defined
 * as a constructor argument.
 *
 * @param file - The input file.
 * @returns - The processed file.
 */
function ensureFileObjectConsistency(file) {
    return new File([file], file.name, { type: (0, file_1.getFileMimeType)(file) });
}
/**
 * Validates the given value as a file.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid file.
 */
function validateFile(name, value, valueKind) {
    if (!(value instanceof File)) {
        (0, validation_1.throwValidationError)(name, value, valueKind, "type 'File'");
    }
}
/**
 * Validates the upload response.
 *
 * @param response - The upload response.
 * @throws - Will throw if not a valid upload response.
 */
function validateUploadResponse(response) {
    try {
        if (!response.data) {
            throw new Error("response.data field missing");
        }
        (0, validation_1.validateString)("skylink", response.data.skylink, "upload response field");
    }
    catch (err) {
        throw new Error(`Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. ${err}`);
    }
}
/* istanbul ignore next */
/**
 * Validates the large upload response.
 *
 * @param response - The upload response.
 * @throws - Will throw if not a valid upload response.
 */
function validateLargeUploadResponse(response) {
    try {
        if (!response.headers) {
            throw new Error("response.headers field missing");
        }
        (0, validation_1.validateString)('response.headers["skynet-skylink"]', response.headers["skynet-skylink"], "upload response field");
    }
    catch (err) {
        throw new Error(`Did not get a complete upload response despite a successful request. Please try again and report this issue to the devs if it persists. Error: ${err}`);
    }
}
