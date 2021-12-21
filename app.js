// Référence aux dépendances de l'application
var express = require("express");
var path = require("path");
var _ = require("underscore");
const Puissance4 = require("./js/game.js");

// Démarrage de l'application
var app = express();

// Configuration
app.use(express.json());
app.use(express.urlencoded());
app.use("/js", express.static("./js/"));
app.use("/css", express.static("./css/"));
app.get("/gamecontrol", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});
const server = require("http").Server(app);
server.listen(8888);

// Initialisation puissance 4
let p4 = new Puissance4();
let player1 = { name: "", id: null };
let player2 = { name: "", id: null };
let nextPlayer;
let gameStarted = false;
let gameFinished = false;

//Sockets
const io = require("socket.io")(server);
io.on("connection", (socket) => {
  console.log(`Connecté au client ${socket.id}`);

  //début du jeu
  socket.on("start_game", () => {
    gameStarted = true;
    io.emit("init_game", p4.getBoard(), true);
  });

  //reset du jeu
  socket.on("reset_game", () => {
    p4 = new Puissance4();
    nextPlayer = player1.name;
    gameFinished = false;
    io.emit("init_game_after_reset", p4.getBoard(), nextPlayer);
  });

  //reset après une déconnexion (un joueur sur deux déconnecté)
  socket.on("reset_game_after_disconnected", (namePlayerConnected) => {
    //reset du joueur déconnecté
    if (namePlayerConnected === player1.name) player2 = { name: "", id: null };
    else player1 = { name: "", id: null };
    //reset de la partie
    p4 = new Puissance4();
    gameFinished = false;
    io.emit("init_game", p4.getBoard(), false);
  });

  //connexion d'un joueur
  socket.on("connect_player", (name, idSocket = socket.id) => {
    if (gameStarted) {
      //vérifie que quelqu'un n'essaie pas de se connecter alors qu'on a déja les deux joueurs
      if (player1.name && player2.name) {
        io.emit("alien_player", name);
      } else {
        //dans le cas où le joueur 1 est déja connecté
        if (player1.name) {
          player2.name = name;
          player2.id = idSocket;
        }
        //dans le cas où aucun joueur n'est connecté
        else {
          player1.name = name;
          player1.id = idSocket;
          nextPlayer = player1.name;
        }
        io.emit("connect_player", name);
        //affichage du premier joueur à jouer
        if (player1.name && player2.name) {
          io.emit("display_turn_player", nextPlayer);
        }
      }
    } else io.emit("connect_player_without_start");
  });

  //nouveau coup d'un joueur
  socket.on("new_move", (column, name) => {
    //dans cette fonction je ne vérifie pas que la colonne est comprise ente 0 et 6, ca doit etre verifier chez les players
    //on vérifie que la partie n'est pas terminé
    if (!gameFinished) {
      //on vérifie que les deux joueurs sont bien connectés
      if (player1.name && player2.name) {
        //on vérifie que le joueur qui a fait le coup est bien le prochain joueur à jouer
        if (name === nextPlayer) {
          let win = p4.newMove(column, name);
          //on envoie l'evenement du nouveau coup avec un plateau actualisé pour tous les clients
          io.emit("new_move", p4.getBoard(), column, name);
          //dans le cas où toutes les cases sont remplies sans gagnant
          if (win === "nobody") {
            io.emit("nobody_win");
            gameFinished = true;
          }
          //dans le cas où on a un gagnant
          if (win === "player1" || win === "player2") {
            io.emit("win", name);
            gameFinished = true;
          } else {
            //changement de joueur actif
            if (player1.name === name) nextPlayer = player2.name;
            else nextPlayer = player1.name;
            io.emit("display_turn_player", nextPlayer);
          }
        } else {
          io.emit("bad_player", name);
        }
      } else {
        io.emit("missing_player");
      }
    }
  });

  //pour gérer la déconnexion d'un joueur en pleine partie
  socket.on("disconnect", function () {
    if (gameStarted) {
      if (socket.id === player1.id) {
        io.emit("disconnected_player", player1.name, player2.name);
      }
      if (socket.id === player2.id) {
        io.emit("disconnected_player", player2.name, player1.name);
      }
    }
  });
});

//affichage de la page du controleur web
app.get("/", function (req, res) {
  res.render("index", { title: "Puissance 4 - PiBoy vs Steve" });
});

module.exports = app;
