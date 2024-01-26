const mongoose = require('mongoose');

const MusicSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  file: {
    data: Buffer,
    contentType: String,
  },
  artist : {
    type:String
  }
});

module.exports = mongoose.model('Music', MusicSchema);
