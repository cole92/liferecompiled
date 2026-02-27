/* eslint-env node */
/* global require, process, module */
const cloudinary = require("cloudinary").v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const missing = [];
if (!cloudName) missing.push("CLOUDINARY_CLOUD_NAME");
if (!apiKey) missing.push("CLOUDINARY_API_KEY");
if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");

if (missing.length) {
  throw new Error(`[CF] Missing Cloudinary env vars: ${missing.join(", ")}`);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = cloudinary;
