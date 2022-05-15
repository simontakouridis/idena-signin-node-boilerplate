const request = require('supertest');
const httpStatus = require('http-status');
const httpMocks = require('node-mocks-http');
const moment = require('moment');
const app = require('../../src/app');
const config = require('../../src/config/config');
const auth = require('../../src/middlewares/auth');
const { tokenService } = require('../../src/services');
const ApiError = require('../../src/utils/ApiError');
const setupTestDB = require('../utils/setupTestDB');
const { Token } = require('../../src/models');
const { roleRights } = require('../../src/config/roles');
const { tokenTypes } = require('../../src/config/tokens');
const { userOne, admin, insertUsers } = require('../fixtures/user.fixture');
const { idenaAuthSuccess, idenaAuthIssued, insertIdenaAuths } = require('../fixtures/idenaAuth.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('Auth routes', () => {
  describe('POST /v1/auth/start-session', () => {
    test('should return 200 and nonce', async () => {
      const requestBody = {
        token: '428489af-3ca1-4861-b1c7-5f634f6466e2',
        address: '0xFf893698faC953dBbCdC3276e8aD13ed3267fB06',
      };

      const res = await request(app).post('/v1/auth/start-session').send(requestBody).expect(httpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        data: {
          nonce: expect.anything(),
        },
      });
      expect(res.body.data.nonce).toMatch(/^signin-?/);
    });

    test('should return 400 error if the address is unrecognized', async () => {
      const requestBody = {
        token: '428489af-3ca1-4861-b1c7-5f634f6466e2',
        address: 'invalidAddress',
      };

      const res = await request(app).post('/v1/auth/start-session').send(requestBody).expect(httpStatus.BAD_REQUEST);

      expect(res.body).toEqual({ code: httpStatus.BAD_REQUEST, message: '""address"" must be a valid address' });
    });
  });

  describe('POST /v1/auth/authenticate', () => {
    test('should return 200 and success', async () => {
      await insertIdenaAuths([idenaAuthIssued]);
      const requestBody = {
        token: idenaAuthIssued.idenaAuthToken,
        signature: '0xce301a22ea888f6c60c01ac4e9ea65a817036b76ab1cb625917d9cceda19a5541628691c8981647e2deb4c2f74c68b1d8875cffbb68cfeb38eca26bcb82b488300',
      };

      const res = await request(app).post('/v1/auth/authenticate').send(requestBody).expect(httpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        data: {
          authenticated: true,
        },
      });
    });

    test('should return 200 and success, authenticated false', async () => {
      await insertIdenaAuths([idenaAuthIssued]);
      const requestBody = {
        token: idenaAuthIssued.idenaAuthToken,
        signature: '0xe0434ea8ff5123a570b6b7e5f1b837af4524372d4552021bfcede66219abe00c376a8c8417299be23938b9644ba922ffd36bbbdd1cdf15719da9b2af9affdec601',
      };

      const res = await request(app).post('/v1/auth/authenticate').send(requestBody).expect(httpStatus.OK);

      expect(res.body).toEqual({
        success: true,
        data: {
          authenticated: false,
        },
      });
    });

    test('should return 200 OK if the signature is unrecognized', async () => {
      await insertIdenaAuths([idenaAuthIssued]);
      const requestBody = {
        token: idenaAuthIssued.idenaAuthToken,
        signature: 'unrecognixedSignature',
      };

      const res = await request(app).post('/v1/auth/authenticate').send(requestBody).expect(httpStatus.BAD_REQUEST);

      expect(res.body).toEqual({ code: httpStatus.BAD_REQUEST, message: 'Error with signature verification' });
    });

    test('should return 401 error if the token is unrecognized', async () => {
      const requestBody = {
        token: '428489af-3ca1-4861-b1c7-5f634f6466e2',
        signature: '0xe0434ea8ff5123a570b6b7e5f1b837af4524372d4552021bfcede66219abe00c376a8c8417299be23938b9644ba922ffd36bbbdd1cdf15719da9b2af9affdec601',
      };

      const res = await request(app).post('/v1/auth/authenticate').send(requestBody).expect(httpStatus.BAD_REQUEST);

      expect(res.body).toEqual({ code: httpStatus.BAD_REQUEST, message: 'Incorrect or expired token' });
    });
  });

  describe('POST /v1/auth/login', () => {
    test('should return 200 and login user if token matches', async () => {
      await insertIdenaAuths([idenaAuthSuccess]);
      const loginCredentials = {
        idenaAuthToken: idenaAuthSuccess.idenaAuthToken,
      };

      const res = await request(app).post('/v1/auth/login').send(loginCredentials).expect(httpStatus.OK);

      expect(res.body.user).toEqual({
        id: expect.anything(),
        name: 'unnamed',
        address: idenaAuthSuccess.userAddress.toLowerCase(),
        role: 'user',
        isAddressVerified: true,
      });

      expect(res.body.tokens).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() },
      });
    });

    test('should return 401 error if the idenaAuthToken is unrecognized', async () => {
      const loginCredentials = {
        idenaAuthToken: idenaAuthSuccess.idenaAuthToken,
      };

      const res = await request(app).post('/v1/auth/login').send(loginCredentials).expect(httpStatus.UNAUTHORIZED);

      expect(res.body).toEqual({ code: httpStatus.UNAUTHORIZED, message: 'Incorrect or expired token' });
    });
  });

  describe('POST /v1/auth/logout', () => {
    test('should return 204 if refresh token is valid', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/logout').send({ refreshToken }).expect(httpStatus.NO_CONTENT);

      const dbRefreshTokenDoc = await Token.findOne({ token: refreshToken });
      expect(dbRefreshTokenDoc).toBe(null);
    });

    test('should return 400 error if refresh token is missing from request body', async () => {
      await request(app).post('/v1/auth/logout').send().expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 error if refresh token is not found in the database', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/logout').send({ refreshToken }).expect(httpStatus.NOT_FOUND);
    });

    test('should return 404 error if refresh token is blacklisted', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH, true);

      await request(app).post('/v1/auth/logout').send({ refreshToken }).expect(httpStatus.NOT_FOUND);
    });
  });

  describe('POST /v1/auth/refresh-tokens', () => {
    test('should return 200 and new auth tokens if refresh token is valid', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      const res = await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.OK);

      expect(res.body).toEqual({
        access: { token: expect.anything(), expires: expect.anything() },
        refresh: { token: expect.anything(), expires: expect.anything() },
      });

      const dbRefreshTokenDoc = await Token.findOne({ token: res.body.refresh.token });
      expect(dbRefreshTokenDoc).toMatchObject({ type: tokenTypes.REFRESH, user: userOne._id, blacklisted: false });

      const dbRefreshTokenCount = await Token.countDocuments();
      expect(dbRefreshTokenCount).toBe(1);
    });

    test('should return 400 error if refresh token is missing from request body', async () => {
      await request(app).post('/v1/auth/refresh-tokens').send().expect(httpStatus.BAD_REQUEST);
    });

    test('should return 401 error if refresh token is signed using an invalid secret', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH, 'invalidSecret');
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 error if refresh token is not found in the database', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 error if refresh token is blacklisted', async () => {
      await insertUsers([userOne]);
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH, true);

      await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 error if refresh token is expired', async () => {
      await insertUsers([userOne]);
      const expires = moment().subtract(1, 'minutes');
      const refreshToken = tokenService.generateToken(userOne._id, expires);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 401 error if user is not found', async () => {
      const expires = moment().add(config.jwt.refreshExpirationDays, 'days');
      const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
      await tokenService.saveToken(refreshToken, userOne._id, expires, tokenTypes.REFRESH);

      await request(app).post('/v1/auth/refresh-tokens').send({ refreshToken }).expect(httpStatus.UNAUTHORIZED);
    });
  });
});

describe('Auth middleware', () => {
  test('should call next with no errors if access token is valid', async () => {
    await insertUsers([userOne]);
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${userOneAccessToken}` } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user._id).toEqual(userOne._id);
  });

  test('should call next with unauthorized error if access token is not found in header', async () => {
    await insertUsers([userOne]);
    const req = httpMocks.createRequest();
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with unauthorized error if access token is not a valid jwt token', async () => {
    await insertUsers([userOne]);
    const req = httpMocks.createRequest({ headers: { Authorization: 'Bearer randomToken' } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with unauthorized error if the token is not an access token', async () => {
    await insertUsers([userOne]);
    const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const refreshToken = tokenService.generateToken(userOne._id, expires, tokenTypes.REFRESH);
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${refreshToken}` } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with unauthorized error if access token is generated with an invalid secret', async () => {
    await insertUsers([userOne]);
    const expires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = tokenService.generateToken(userOne._id, expires, tokenTypes.ACCESS, 'invalidSecret');
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with unauthorized error if access token is expired', async () => {
    await insertUsers([userOne]);
    const expires = moment().subtract(1, 'minutes');
    const accessToken = tokenService.generateToken(userOne._id, expires, tokenTypes.ACCESS);
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${accessToken}` } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with unauthorized error if user is not found', async () => {
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${userOneAccessToken}` } });
    const next = jest.fn();

    await auth()(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.UNAUTHORIZED, message: 'Please authenticate' }));
  });

  test('should call next with forbidden error if user does not have required rights and address is not in params', async () => {
    await insertUsers([userOne]);
    const req = httpMocks.createRequest({ headers: { Authorization: `Bearer ${userOneAccessToken}` } });
    const next = jest.fn();

    await auth('anyRight')(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: httpStatus.FORBIDDEN, message: 'Forbidden' }));
  });

  test('should call next with no errors if user does not have required rights but address is in params', async () => {
    await insertUsers([userOne]);
    const req = httpMocks.createRequest({
      headers: { Authorization: `Bearer ${userOneAccessToken}` },
      params: { address: userOne.address },
    });
    const next = jest.fn();

    await auth('anyRight')(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });

  test('should call next with no errors if user has required rights', async () => {
    await insertUsers([admin]);
    const req = httpMocks.createRequest({
      headers: { Authorization: `Bearer ${adminAccessToken}` },
      params: { address: userOne.address },
    });
    const next = jest.fn();

    await auth(...roleRights.get('admin'))(req, httpMocks.createResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
