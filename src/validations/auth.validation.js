const Joi = require('joi');
const { validateAddress } = require('./custom.validation');

const login = {
  body: Joi.object().keys({
    idenaAuthToken: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const startSession = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    address: Joi.string().required().custom(validateAddress),
  }),
};

const authenticate = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    signature: Joi.string().required(),
  }),
};

module.exports = {
  login,
  logout,
  refreshTokens,
  startSession,
  authenticate,
};
