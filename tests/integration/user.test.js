const request = require('supertest');
const faker = require('faker');
const httpStatus = require('http-status');
const app = require('../../src/app');
const setupTestDB = require('../utils/setupTestDB');
const { User } = require('../../src/models');
const { userOne, userTwo, admin, insertUsers } = require('../fixtures/user.fixture');
const { userOneAccessToken, adminAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

describe('User routes', () => {
  describe('POST /v1/users', () => {
    let newUser;

    beforeEach(() => {
      newUser = {
        name: faker.name.findName(),
        address: faker.finance.ethereumAddress(),
        role: 'user',
      };
    });

    test('should return 201 and successfully create new user if data is ok', async () => {
      await insertUsers([admin]);

      const res = await request(app).post('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: newUser.name,
        address: newUser.address.toLowerCase(),
        role: newUser.role,
        isAddressVerified: false,
      });

      const dbUser = await User.findOne({ address: res.body.address });
      expect(dbUser).toBeDefined();
      expect(dbUser).toMatchObject({ name: newUser.name, address: newUser.address.toLowerCase(), role: newUser.role, isAddressVerified: false });
    });

    test('should be able to create an admin as well', async () => {
      await insertUsers([admin]);
      newUser.role = 'admin';

      const res = await request(app).post('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.CREATED);

      expect(res.body.role).toBe('admin');

      const dbUser = await User.findOne({ address: res.body.address });
      expect(dbUser.role).toBe('admin');
    });

    test('should return 401 error if access token is missing', async () => {
      await request(app).post('/v1/users').send(newUser).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if logged in user is not admin', async () => {
      await insertUsers([userOne]);

      await request(app).post('/v1/users').set('Authorization', `Bearer ${userOneAccessToken}`).send(newUser).expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 error if address is invalid', async () => {
      await insertUsers([admin]);
      newUser.address = 'invalidAddress';

      await request(app).post('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if address is already used', async () => {
      await insertUsers([admin, userOne]);
      newUser.address = userOne.address;

      await request(app).post('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 error if role is neither user nor admin', async () => {
      await insertUsers([admin]);
      newUser.role = 'invalid';

      await request(app).post('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send(newUser).expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/users', () => {
    test('should return 200 and apply the default query options', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app).get('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0]).toEqual({
        id: userOne._id.toHexString(),
        name: userOne.name,
        address: userOne.address,
        role: userOne.role,
        isAddressVerified: userOne.isAddressVerified,
      });
    });

    test('should return 401 if access token is missing', async () => {
      await insertUsers([userOne, userTwo, admin]);

      await request(app).get('/v1/users').send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if a non-admin is trying to access all users', async () => {
      await insertUsers([userOne, userTwo, admin]);

      await request(app).get('/v1/users').set('Authorization', `Bearer ${userOneAccessToken}`).send().expect(httpStatus.OK);
    });

    test('should correctly apply filter on name field', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ name: userOne.name })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 1,
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].id).toBe(userOne._id.toHexString());
    });

    test('should correctly apply filter on role field', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app).get('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).query({ role: 'user' }).send().expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 2,
      });
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].id).toBe(userOne._id.toHexString());
      expect(res.body.results[1].id).toBe(userTwo._id.toHexString());
    });

    test('should correctly sort the returned array if descending sort param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:desc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].id).toBe(userOne._id.toHexString());
      expect(res.body.results[1].id).toBe(userTwo._id.toHexString());
      expect(res.body.results[2].id).toBe(admin._id.toHexString());
    });

    test('should correctly sort the returned array if ascending sort param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:asc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].id).toBe(admin._id.toHexString());
      expect(res.body.results[1].id).toBe(userOne._id.toHexString());
      expect(res.body.results[2].id).toBe(userTwo._id.toHexString());
    });

    test('should correctly sort the returned array if multiple sorting criteria are specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ sortBy: 'role:desc,name:asc' })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(3);

      const expectedOrder = [userOne, userTwo, admin].sort((a, b) => {
        if (a.role < b.role) {
          return 1;
        }
        if (a.role > b.role) {
          return -1;
        }
        return a.name < b.name ? -1 : 1;
      });

      expectedOrder.forEach((user, index) => {
        expect(res.body.results[index].id).toBe(user._id.toHexString());
      });
    });

    test('should limit returned array if limit param is specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app).get('/v1/users').set('Authorization', `Bearer ${adminAccessToken}`).query({ limit: 2 }).send().expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 2,
        totalPages: 2,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].id).toBe(userOne._id.toHexString());
      expect(res.body.results[1].id).toBe(userTwo._id.toHexString());
    });

    test('should return the correct page if page and limit params are specified', async () => {
      await insertUsers([userOne, userTwo, admin]);

      const res = await request(app)
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .query({ page: 2, limit: 2 })
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 2,
        limit: 2,
        totalPages: 2,
        totalResults: 3,
      });
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].id).toBe(admin._id.toHexString());
    });
  });

  describe('GET /v1/users/:address', () => {
    test('should return 200 and the user object if data is ok', async () => {
      await insertUsers([userOne]);

      const res = await request(app).get(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${userOneAccessToken}`).send();

      expect(res.body).toEqual({
        id: userOne._id.toHexString(),
        address: userOne.address,
        name: userOne.name,
        role: userOne.role,
        isAddressVerified: userOne.isAddressVerified,
      });
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);

      await request(app).get(`/v1/users/${userOne.address}`).send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is trying to get another user', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app).get(`/v1/users/${userTwo.address}`).set('Authorization', `Bearer ${userOneAccessToken}`).send().expect(httpStatus.OK);
    });

    test('should return 200 and the user object if admin is trying to get another user', async () => {
      await insertUsers([userOne, admin]);

      await request(app).get(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.OK);
    });

    test('should return 400 error if address is not a valid address', async () => {
      await insertUsers([admin]);

      await request(app).get('/v1/users/invalidId').set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 error if user is not found', async () => {
      await insertUsers([admin]);

      await request(app).get(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /v1/users/:address', () => {
    test('should return 204 if data is ok', async () => {
      await insertUsers([userOne]);

      await request(app).delete(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${userOneAccessToken}`).send().expect(httpStatus.NO_CONTENT);

      const dbUser = await User.findOne({ address: userOne.address });
      expect(dbUser).toBeNull();
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);

      await request(app).delete(`/v1/users/${userOne.address}`).send().expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 error if user is trying to delete another user', async () => {
      await insertUsers([userOne, userTwo]);

      await request(app).delete(`/v1/users/${userTwo.address}`).set('Authorization', `Bearer ${userOneAccessToken}`).send().expect(httpStatus.FORBIDDEN);
    });

    test('should return 204 if admin is trying to delete another user', async () => {
      await insertUsers([userOne, admin]);

      await request(app).delete(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.NO_CONTENT);
    });

    test('should return 400 error if address is not a valid mongo id', async () => {
      await insertUsers([admin]);

      await request(app).delete('/v1/users/invalidId').set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 error if user already is not found', async () => {
      await insertUsers([admin]);

      await request(app).delete(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send().expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /v1/users/:address', () => {
    test('should return 200 and successfully update user if data is ok', async () => {
      await insertUsers([userOne]);
      const updateBody = {
        name: faker.name.findName(),
      };

      const res = await request(app)
        .patch(`/v1/users/${userOne.address}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: userOne._id.toHexString(),
        name: updateBody.name,
        address: userOne.address,
        role: 'user',
        isAddressVerified: false,
      });

      const dbUser = await User.findOne({ address: userOne.address.toLowerCase() });
      expect(dbUser).toBeDefined();
      expect(dbUser).toMatchObject({ name: updateBody.name, address: userOne.address, role: 'user' });
    });

    test('should return 401 error if access token is missing', async () => {
      await insertUsers([userOne]);
      const updateBody = { name: faker.name.findName() };

      await request(app).patch(`/v1/users/${userOne.address}`).send(updateBody).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is updating another user', async () => {
      await insertUsers([userOne, userTwo]);
      const updateBody = { name: faker.name.findName() };

      await request(app)
        .patch(`/v1/users/${userTwo.address}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 200 and successfully update user if admin is updating another user', async () => {
      await insertUsers([userOne, admin]);
      const updateBody = { name: faker.name.findName() };

      await request(app).patch(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send(updateBody).expect(httpStatus.OK);
    });

    test('should return 404 if admin is updating another user that is not found', async () => {
      await insertUsers([admin]);
      const updateBody = { name: faker.name.findName() };

      await request(app).patch(`/v1/users/${userOne.address}`).set('Authorization', `Bearer ${adminAccessToken}`).send(updateBody).expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 error if address is not a valid mongo id', async () => {
      await insertUsers([admin]);
      const updateBody = { name: faker.name.findName() };

      await request(app).patch(`/v1/users/invalidId`).set('Authorization', `Bearer ${adminAccessToken}`).send(updateBody).expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if address is invalid', async () => {
      await insertUsers([userOne]);
      const updateBody = { address: 'invalidAddress' };

      await request(app)
        .patch(`/v1/users/${userOne.address}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if address is already taken', async () => {
      await insertUsers([userOne, userTwo]);
      const updateBody = { address: userTwo.address };

      await request(app)
        .patch(`/v1/users/${userOne.address}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});
