const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isAddressTaken(userBody.address)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Address already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.address && (await User.isAddressTaken(updateBody.address, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Address already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

/**
 * Get user by address
 * @param {string} address
 * @returns {Promise<User>}
 */
const getUserByAddress = async (address) => {
  return User.findOne({ address });
};

/**
 * Update user by address
 * @param {string} address
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserByAddress = async (address, updateBody) => {
  const user = await getUserByAddress(address);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.address && (await User.isAddressTaken(updateBody.address))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Address already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by address
 * @param {ObjectId} address
 * @returns {Promise<User>}
 */
const deleteUserByAddress = async (address) => {
  const user = await getUserByAddress(address);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getUserByAddress,
  updateUserByAddress,
  deleteUserByAddress,
};
