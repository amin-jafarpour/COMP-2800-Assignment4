const express = require('express');
const { read } = require('fs');
const fs = require('fs');
const https = require('https');
const bodyparser = require("body-parser");
const mongoose = require('mongoose');


function run() {
    const content = {pokes: []}; 
    for (let i = 1; i <= 800; ++i) {
      https.get(`https://pokeapi.co/api/v2/pokemon/${i}`, (resp) => {
        let data = '';
  
        
        resp.on('data', (chunk) => {
          data += chunk;
        });
  
       
        resp.on('end', () => {
          let properties = JSON.parse(data);
          let poktypes = [];
  
          for (let j = 0; j < properties.types.length; ++j) {
            poktypes.push(properties.types[j].type.name);
          }
  
          const f = {
            "id": parseInt(properties.id),
            "name": properties.name,
            "weight": parseInt(properties.weight),
            "height": parseInt(properties.height),
            "species": properties.species.name,
            "type": poktypes
          }
  
          content.pokes.push(f);
          const thing = JSON.stringify(content);
  
          if(i == 800){
            fs.writeFile('./pokemon-details.json', thing, { flag: 'w' }, err => {});
          }
         
  
     
       
        });
  
      }).on("error", (err) => {
        console.log("Error: " + err.message);
      })
    }
  
  }
  
  run();