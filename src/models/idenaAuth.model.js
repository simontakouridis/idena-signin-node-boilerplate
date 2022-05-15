const mongoose = require('mongoose');
const { isValidAddress } = require('ethereumjs-util');
const { toJSON } = require('./plugins');
const { idenaAuthStatusTypes } = require('../config/idenaAuth');

const idenaAuthSchema = mongoose.Schema(
  {
    idenaAuthToken: {
      type: String,
      required: true,
      index: { unique: true },
    },
    userAddress: {
      type: String,
      required: true,
      trim: true,
      validate(value) {
        if (!isValidAddress(value)) {
          throw new Error('Invalid checksum address');
        }
      },
    },
    nonce: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [idenaAuthStatusTypes.ISSUED, idenaAuthStatusTypes.SUCCESS, idenaAuthStatusTypes.FAIL, idenaAuthStatusTypes.CONSUMED],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
idenaAuthSchema.plugin(toJSON);

/**
 * Check if token expired
 * @returns {Promise<boolean>}
 */
idenaAuthSchema.methods.isTokenExpired = async function () {
  const idenaAuthDoc = this;
  return new Date(idenaAuthDoc.expires).getTime() < new Date().getTime();
};

/**
 * @typedef IdenaAuth
 */
const IdenaAuth = mongoose.model('IdenaAuth', idenaAuthSchema);

module.exports = IdenaAuth;
