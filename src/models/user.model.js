const mongoose = require('mongoose');
const { isValidAddress } = require('ethereumjs-util');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!isValidAddress(value)) {
          throw new Error('Invalid address');
        }
      },
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    isAddressVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

/**
 * Check if address is taken
 * @param {string} address - The user's address
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isAddressTaken = async function (address, excludeUserId) {
  const user = await this.findOne({ address, ...(excludeUserId && { _id: { $ne: excludeUserId } }) });
  return !!user;
};

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
