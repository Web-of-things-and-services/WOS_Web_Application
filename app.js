const express = require("express");
const app = express();
const http = require("http")
const {Server} = require("socket.io");
const server = http.createServer(app)
const io = new Server(server)
const config = require("./etc/config.json")
const Puissance4 = require("./js/game.js");

// Configuration de l'application Express

app.use(express.json());
app.use(express.urlencoded());
app.use("/js", express.static("./js/"));
app.use("/css", express.static("./css/"));

// Initialisation puissance 4

let p4 = new Puissance4();
let players = {
    player1: {
        name: "",
        socket: null
    },
    player2: {
        name: "",
        socket: null
    }
}
let nextPlayer = null;
let gameStarted = false;
let gameFinished = false;

//Sockets

io.on("connection", (socket) => {

    console.log(`Connecté au client ${socket.id}`)

    console.log(players)

    socket.onAny((event, ...args) => {
        console.log(`Server received : ${event} with ${args}`)
    })

    //Connexion d'un joueur souhaitant participer au jeu (différent des controleurs qui font seulement regarder)

    socket.on("connect_player", (name) => {

        //Vérifie si la partie a démarré pour autoriser la connexion des joueurs

        if (!gameStarted) {
            socket.broadcast.emit("connect_player_without_start", name)
            return
        }

        //Vérifie qu'un troisième joueur n'essaie pas de se connecter

        if (players.player1.name && players.player2.name && ![players.player2.name, players.player1.name].includes(name)) {
            socket.broadcast.emit("alien_player", name)
            return
        }

        //Reconnexion d'un joueur, en fonction de son pseudo

        let playerUpdated = null
        for (const [playerNumber, playerObject] of Object.entries(players)) {
            if (playerObject.name === name) {
                playerUpdated = playerNumber
                players[playerNumber] = {
                    name: name,
                    socket: socket
                }
            }
        }

        //Si c'est un tout nouveau joueur qui se connecte

        if (!playerUpdated) {
            let newPlayer = {
                name: name,
                socket: socket
            }
            if (!players.player1.name) {
                players.player1 = newPlayer
            } else {
                players.player2 = newPlayer
            }
        }

        //Si aucun joueur n'est actuellement désigné pour jouer, alors on en choisi un premier au hasard

        if (!nextPlayer) {
            //https://stackoverflow.com/questions/9730966/how-to-decide-between-two-numbers-randomly-using-javascript
            nextPlayer = Math.random() < 0.5 ? players.player1.name : players.player2.name
        }

        //On indique aux autres qu'un nouveau joueur vient de se connecter

        io.emit("connect_player", name)

        //Si 2 joueurs connectés, on "lance la partie"

        if (players.player1.name && players.player2.name) {
            //Demande au joueur concerné de joueur un coup, io pas broadcast car si la socket concernée doit commencer elle doit recevoir l'event
            io.emit("display_turn_player", nextPlayer)
        }
    });

    //Demande de début de partie

    socket.on("start_game", () => {
        gameStarted = true;
        io.emit("init_game", {board: p4.getBoard(), displayWaitingMsg: true})
    });

    //Reset du jeu

    socket.on("reset_game", () => {
        p4 = new Puissance4()
        nextPlayer = Math.random() < 0.5 ? players.player1.name : players.player2.name
        gameFinished = false
        gameStarted = true
        io.emit("init_game_after_reset", {board: p4.getBoard(), nextPlayer : nextPlayer});
    });

    //Reset après une déconnexion (un joueur sur deux déconnecté)

    /*socket.on("reset_game_after_disconnected", (namePlayerConnected) => {
        //reset du joueur déconnecté
        if (namePlayerConnected === players.player1.name) players.player2 = {name: "", id: null};
        else players.player1 = {name: "", id: null};
        //reset de la partie
        p4 = new Puissance4();
        gameFinished = false;
        io.emit("init_game", {board: p4.getBoard(), displayWaitingMsg: false});
    });*/


    //nouveau coup d'un joueur
    socket.on("new_move", (move) => {
        //dans cette fonction je ne vérifie pas que la colonne est comprise ente 0 et 6, ca doit etre verifier chez les players
        //on vérifie que la partie n'est pas terminé
        if (!gameFinished) {
            //on vérifie que les deux joueurs sont bien connectés
            if (players.player1.name && players.player2.name) {
                //on vérifie que le joueur qui a fait le coup est bien le prochain joueur à jouer
                if (move.name === nextPlayer) {
                    let win = p4.newMove(move.column, move.name);
                    //on envoie l'evenement du nouveau coup avec un plateau actualisé pour tous les clients
                    io.emit("new_move", {board: p4.getBoard(), column: move.column, name: move.name});
                    //dans le cas où toutes les cases sont remplies sans gagnant
                    if (win === "nobody") {
                        io.emit("nobody_win");
                        gameFinished = true;
                    }
                    //dans le cas où on a un gagnant
                    if (win === "players.player1" || win === "players.player2") {
                        io.emit("win", move.name);
                        gameFinished = true;
                    } else {
                        //changement de joueur actif
                        if (players.player1.name === move.name) nextPlayer = players.player2.name;
                        else nextPlayer = players.player1.name;
                        io.emit("display_turn_player", nextPlayer);
                    }
                } else {
                    io.emit("bad_player", move.name);
                }
            } else {
                io.emit("missing_player");
            }
        }
    });

    //Alerter les autres sockets qu'un joueur s'est déconnecté

    socket.on("disconnecting", () => {
        for (const [_, playerObject] of Object.entries(players)) {
            if (playerObject.socket && playerObject.socket.id === socket.id) {
                socket.broadcast.emit("disconnected_player", playerObject.name)
                return
            }
        }
    });

});

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

server.listen(config.server.port, config.server.host, () => {
    console.log(`Server running at http://${config.server.host}:${config.server.port}/`);
});