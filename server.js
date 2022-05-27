const express = require('express');
const { read } = require('fs');
const fs = require('fs');
const https = require('https');
const bodyparser = require("body-parser");
const mongoose = require('mongoose');
const app = express()
app.set('view engine', 'ejs');
// app.use(express.static('./public'));
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(bodyparser.json());
const cors = require('cors');
const { findSourceMap } = require('module');
app.use(cors());
const session = require('express-session');
const { query } = require('express');
const { parse } = require('path');
const { clearScreenDown } = require('readline');
const { get } = require('http');
const { createHmac } = require('crypto');
//***********************************************************************************************************************
app.use(session({ secret: 'ssshhhhh', saveUninitialized: true, resave: true }));

//***********************************************************************************************************************/

mongoose.connect("mongodb://localhost:27017/log", { useNewUrlParser: true, useUnifiedTopology: true });
const logSchema = new mongoose.Schema({
    id: Number,
    likes: Number,
    dislikes: Number
});

const pokSchema = new mongoose.Schema({
    "id": Number,
    "name": String,
    "weight": Number,
    "height": Number,
    "species": String,
    "type": Array
});

const UserSchema = new mongoose.Schema({
    "admin": Boolean,
    "username": String,
    "firstname": String,
    "lastname": String,
    "password": String,
    "shoppingcard": Array,
    "timeline": Array,
    "gamelog": Array
});

const poklogsModel = mongoose.model("poklogs", logSchema);
const poksModel = mongoose.model("poks", pokSchema);
const userModel = mongoose.model("user", UserSchema);
//************************************************************************************************************* */



function addUserDB(user, admin, next) {
    userModel.count({ "username": user.username }, function(err, count) {
        if (err) {
            console.log("Error " + err);
        } else if (count == 0) {
            userModel.create({
                "admin": admin,
                "username": user.username,
                "firstname": user.firstname,
                "lastname": user.lastname,
                "password": user.password,
                "shoppingcard": []
            }, () => next('user created'));
        } else {
            next('account already exists');
        }
    });
}


function findUserDB(credentials, next) {
    userModel.find({ "username": credentials.username, "password": credentials.password }, function(err, data) {
        next(data);
    });
}

// function userCardDB(credentials, next) {
//   userModel.find({ "username": credentials}, function (err, data) {
//     next(data);
//   });
// }


//helper
function addPokemonDB(pokemon) {
    poksModel.count({ "id": pokemon.id }, function(err, count) {
        if (err) {
            console.log("Error " + err);
        } else if (count == 0) {
            poksModel.create({
                "id": pokemon.id,
                "name": pokemon.name,
                "weight": pokemon.weight,
                "height": pokemon.height,
                "species": pokemon.species,
                "type": pokemon.type
            });
        }
    });
}

function fetchPokemonDB(id, next) {
    console.log(id);

    poksModel.find({ "id": id }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            next(data);
        }
    });
}

function getPurchasehistory(username, next) {
    userModel.find({ "username": username }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            let purchases = data[0].timeline;
            history = [];
            for (let i = 0; i < purchases.length; ++i) {
                let str = "";
                for (let j = 0; j < purchases[i].cards.length; ++j) {
                    console.log(purchases[i].cards[j].qty, "heey");

                    str += `#${purchases[i].cards[j].qty} Pokemons of ID: ${purchases[i].cards[j].id}, `;
                }
                str += `purchased on ${purchases[i].time.getFullYear()}-${purchases[i].time.getMonth()}-${purchases[i].time.getDate()}`;
                history.push({ "time": purchases[i].time, "str": str });
            }

            //dates = dates.sort(function(d1, d2){return d1 > d2});

            history = history.sort(function(p1, p2) { return p1.time > p2.time });

            next(history);

        }
    });
}


//helper
function addPokemonLogDB(pokemon) {
    poklogsModel.count({ "id": pokemon.id }, function(err, count) {
        if (err) {
            console.log("Error " + err);
        } else if (count == 0) {
            poklogsModel.create({
                "id": pokemon.id,
                likes: 0,
                dislikes: 0
            });
        }
    });
}

function removeUserCardDB(username, id, next) {

    userModel.find({ "username": username }, function(err, data) {
        let cards = data[0].shoppingcard;
        let newQty = 0;
        let i = 0;
        for (; i < cards.length; ++i) {
            if (cards[i].id == id && cards[i].qty > 0) {
                cards[i].qty = cards[i].qty - 1;
                newQty = cards[i].qty;
                break;
            } else if (cards[i].id == id) {
                break;
            }
        }
        cards = cards.filter((item) => item.qty > 0);
        userModel.updateOne({ "username": username }, { $set: { "shoppingcard": cards } }, () => next({ "id": id, "qty": newQty }));
    })
}

function getUserPurchaseDB(username, next) {
    userModel.find({ "username": username }, function(err, data) {
        let cards = data[0].shoppingcard;
        //let purchaseSummary = 'Details:\n';
        let cost = 0.0;
        for (let i = 0; i < cards.length; ++i) {
            //purchaseSummary += `Pokemon ID: ${cards[i].id} - QTY: ${cards[i].qty}\n`;
            cost += 30 * cards[i].qty;
        }
        next({ "cards": cards, "cost": cost });
    })
}

function processUserPurchaseDB(username, next) {
    userModel.find({ "username": username }, function(err, data) {
        let cards = data[0].shoppingcard;
        if (cards.length <= 0) {
            next("nothing in the card");
            return;
        }
        //let purchaseDetails = JSON.stringify(cards);
        userModel.updateOne({ "username": username }, { $set: { "shoppingcard": [] }, $push: { "timeline": { "cards": cards, time: new Date() } } }, () => next("purchase procssed"))
    });
}

function addUserCardDB(username, id, next) {

    userModel.find({ "username": username }, function(err, data) {
        let cards = data[0].shoppingcard;
        let newQty = 0;
        let exists = false;
        for (let i = 0; i < cards.length; ++i) {
            if (cards[i].id == id) {
                cards[i].qty = cards[i].qty + 1;
                newQty = cards[i].qty;
                exists = true;
                break;
            }
        }
        if (!exists) {
            cards.push({ "id": id, "qty": 1 });
            newQty = 1;
        }
        userModel.updateOne({ "username": username }, { $set: { "shoppingcard": cards } }, () => next({ "id": id, "qty": newQty }));
    })
}

//********************************************************************************************************************** */

function authenticateUser(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/loginpage.html');
    }
}

//********************************************************************************************************************** */

app.get('/', function(req, res) {
    if (req.session.adminAuthenticated) {
        res.render('admindashboard.ejs', { username: req.session.username, message: "" });
    } else if (req.session.authenticated) {
        res.redirect("/home");
    } else {
        res.sendFile('/index.html', { root: __dirname });
    }
});




app.get('/search', function(req, res) {
    if (req.session.authenticated) {
        res.render('search.ejs', { username: req.session.username });
    } else {
        res.redirect('/search.html');
    }
});



app.post('/signup', function(req, res) {
    let inputusername = "";
    if (req.body.username != undefined) {
        inputusername = req.body.username.toLowerCase();
    }
    const user = { "username": inputusername, "firstname": req.body.firstname, "lastname": req.body.lastname, "password": req.body.password };
    addUserDB(user, false, (message) => res.send(message));
});

app.post('/login', function(req, res) {
    let inputusername = "";
    if (req.body.username != undefined) {
        inputusername = req.body.username.toLowerCase();
    }
    findUserDB({ "username": inputusername, "password": req.body.password }, function(data) {
        console.log(data, data.length);
        if (data.length) {
            req.session.authenticated = true
            req.session.username = req.body.username;
            if (data[0].admin) {
                req.session.adminAuthenticated = true;
                req.session.authenticated = true;
                req.session.username = req.body.username;
                res.render('admindashboard.ejs', { username: req.session.username, message: "" });
            } else {
                res.redirect('/home');
            }

        } else {
            res.send("invalid username or password");
        }
    });
});


app.get('/home', authenticateUser, function(req, res) {
    res.sendFile('views/homepage.html', { root: __dirname });
});
//?
app.get('/pokemon/:id', authenticateUser, function(req, res) {
    fetchPokemonDB(req.params.id, (data) => res.json(data));
});


app.get('/purchase/:id', authenticateUser, function(req, res) {
    poksModel.find({ "id": req.params.id }, { _id: 0, id: 1, name: 1, weight: 1, height: 1, species: 1 }, function(err, properties) {
        if (err) {
            console.log("Error " + err);
        } else {
            const css = fs.readFileSync("./views/purchasepage.css", 'utf8');
            res.render("purchasepage.ejs", {
                "id": properties[0].id,
                "name": properties[0].name,
                "weight": properties[0].weight,
                "height": properties[0].height,
                "species": properties[0].species,
                "css": css
            });
        }
    });
});


app.get('/addcard/:id/', authenticateUser, function(req, res) {
    addUserCardDB(req.session.username, parseInt(req.params.id), (data) => res.json(data));
});


app.get('/removecard/:id', authenticateUser, function(req, res) {
    removeUserCardDB(req.session.username, parseInt(req.params.id), (data) => res.json(data));
});



app.get('/pokemonpurchase/:id', authenticateUser, function(req, res) {
    poksModel.find({ "id": req.params.id }, { _id: 0, id: 1, name: 1, weight: 1, height: 1, species: 1 }, function(err, properties) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.render("profile.ejs", {
                "id": properties[0].id,
                "name": properties[0].name,
                "weight": properties[0].weight,
                "height": properties[0].height,
                "species": properties[0].species
            });
        }
    });
});


app.get('/summarypurchase', authenticateUser, function(req, res) {
    getUserPurchaseDB(req.session.username, (data) => res.json(data));
});

app.get('/processpurchase', authenticateUser, function(req, res) {
    processUserPurchaseDB(req.session.username, (data) => res.json(data));
});

app.get('/logout', authenticateUser, (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/checkout', authenticateUser, (req, res) => {
    res.render('checkout.ejs');
});



app.get('/purchasehistory', authenticateUser, (req, res) => {
    res.sendFile("views/purchasehistory.html", { root: __dirname });
});


app.get('/historyitems', authenticateUser, (req, res) => {
    getPurchasehistory(req.session.username, function(data) {
        res.json(data);
    })
});


///ADMIN//


function getUsersDB(adminUsername, next) {
    userModel.find({}, function(err, data) {
        if (err)
            console.log(err);
        let users = data.filter((info) => info.username != adminUsername);
        next(users);
    });
}


function authenticateAdmin(req, res, next) {
    if (req.session.adminAuthenticated) {
        next();
    } else {
        res.send("you are not an admin");
    }
}

app.post('/updateuser', authenticateAdmin, (req, res) => {
    if (req.body.delete == 'on') {
        userModel.deleteOne({ "username": req.body.userspot }, () => {
            // res.render('admindashboard.ejs', { username: req.session.username, message: `${req.body.userspot} deleted` });
            res.redirect('/');
        });
    } else {
        userModel.updateOne({ "username": req.body.userspot }, { "firstname": req.body.firstname, "lastname": req.body.lastname, "password": req.body.password }, () => {
            // res.render('admindashboard.ejs', { username: req.session.username, message: `changed firstname = ${req.body.firstname}, 
            // lastname = ${req.body.lastname}, password = ${req.body.password }` });
            res.redirect('/');
        });
    }
    // userModel.updateOne({ "username": req.params.username }, );
});

app.get('/getusers', authenticateAdmin, (req, res) => {
    getUsersDB(req.session.username, (data) => res.json(data));
});

// app.get('/editaccount', authenticateUser(req, res), => {
//     userModel.find({ "username": req.body.userspot }, (data) => {
//         console.log("data", data);

//         res.send("yes");
//     });
// });


app.get('/editaccount', authenticateUser, (req, res) => {
    userModel.find({ "username": req.session.username }, (err, data) => {
        const details = data[0];
        res.render('editaccount.ejs', { username: details.username, firstname: details.firstname, lastname: details.lastname, password: details.password });
    });
});

app.post('/changeaccount', authenticateUser, (req, res) => {
    userModel.updateOne({ "username": req.session.username }, { "firstname": req.body.firstname, "lastname": req.body.lastname, "password": req.body.password }, (err, data) => {
        res.redirect('/editaccount');
    });
});

app.post('/adduser', authenticateAdmin, (req, res) => {
    console.log(req.body.admin);
    const admin = (req.body.admin == 'on') ? true : false;
    addUserDB({ "username": req.body.username, "firstname": req.body.firstname, "lastname": req.body.lastname, "password": req.body.password }, admin, (message) => res.send(message));
});

app.get('/playgame', authenticateUser, (req, res) => {
    res.sendFile("/views/settings.html", { root: __dirname });
});

app.post('/cardsetting', authenticateUser, (req, res) => {
    let poknum = parseInt(req.body.dem);
    //let poknum = 2;
    let arr = [];
    let time = 0;

    if (req.body.difficulty == 'easy') {
        time = 25;
    } else if (req.body.difficulty == 'medium') {
        time = 15;
    } else if (req.body.difficulty == 'hard') {
        time = 10;
    }
    console.log(req.body.difficulty);

    poksModel.find({}, (err, data) => {
        let poks = [];
        for (let i = 0; i < poknum / 2; ++i) {
            let random = Math.floor(Math.random() * (20 - 1) + 1);
            let div1 = ` <div class="card" id="card${i}">
                 <img id="img${i}" class="front_face" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${random}.png" alt="">
                <img class="back_face" src="./back.jpg" alt="">
                </div>`;
            let div2 = ` <div class="card" id="cardt${i}">
                <img id="imgt${i}" class="front_face" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${random}.png" alt="">
               <img class="back_face" src="./back.jpg" alt="">
               </div>`;
            arr.push({ "text": div1, "num": Math.floor(Math.random() * (1000 - 1) + 1) });
            arr.push({ "text": div2, "num": Math.floor(Math.random() * (1000 - 1) + 1) });
            //poks.push(data[random]);
        }
        //console.log(poks);

        arr.sort(function(a, b) { return a.num - b.num });

        let content = '';
        for (let i = 0; i < arr.length; ++i) {
            content += arr[i].text;
        }
        //res.render("cards.ejs", { cards: content });
        req.session.gameString = content;
        req.session.gameCount = poknum / 2;
        req.session.gametime = time;
        req.session.gamedifficulty = req.body.difficulty;
        res.sendFile('/views/cards.html', { root: __dirname });
        //res
    });
});

app.get('/gamecontent', authenticateUser, (req, res) => {
    res.json({ "html": req.session.gameString, "count": req.session.gameCount, "timelimit": req.session.gametime });
});

app.post('/endgame', authenticateUser, (req, res) => {
    let gamestatus = (req.body.gamecount <= 0) ? "won" : "lost";
    let gameentry = { "cardnum": req.session.gameCount * 2, "difficulty": req.session.gamedifficulty, "status": gamestatus };
    userModel.updateOne({ "username": req.session.username }, { $push: { "gamelog": gameentry } }, () => {
        req.session.gameString = undefined;
        req.session.gameCount = undefined;
        req.session.gametime = undefined;
        req.session.gamedifficulty = undefined;
        if (req.body.gamecount <= 0) {
            res.send("/win");
        } else {
            res.send("/lost");
        }
    });
});
app.get('/win', authenticateUser, (req, res) => res.sendFile('/views/win.html', { root: __dirname }));
app.get('/lost', authenticateUser, (req, res) => res.sendFile('/views/lost.html', { root: __dirname }));

app.get('/getgamelog', authenticateUser, (req, res) => {
    userModel.find({ "username": req.session.username }, function(err, data) {
        res.json(data[0].gamelog);
    });
});

app.get("/gamelogfile", authenticateUser, (req, res) => {
    res.sendFile('/views/gamelog.html', { root: __dirname });
});














//ADMIN//













//////////////////////////////////////////////////////////**** */
app.get('/log/poklogs', function(req, res) {
    poklogsModel.find({}, { _id: 0, id: 1, likes: 1, dislikes: 1 }, function(err, logs) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.json(logs);
        }

    });
})

app.get('/log/poklogs/:id', function(req, res) {
    poklogsModel.find({ "id": req.params.id }, { _id: 0, id: 1, likes: 1, dislikes: 1 }, function(err, logs) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.json(logs);
        }

    });
})


app.put('/log/insert', function(req, res) {
    poklogsModel.create({
        "id": req.query.id,
        "likes": req.query.likes,
        "dislikes": req.query.dislikes

    }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.send(`inserted ${req.query.id}, ${req.query.likes}, ${req.query.dislikes}`);
        }

    });
})


app.get('/log/like/:id', function(req, res) {
    poklogsModel.updateOne({
        "id": req.params.id
    }, {
        $inc: { "likes": 1 }
    }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            poklogsModel.find({ 'id': req.params.id }, { _id: 0, id: 1, likes: 1 }, function(err, logs) {
                if (err) {
                    console.log("Error " + err);
                } else {
                    res.send(logs);
                }

            });
        }
    });
})


app.get('/log/dislike/:id', function(req, res) {
    poklogsModel.updateOne({
        "id": req.params.id
    }, {
        $inc: { "dislikes": 1 }
    }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {
            poklogsModel.find({ 'id': req.params.id }, { _id: 0, id: 1, dislikes: 1 }, function(err, logs) {
                if (err) {
                    console.log("Error " + err);
                } else {
                    res.send(logs);
                }

            });
        }
    });
})


app.get('/log/remove/:id', function(req, res) {
    poklogsModel.remove({
        "id": req.params.id
    }, function(err, data) {
        if (err) {
            console.log("Error " + err);
        } else {

            res.send(`Remove id= ${req.params.id} log record`);
        }

    });
})





app.get('/pok/:id', function(req, res) {
    poksModel.find({ id: req.params.id }, { _id: 0, id: 1, name: 1, weight: 1, height: 1, species: 1, type: 1 }, function(err, poks) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.json(poks[0]);
        }
    });
})


app.get('/profile/:id', function(req, res) {

    poksModel.find({ "id": req.params.id }, { _id: 0, id: 1, name: 1, weight: 1, height: 1, species: 1 }, function(err, properties) {
        if (err) {
            console.log("Error " + err);
        } else {
            res.render("profile.ejs", {
                "id": properties[0].id,
                "name": properties[0].name,
                "weight": properties[0].weight,
                "height": properties[0].height,
                "species": properties[0].species
            });
        }
    });
});

function populateDB() {
    const pokemonText = fs.readFileSync('./pokemon-details.json', 'utf8');
    pokemonObjs = JSON.parse(pokemonText).pokes;
    for (let i = 1; i <= 800; ++i) {
        //console.log(pokemonObjs.filter(pok => pok.id == i)[0].id);
        if (pokemonObjs.filter(pok => pok.id == i)[0] != undefined) {
            addPokemonDB(pokemonObjs.filter(pok => pok.id == i)[0]);
            addPokemonLogDB(pokemonObjs.filter(pok => pok.id == i)[0]);
        }
    }
}


app.listen(5000, function(err) {
    if (err)
        console.log(err);
    populateDB();
});