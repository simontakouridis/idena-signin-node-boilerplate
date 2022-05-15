const { isValidAddress } = require('ethereumjs-util');

const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const validateAddress = (value, helpers) => {
  if (!isValidAddress(value)) {
    return helpers.message('"{{#label}}" must be a valid address');
  }
  return value;
};

module.exports = {
  objectId,
  validateAddress,
};
