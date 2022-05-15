const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { authService, tokenService } = require('../services');

const login = catchAsync(async (req, res) => {
  const { idenaAuthToken } = req.body;
  const user = await authService.loginUserWithToken(idenaAuthToken);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const startSession = catchAsync(async (req, res) => {
  const { token: idenaAuthToken, address } = req.body;
  const nonce = await authService.startSession(idenaAuthToken, address);
  res.send({ success: true, data: { nonce } });
});

const authenticate = catchAsync(async (req, res) => {
  const { token: idenaAuthToken, signature } = req.body;
  const { userAddress, nonce } = await authService.getIdenaAuthDoc(idenaAuthToken);
  const authenticated = authService.verifyAuthenticated(nonce, userAddress, signature);
  await authService.updateIdenaAuthDoc(idenaAuthToken, authenticated);
  res.send({ success: true, data: { authenticated } });
});

module.exports = {
  login,
  logout,
  refreshTokens,
  startSession,
  authenticate,
};
