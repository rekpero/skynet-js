/* istanbul ignore file */
// Main exports.
export { SkynetClient } from "./client";
export { HASH_LENGTH, deriveChildSeed, genKeyPairAndSeed, genKeyPairFromSeed } from "./crypto";
export { getSkylinkUrlForPortal } from "./download";
export { getEntryUrlForPortal, signEntry } from "./registry";
export { DacLibrary, MAX_ENTRY_LENGTH, MySky, MYSKY_DOMAIN, mySkyDomain, MYSKY_DEV_DOMAIN, mySkyDevDomain, } from "./mysky";
export { deriveEncryptedFileKeyEntropy, deriveEncryptedFileSeed, deriveEncryptedFileTweak, ENCRYPTION_PATH_SEED_LENGTH, } from "./mysky/encrypted_files";
export { deriveDiscoverableFileTweak } from "./mysky/tweak";
export { convertSkylinkToBase32, convertSkylinkToBase64 } from "./skylink/format";
export { parseSkylink } from "./skylink/parse";
export { isSkylinkV1, isSkylinkV2 } from "./skylink/sia";
export { getRelativeFilePath, getRootDirectory } from "./utils/file";
export { MAX_REVISION } from "./utils/number";
export { stringToUint8ArrayUtf8, uint8ArrayToStringUtf8 } from "./utils/string";
export { defaultPortalUrl, DEFAULT_SKYNET_PORTAL_URL, defaultSkynetPortalUrl, extractDomainForPortal, getFullDomainUrlForPortal, URI_HANDSHAKE_PREFIX, uriHandshakePrefix, URI_SKYNET_PREFIX, uriSkynetPrefix, } from "./utils/url";
// Re-export Permission API.
export { Permission, PermCategory, PermType, PermRead, PermWrite, PermHidden, PermDiscoverable, PermLegacySkyID, } from "skynet-mysky-utils";
