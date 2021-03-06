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
let listMovesPlayed = []

//Sockets

io.on("connection", (socket) => {

    console.log(`Client ${socket.id} connected`)

    socket.onAny((event, ...args) => {
        console.log(`Server received ${event} from ${socket.id} with args : ${args}`)
    })

    /**
     * Connexion d'un joueur souhaitant participer au jeu (différent des controleurs qui font seulement regarder)
     */
    socket.on("connect_player", (name) => {

        //Vérifie qu'un troisième joueur n'essaie pas de se connecter

        if (players.player1.name && players.player2.name && ![players.player2.name, players.player1.name].includes(name)) {
            socket.broadcast.emit("alien_client", name)
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
            nextPlayer = getRandomFirstPlayer()
        }

        //On indique aux autres qu'un nouveau joueur vient de se connecter

        
        console.log(`[Server emit] connect_player : name =` ,name)
        io.emit("connect_player", name)
    });

    /**
     * Demande de début de partie
     * Si tous les joueurs sont connectés, on lance vraiment la partie
     * Si un joueur manque ou n'est pas connecté, on indique que la partie ne peut pas démarrer à la socket concernée avec "start_game_error"
     */
    socket.on("start_game", () => {
        if (players.player1.socket && players.player2.socket && players.player1.socket.connected && players.player2.socket.connected) {
            resetEverything()
            gameStarted = true
            nextPlayer = getRandomFirstPlayer()
            console.log(`[Server emit] start_game : arg =` ,{board: p4.getBoard(), nextPlayer: nextPlayer})
            io.emit("start_game", {board: p4.getBoard(), nextPlayer: nextPlayer})
        } else {
            let playersConnected = getPlayersConnected()
            console.log(`[Server emit] start_game_error : arg =`, playersConnected)
            socket.emit("start_game_error", playersConnected)
        }
    });

    /**
     * Reset de la partie par un administrateur
     */
    socket.on("stop_game", () => {
        resetEverything()
        console.log(`[Server emit] stop_game : arg =`)
        socket.broadcast.emit("stop_game");
    });

    /**
     * Reset de la partie par un administrateur
     */
    socket.on("kick_player", (name) => {
        resetEverything()
        for (const [playerNumber, playerObject] of Object.entries(players)) {
            if (playerObject.name === name) {
                players[playerNumber].socket.disconnect()
                players[playerNumber] = {
                    name: "",
                    socket: null
                }
            }
        }
        io.emit("stop_game");
    });

    /**
     * Nouveau coup d'un joueur
     */
    socket.on("new_move", (move) => {
        if (!gameStarted) {
            //si la partie a pas démarré on fait rien
            return
        }

        //on vérifie que le joueur qui a fait le coup est bien le prochain joueur à jouer
        if (move.name !== nextPlayer) {
            console.log(`[Server emit] bad_player : arg =`, move.name)
            io.emit("bad_player", move.name);
            return
        }

        //on vérifie que le move est valide
        if (isNaN(parseInt(move.column))) {
            console.log(`[Server emit] bad_move : arg =`, {error : "La colonne doit etre un chiffre", faultyPlayer: move.name})
            io.emit("bad_move", {error : "La colonne doit etre un chiffre", faultyPlayer: move.name})
            return
        }

        if (move.column < 0 || move.column > 6) {
            console.log(`[Server emit] bad_move : arg =`, {error : "Le numero de colonne doit etre entre 0 et 6 compris", faultyPlayer: move.name})
            io.emit("bad_move", {error : "Le numero de colonne doit etre entre 0 et 6 compris", faultyPlayer: move.name})
            return
        }

        try {
            let winner = p4.newMove(move.column, move.name);

            //A CHANGER PAR SOCKET.BROADCAST.EMIT SI ON VEUT PAS QUE LE MEC RECOIVE SON PROPRE COUP
            console.log(`[Server emit] new_move : arg =`, {board: p4.getBoard(), column: move.column, name: move.name})
            io.emit("new_move", {board: p4.getBoard(), column: move.column, name: move.name});

            if (winner) {
                //on a un gagnant
                console.log(`[Server emit] end_game : arg =`, winner)
                io.emit("end_game", winner)
                resetEverything()
            } else {
                //changement de joueur actif, winner = null
                nextPlayer = players.player1.name === move.name ? players.player2.name : players.player1.name
                console.log(`[Server emit] waiting_move : arg =`, nextPlayer)
                io.emit("waiting_move", nextPlayer);
                listMovesPlayed.push(move)
            }
        } catch(e) {
            console.log(`[Server emit] bad_move : arg =`, {error : e.message, faultyPlayer: move.name})
            io.emit("bad_move", {error : e.message, faultyPlayer: move.name})
        }

    });

    /**
     * Une socket demande l'état actuel de la partie
     */
    socket.on("game_status", () => {
        console.log(`[Server emit] game_status : arg =`, {
            gameStarted: gameStarted,
            board: p4.getBoard(),
            listMovesPlayed: listMovesPlayed,
            nextPlayer: nextPlayer,
            playersConnected: getPlayersConnected()
        })
        socket.emit("game_status", {
            gameStarted: gameStarted,
            board: p4.getBoard(),
            listMovesPlayed: listMovesPlayed,
            nextPlayer: nextPlayer,
            playersConnected: getPlayersConnected()
        })
    })

    /**
     * Alerter toutes les socket autre que celle concernée qu'elle vient de se déconnecter
     * Attention ! Utiliser disconnecting, pas disconnect !
     */
    socket.on("disconnecting", () => {
        for (const [_, playerObject] of Object.entries(players)) {
            if (playerObject.socket && playerObject.socket.id === socket.id) {
                console.log(`[Server emit] disconnected_player : arg =`, playerObject.name)
                socket.broadcast.emit("disconnected_player", playerObject.name)
                return
            }
        }
    });

});

/**
 * Obtenir le nom d'un des joueurs aléatoirement
 * @returns {string}
 */
function getRandomFirstPlayer() {
    return Math.random() < 0.5 ? players.player1.name : players.player2.name
}

/**
 * Obtenir une liste avec tous les joueurs actuellement connectés
 * @returns {*[]}
 */
function getPlayersConnected() {
    let playersConnected = []

    for (const [_, playerObject] of Object.entries(players)) {
        if (playerObject.socket && playerObject.socket.connected) {
            playersConnected.push(playerObject.name)
        }
    }

    return playersConnected
}

/**
 * Remettre tous les paramètres de la partie à 0
 */
function resetEverything() {
    gameStarted = false
    listMovesPlayed = []
    nextPlayer = null
    p4 = new Puissance4();
}

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

server.listen(config.server.port, config.server.host, () => {
    console.log(`Server running at http://${config.server.host}:${config.server.port}/`);
});