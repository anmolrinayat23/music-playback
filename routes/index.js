var express = require('express');
var router = express.Router();
const passport = require('passport');
const localStrategy = require("passport-local");
var userModel = require('./users');
var musicModel = require('./music');
var multer = require('multer');
const crypto = require('crypto');
const mongoose = require('mongoose');
var fs = require('fs');
var path = require('path');

passport.use(new localStrategy(userModel.authenticate()));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

router.post('/music-upload', upload.fields([{ name: 'file', maxCount: 1 },{artist: 'file', maxCount: 1}]), (req, res) => {
  const music = new musicModel({ 
    name: req.body.name,
    artist:req.body.artist,
  });

  const filePath = req.files['file'][0].path;
  const fileData = fs.readFileSync(filePath);

  music.file.data = fileData;
  music.file.contentType = 'audio/mp3';
  
  music.save()
    .then(() => res.redirect('/tracks'))
    .catch(error => res.status(400).send(error.message));
});



router.get('/tracks/:id/audio', async (req, res) => {
  try {
    const music = await musicModel.findById(req.params.id);
    res.set('Content-Type', music.file.contentType);
    res.send(music.file.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




router.post('/register', async function(req, res, next) {
  var usersData = new userModel({
  name: req.body.name,
  username: req.body.username,
  email : req.body.email,
  password:req.body.password
  })
  await userModel.register(usersData,req.body.password);
    passport.authenticate("local")(req,res,function(){
      res.redirect("/tracks");
    });
});

router.post("/login", passport.authenticate("local", {
  successRedirect : "/tracks",
  failureRedirect : "/login"
}), function(req, res){})

router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.render('index');
  });
  });

  router.post('/like/:id', isLoggedIn, function(req, res, next) {
    const songId = req.params.id;
    const userId = req.user._id;
    userModel.findOne({ _id: userId, liked_songs: songId }, function(err, user) {
      if (err) {
        console.error(err);
        res.status(500).send('Error liking song');
      } else if (user) {
        console.log('User has already liked this song');
        res.redirect('/like');
      } else {
        userModel.updateOne(
          { _id: userId },
          { $push: { liked_songs: songId } },
          function(err) {
            if (err) {
              console.error(err);
              res.status(500).send('Error liking song');
            }else {
              console.log('Song liked by user:', req.user.username);
              res.redirect('/like');
            }
          }
        );
      }
    });
  });
  

  router.get('/like', isLoggedIn, async function(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userModel.findById(userId).populate('liked_songs');
  
      const likedSongs = user.liked_songs.map(song => ({
        id: song._id,
        name: song.name,
        artist: song.artist,
        filePath: path.join(__dirname, '../public/uploads', `${song._id}.mp3`)
      }));
  
      res.render('like', { likedSongs });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  });
  


router.get('/liked-songs/:id', async (req, res) => {
    try {
      const songId = req.params.id;
      const song = await musicModel.findById(songId);
  
      if (!song) {
        return res.status(404).json({ message: 'Song not found' });
      }
      const streamUrl = `/stream/${song._id}`;
      res.json({
        name: song.name,
        artist: song.artist,
        streamUrl: streamUrl
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
});
  

// router.get('/like/:id', function(req, res) {
//   var id = req.params.id;
//   var file = path.join(__dirname, './public/uploads', id + '.mp3');

//   musicModel.findById(id, function(err, song) {
//     if (err) throw err;

//     if (!song) {
//       res.status(404).send('Song not found');
//       return;
//     }
//     var readStream = fs.createReadStream(file);
//     res.set({
//       'Content-Type': 'audio/mpeg',
//       'Content-Length': song.size,
//       'Content-Disposition': 'inline; filename="' + song.name + '"'
//     });

//     readStream.pipe(res);
//   });
// });

router.get('/like/:id', function(req, res) {
  var id = req.params.id;
  var file = path.join(__dirname, '../public/uploads', id + '.mp3');
  
  fs.exists(file, function(exists) {
    if (exists) {
      fs.readFile(file, function(err, data) {
        if (err) {
          res.status(500).send('Internal Server Error');
        } else {
          res.writeHead(200, {'Content-Type': 'audio/mpeg'});
          res.write(data);
          res.end();
        }
      });
    } else {
      res.status(404).send('File not found!');
    }
  });
});





/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/tracks', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });  
    const music = await musicModel.find();
    res.render('tracks', { music, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get('/loginpage', function(req, res, next) {
  res.render('login');
});

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect('/loginpage');
  }
}


module.exports = router;
