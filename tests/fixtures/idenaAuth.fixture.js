const mongoose = require('mongoose');
const faker = require('faker');
const moment = require('moment');
const IdenaAuth = require('../../src/models/idenaAuth.model');
const { idenaAuthStatusTypes, idenaAuthExpiresMinutes } = require('../../src/config/idenaAuth');

const idenaAuthIssued = {
  _id: mongoose.Types.ObjectId(),
  idenaAuthToken: 'e56513c6-ffb6-4b97-95db-59e72cf12a64',
  userAddress: '0x0f28f51f0cea481a5e52c00f88109ebb4f793009',
  nonce: 'signin-b5c1378f-daba-465a-8992-1513ec723de9',
  expires: moment().add(idenaAuthExpiresMinutes, 'minutes').toDate(),
  status: idenaAuthStatusTypes.ISSUED,
};

const idenaAuthSuccess = {
  _id: mongoose.Types.ObjectId(),
  idenaAuthToken: '428489af-3ca1-4861-b1c7-5f634f6466e2',
  userAddress: '0xFf893698faC953dBbCdC3276e8aD13ed3267fB06',
  nonce: `signin-${faker.datatype.uuid()}`,
  expires: moment().add(idenaAuthExpiresMinutes, 'minutes').toDate(),
  status: idenaAuthStatusTypes.SUCCESS,
};

const idenaAuthFail = {
  _id: mongoose.Types.ObjectId(),
  idenaAuthToken: '428489af-3ca1-4861-b1c7-5f634f6466e2',
  userAddress: '0xFf893698faC953dBbCdC3276e8aD13ed3267fB06',
  nonce: `signin-${faker.datatype.uuid()}`,
  expires: moment().add(idenaAuthExpiresMinutes, 'minutes').toDate(),
  status: idenaAuthStatusTypes.FAIL,
};

const idenaAuthConsumed = {
  _id: mongoose.Types.ObjectId(),
  idenaAuthToken: '428489af-3ca1-4861-b1c7-5f634f6466e2',
  userAddress: '0xFf893698faC953dBbCdC3276e8aD13ed3267fB06',
  nonce: `signin-${faker.datatype.uuid()}`,
  expires: moment().add(idenaAuthExpiresMinutes, 'minutes').toDate(),
  status: idenaAuthStatusTypes.CONSUMED,
};

const insertIdenaAuths = async (idenaAuths) => {
  await IdenaAuth.insertMany(idenaAuths.map((idenaAuth) => ({ ...idenaAuth })));
};

module.exports = {
  idenaAuthIssued,
  idenaAuthSuccess,
  idenaAuthFail,
  idenaAuthConsumed,
  insertIdenaAuths,
};
