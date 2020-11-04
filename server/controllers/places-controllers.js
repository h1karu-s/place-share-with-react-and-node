const fs = require('fs');

const {validationResult} = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');


//api/place/:pid
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; 
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    return next(new HttpError('Something went wrong, could not find a place.', 500));
  }

  if (!place) {
    return next(new HttpError('Could not find a place for the provided id.', 404));
  }
  res.json({place: place.toObject({getters: true})}); 
};

//api/place/user/uid
const getPlacesByUserId = async (req, res,  next) => {
  const userId = req.params.uid;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    return next(new HttpError('Fetching places failed, Please try again later.', 500))
  }
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(new HttpError('Could not find a place for the provided user id.', 404));
  }
  res.json({places: userWithPlaces.places.map(place => place.toObject({getters: true}))});
};

// / post
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const {title, description, address} = req.body;
  
  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

 
  const createdPlace = new Place({
    title,
    description,
    location: coordinates,
    address,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Creating place failed, please try again.',500));
  }

  if(!user) {
    return next(new HttpError('Could not find  user for provided id.', 404));
  }
  
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({session: sess});
    user.places.push(createdPlace._id);
    await user.save({session: sess});
    await sess.commitTransaction();
  } catch (err) {
    return next(new HttpError('Creating place failed, please try again.'));
  }

  

  // try {
  //   await createdPlace.save();
  //   user.places.push(createdPlace._id);
  //   await user.save();
  // } catch (error) {
  //   return next(new HttpError('Creating place failed, please try again.'));
  // }
  
  res.status(201).json({place: createdPlace});
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    throw new HttpError('Invalid inputs passed, please check your data.', 422);
  }

  const {title, description} = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    next(new HttpError('Something went wrong, could not update place.',500));
  }

  if(place.creator.toString() !== req.userData.userId) {
    return next(new HttpError('You are not allowed to edit this place.',401));
  }

  place.title = title;
  place.description = description;
  
  try {
    await place.save();
  } catch (err) {
    next(new HttpError('Something went wrong, could not update place.', 500));
  }
 

  res.status(200).json({place: place.toObject({getters: true})});
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  
  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    next(new HttpError('Something went wrong, could not delete place.',500));
  }

  if(!place) {
    return next(new HttpError('Could not find place for this id.', 404));
  }

  if (place.creator.id !== req.userData.userId) {
    return next(new HttpError('You are not allowed to delete this place.',401));
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({session: sess});
    place.creator.places.pull(place);
    await place.creator.save({session: sess});
    await sess.commitTransaction();
  } catch (err) {
    next(new HttpError('Something went wrong, could not delete place.',500));
  }
  fs.unlink(imagePath, err => {
    console.log(err);
  })
  res.status(200).json({message: 'Delete place.'});
};


module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace
};