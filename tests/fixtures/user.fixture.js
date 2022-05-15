const mongoose = require('mongoose');
const faker = require('faker');
const User = require('../../src/models/user.model');

const userOne = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  address: faker.finance.ethereumAddress().toLowerCase(),
  role: 'user',
  isAddressVerified: false,
};

const userTwo = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  address: faker.finance.ethereumAddress().toLowerCase(),
  role: 'user',
  isAddressVerified: false,
};

const admin = {
  _id: mongoose.Types.ObjectId(),
  name: faker.name.findName(),
  address: faker.finance.ethereumAddress().toLowerCase(),
  role: 'admin',
  isAddressVerified: false,
};

const insertUsers = async (users) => {
  await User.insertMany(users.map((user) => ({ ...user })));
};

module.exports = {
  userOne,
  userTwo,
  admin,
  insertUsers,
};
