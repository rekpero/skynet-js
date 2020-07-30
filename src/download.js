/* eslint-disable no-unused-vars */

import axios from "axios";

import { SkynetClient } from "./client.js";
import { addUrlQuery, defaultOptions, makeUrl, parseSkylink, trimUriPrefix, uriHandshakePrefix } from "./utils.js";

const defaultDownloadOptions = {
  ...defaultOptions("/"),
};
const defaultDownloadHnsOptions = {
  ...defaultOptions("/hns"),
};

/**
 * Initiates a download of the content at the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.download = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions, download: true };
  const url = this.getDownloadUrl(skylink, opts);

  window.open(url, "_blank");
};

SkynetClient.prototype.downloadHns = async function (hns, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...customOptions };
};

SkynetClient.prototype.downloadHnsres = async function (hnsres, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...customOptions };
};

SkynetClient.prototype.getDownloadUrl = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };
  const query = opts.download ? { attachment: true } : {};

  let url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink));
  url = addUrlQuery(url, query);
  return url;
};

SkynetClient.prototype.metadata = async function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };

  throw new Error("Unimplemented");
};

/**
 * Opens the content at the skylink within the browser.
 * @param {string} skylink - 46 character skylink.
 * @param {Object} [customOptions={}] - Additional settings that can optionally be set.
 * @param {string} [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 */
SkynetClient.prototype.open = function (skylink, customOptions = {}) {
  const opts = { ...defaultDownloadOptions, ...customOptions };
  const url = makeUrl(this.portalUrl, opts.endpointPath, parseSkylink(skylink));

  window.open(url, "_blank");
};

SkynetClient.prototype.openHns = async function (hns, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...customOptions };

  hns = trimUriPrefix(hns, uriHandshakePrefix);

  // Get the skylink from the hns domain on the portal.
  const url = makeUrl(this.portalUrl, opts.endpointPath, hns);
  const response = await axios.get(url);
  const skylink = response.data.skylink;

  this.open(skylink, customOptions);
};

SkynetClient.prototype.openHnsres = async function (hnsres, customOptions = {}) {
  const opts = { ...defaultDownloadHnsOptions, ...customOptions };
};
