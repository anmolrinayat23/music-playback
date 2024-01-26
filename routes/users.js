const mongoose = require("mongoose");
var plm = require("passport-local-mongoose");

mongoose.connect("mongodb://0.0.0.0:27017/musicStreamingAppDBB")
.then(function(){
  console.log("connect to db");
})

var userSchema = mongoose.Schema({
  username: String,
  name : String,
  password: String,
  email: String,
  liked_songs: {
    type: [mongoose.Schema.Types.ObjectId],              
    ref: 'Music'
  }
});

userSchema.plugin(plm);

module.exports = mongoose.model("user" , userSchema)
