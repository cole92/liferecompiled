/* eslint-disable no-undef */
const functions = require("firebase-functions");
const cloudinary = require("cloudinary").v2;

cloudinary.config(functions.config().cloudinary);

module.exports = cloudinary;
