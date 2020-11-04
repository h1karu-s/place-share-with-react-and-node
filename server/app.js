const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.json());

app.use('/uploads/images',express.static(path.join('uploads','images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
  next();
});


app.use('/api/places', placesRoutes); // => api/places/...
app.use('/api/users', usersRoutes);

app.use((req, res, next) => {
  throw new HttpError('Could not find this routes.', 404);
});

app.use((error, req, res ,next) => {
  if (req.file) {
    console.log(req.file);
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({message: error.message || 'An unknown error occurred!'})
})

const MONGODB_URL = 'mongodb+srv://hikaru:t18ac019@cluster0.zla4m.mongodb.net/placesShare?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
  .then(() => {
    app.listen(5000);
  })
  .catch(err => {
    console.log(err);
  });