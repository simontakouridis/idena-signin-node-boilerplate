const faker = require('faker');
const { User } = require('../../../src/models');

describe('User model', () => {
  describe('User validation', () => {
    let newUser;
    beforeEach(() => {
      newUser = {
        name: faker.name.findName(),
        address: faker.finance.ethereumAddress().toLowerCase(),
        role: 'user',
      };
    });

    test('should correctly validate a valid user', async () => {
      await expect(new User(newUser).validate()).resolves.toBeUndefined();
    });

    test('should throw a validation error if address is invalid', async () => {
      newUser.address = 'invalidAddress';
      await expect(new User(newUser).validate()).rejects.toThrow();
    });
  });
});
