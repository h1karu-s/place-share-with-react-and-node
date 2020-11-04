const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');


const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}).select('-password');
  } catch(err) {
    return next(new HttpError('Fetching users failed, please try again later.',  500));
  }
  res.json({users: users.map(user => user.toObject({getters: true}))});
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const { name, email, password} = req.body;
  
  let existingUser;
  try {
    existingUser = await User.findOne({email: email})
  } catch (err) {
    return next(new HttpError('Signing up failed, please try again later.', 500));
  }
  if(existingUser) {
    return next(new HttpError('Could not create user, email already exists.', 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12)
  } catch (err) {
    const error = new HttpError('Could not create user, please try again.', 500);
    return next(error);
  }
  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
  });

  try {
    await createdUser.save();
  } catch(err) {
    return next(new HttpError('Crateing user failed, please try againg.', 500));
  }

  let token;
  try {
    token = jwt.sign(
      {userId: createdUser.id, email: createdUser.email}, 
      'supersecret_dont_share', 
      {expiresIn: '1h'}
    );
  } catch(err) {
    return next(new HttpError('Crateing user failed, please try againg.', 500));
  }

  res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token});
};


const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }
  
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({email: email})
  } catch (err) {
    return next(new HttpError('Logged in failed, please try again later.', 500));
  }

  if(!existingUser) {
    return next(new HttpError('Invalid credentials, could not log you in.', 500));
  }

  let isVaildPassword = false;
  try {
    isVaildPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError('Could not log you in, please check your credentials and try again.', 500));
  }
  if(!isVaildPassword) {
    return next(new HttpError('Invalid credentials, could not log you in.', 500));
  }
  
  let token;
  try {
    token = jwt.sign(
      {userId: existingUser.id, email: existingUser.email}, 
      'supersecret_dont_share', 
      {expiresIn: '1h'}
    );
  } catch(err) {
    return next(new HttpError('Logging in failed, please try againg.', 500));
  }

  res.json({userId: existingUser.id, email: existingUser.email, token: token });
};



module.exports = {
  getUsers,
  signup,
  login
}