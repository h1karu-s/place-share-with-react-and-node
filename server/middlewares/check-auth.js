const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if(req.method === 'OPTIONS') {  //options requestの場合はスキップする
    return next()
  }
  try {
    const token = req.headers.authorization.split(' ')[1]; //Authorization: 'Bearer TOKEN
    if (!token) {
      throw new Error('Authentication failed.');
    }
    const decodedToken = jwt.verify(token, 'supersecret_dont_share'); //if it is valid,return jwt payload {userId: id, email: email}
    req.userData = {userId: decodedToken.userId};
    next();
  } catch (err) {
    const error = new HttpError('Authentication failed.', 401);
    return next(error);
  }
}