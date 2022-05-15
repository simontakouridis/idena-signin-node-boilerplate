const express = require('express');
const validate = require('../../middlewares/validate');
const authValidation = require('../../validations/auth.validation');
const authController = require('../../controllers/auth.controller');
const { lowercaseAddress } = require('../../middlewares/user');

const router = express.Router();

router.post('/login', validate(authValidation.login), authController.login);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
router.post('/start-session', validate(authValidation.startSession), lowercaseAddress, authController.startSession);
router.post('/authenticate', validate(authValidation.authenticate), authController.authenticate);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idenaAuthToken
 *             properties:
 *               idenaAuthToken:
 *                 type: string
 *             example:
 *               address: 428489af-3ca1-4861-b1c7-5f634f6466e2
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       "401":
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 401
 *               message: Invalid token
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZWJhYzUzNDk1NGI1NDEzOTgwNmMxMTIiLCJpYXQiOjE1ODkyOTg0ODQsImV4cCI6MTU4OTMwMDI4NH0.m1U63blB0MLej_WfB7yC2FTMnCziif9X8yzwDEfJXAg
 *     responses:
 *       "204":
 *         description: No content
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /auth/refresh-tokens:
 *   post:
 *     summary: Refresh auth tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *             example:
 *               refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZWJhYzUzNDk1NGI1NDEzOTgwNmMxMTIiLCJpYXQiOjE1ODkyOTg0ODQsImV4cCI6MTU4OTMwMDI4NH0.m1U63blB0MLej_WfB7yC2FTMnCziif9X8yzwDEfJXAg
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/start-session:
 *   post:
 *     summary: start session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - address
 *             properties:
 *               token:
 *                 type: string
 *               address:
 *                 type: string
 *             example:
 *               token: 428489af-3ca1-4861-b1c7-5f634f6466e2
 *               address: "0xFf893698faC953dBbCdC3276e8aD13ed3267fB06"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - data
 *               properties:
 *                 success:
 *                   type: bool
 *                 data:
 *                   type: object
 *                   required:
 *                     - nonce
 *                   properties:
 *                     nonce:
 *                       type: string
 *               example:
 *                 success: true
 *                 data:
 *                   nonce: signin-0652c409-17ef-4ad6-b580-3faaefcc204d
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /auth/authenticate:
 *   post:
 *     summary: authenticate
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - signature
 *             properties:
 *               token:
 *                 type: string
 *               signature:
 *                 type: string
 *             example:
 *               token: 428489af-3ca1-4861-b1c7-5f634f6466e2
 *               signature: "0xe0434ea8ff5123a570b6b7e5f1b837af4524372d4552021bfcede66219abe00c376a8c8417299be23938b9644ba922ffd36bbbdd1cdf15719da9b2af9affdec601"
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - data
 *               properties:
 *                 success:
 *                   type: bool
 *                 data:
 *                   type: object
 *                   required:
 *                     - authenticated
 *                   properties:
 *                     nonce:
 *                       type: bool
 *               example:
 *                 success: true
 *                 data:
 *                   authenticated: true
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */
