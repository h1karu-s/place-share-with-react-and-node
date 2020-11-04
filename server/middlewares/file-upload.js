const multer = require('multer');


const storage = multer.diskStorage({
  destination:function(req, file, cb)  {
    cb(null,'uploads/images');
  },
  filename:function(req, file, cb) {
    console.log(file.originalname);
    cb(null, Date.now().toString() + '_' + file.originalname);
  }
});

const fileFilter = (req,file,cb) =>{
  if(file.mimetype === 'image/png'  || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    cb(null, true);
  }else{
    let error = new Error('Invalid mime type.')
    cb(error, false);
  }
}

const fileUpload = multer({
  limits: 500000,
  storage,
  fileFilter
});


module.exports = fileUpload;