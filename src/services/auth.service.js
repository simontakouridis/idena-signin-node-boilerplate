const httpStatus = require('http-status');
const { bufferToHex, ecrecover, fromRpcSig, keccak256, pubToAddress } = require('ethereumjs-util');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const IdenaAuth = require('../models/idenaAuth.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { idenaAuthStatusTypes, idenaAuthExpiresMinutes } = require('../config/idenaAuth');

/**
 * Login with idenaAuthToken
 * @param {string} idenaAuthToken
 * @returns {Promise<User>}
 */
const loginUserWithToken = async (idenaAuthToken) => {
  try {
    const idenaAuthDoc = await IdenaAuth.findOne({ idenaAuthToken, status: idenaAuthStatusTypes.SUCCESS });
    if (!idenaAuthDoc || (await idenaAuthDoc.isTokenExpired())) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect or expired token');
    }
    idenaAuthDoc.status = idenaAuthStatusTypes.CONSUMED;
    await idenaAuthDoc.save();

    let user = await userService.getUserByAddress(idenaAuthDoc.userAddress);
    if (!user) {
      user = await userService.createUser({
        name: 'unnamed',
        address: idenaAuthDoc.userAddress,
        role: 'user',
        isAddressVerified: true,
      });
    }
    return user;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.BAD_REQUEST, `Error with login: ${error}`);
  }
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Start Session
 * @param {string} idenaAuthToken
 * @param {string} address
 * @returns {Promise<string>}
 */
const startSession = async (idenaAuthToken, userAddress) => {
  const nonce = `signin-${uuidv4()}`;
  const idenaAuthTokenExpires = moment().add(idenaAuthExpiresMinutes, 'minutes');
  try {
    await IdenaAuth.create({
      idenaAuthToken,
      userAddress,
      nonce,
      expires: idenaAuthTokenExpires.toDate(),
      status: idenaAuthStatusTypes.ISSUED,
    });
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Error with idena authentication');
  }
  return nonce;
};

/**
 * Get idenaAuthDoc
 * @param {string} idenaAuthToken
 * @returns {Promise}
 */
const getIdenaAuthDoc = async (idenaAuthToken) => {
  let idenaAuthDoc;

  try {
    idenaAuthDoc = await IdenaAuth.findOne({ idenaAuthToken, status: idenaAuthStatusTypes.ISSUED });
    if (!idenaAuthDoc || (await idenaAuthDoc.isTokenExpired())) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Incorrect or expired token');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.BAD_REQUEST, `Error with getting idena session: ${error}`);
  }
  return idenaAuthDoc;
};

/**
 * Verify Authenticated
 * @param {string} nonce
 * @param {string} address
 * @param {string} signature
 * @returns {bool}
 */
const verifyAuthenticated = (nonce, address, signature) => {
  try {
    const nonceHash = keccak256(keccak256(Buffer.from(nonce, 'utf-8')));
    const { v, r, s } = fromRpcSig(signature);
    const pubKey = ecrecover(nonceHash, v, r, s);
    const addrBuf = pubToAddress(pubKey);
    const signatureAddress = bufferToHex(addrBuf);
    return signatureAddress === address;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Error with signature verification');
  }
};

/**
 * Update idenaAuthDoc
 * @param {string} idenaAuthToken
 * @returns {Promise}
 */
const updateIdenaAuthDoc = async (idenaAuthToken, authenticated) => {
  try {
    await IdenaAuth.updateOne({ idenaAuthToken }, { status: authenticated ? idenaAuthStatusTypes.SUCCESS : idenaAuthStatusTypes.FAIL });
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Error with updating idena session.');
  }
};

module.exports = {
  loginUserWithToken,
  logout,
  refreshAuth,
  startSession,
  getIdenaAuthDoc,
  verifyAuthenticated,
  updateIdenaAuthDoc,
};
