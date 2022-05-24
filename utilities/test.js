const express = require('express');
const { read } = require('fs');
const fs = require('fs');
const https = require('https');
const bodyparser = require("body-parser");
const mongoose = require('mongoose');

let pokemons;


try {
    const data = fs.readFileSync('./pokemon-details.json', 'utf8');
    pokemons = JSON.parse(data).pokes;
    console.log(pokemons.filter(pok => pok.id == 800));
  } catch (err) {
    console.error(err);
  }

  