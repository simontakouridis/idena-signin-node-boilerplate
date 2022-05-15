const Joi = require('joi');
const { validateAddress } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    address: Joi.string().required().custom(validateAddress),
    name: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    address: Joi.string().required().custom(validateAddress),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    address: Joi.string().required().custom(validateAddress),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    address: Joi.string().required().custom(validateAddress),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
