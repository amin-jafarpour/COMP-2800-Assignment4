const mongoose = require('mongoose');
const https = require('https');

mongoose.connect("mongodb://localhost:27017/log",
  { useNewUrlParser: true, useUnifiedTopology: true });

const pokSchema = new mongoose.Schema({
  "id": Number,
  "name": String,
  "weight": Number,
  "height": Number,
  "species": String
});
const poksModel = mongoose.model("poks", pokSchema);

const logSchema = new mongoose.Schema({
  id: Number,
  likes: Number,
  dislikes: Number
});
const poklogsModel = mongoose.model("poklogs", logSchema);

for(let i = 1; i <= 889 ; ++i){
  https.get(`https://pokeapi.co/api/v2/pokemon/${i}`, (resp) => {
  let data = '';

  // A chunk of data has been received.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    // console.log(JSON.parse(data).explanation);
    let properties = JSON.parse(data);
    console.log('name: ', properties.name, "species: ", properties.species.name);
    poksModel.create({
      "id": parseInt(properties.id),
      "name": properties.name,
      "weight": parseInt(properties.weight),
      "height": parseInt(properties.height),
      "species": properties.species.name

    }/*, function (err, data) {}*/);


    poklogsModel.create({
      "id": parseInt(properties.id),
      likes: 0,
      dislikes: 0
    });
  });




}).on("error", (err) => {
  console.log("Error: " + err.message);
})
}






