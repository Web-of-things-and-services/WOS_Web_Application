module.exports = class Puissance4 {
  /**
   * Initialise un plateau de jeu de dimensions `rows` × `cols` (par défaut 6×7)
   * @param rows le nombre de lignes du plateau
   * @param columns le nombre de colonnes du plateau
   */
  constructor(rows = 6, cols = 7) {
    // Nombre de lignes et de colonnes
    this.rows = rows;
    this.cols = cols;
    // cet tableau à deux dimensions contient l'état du jeu:
    //   0: case vide
    //   1: pion du joueur 1
    //   2: pion du joueur 2
    this.board = Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      this.board[i] = Array(this.cols).fill(0);
    }
    // un entier: 1 ou 2 (le numéro du prochain joueur)
    this.turn = 1;
    // Nombre de coups joués
    this.moves = 0;
    /* un entier indiquant le gagnant:
          null: la partie continue
             0: la partie est nulle
             1: joueur 1 a gagné
             2: joueur 2 a gagné
      */
    this.winner = null;
  }

  /**
   * Colore une case.
   * @param row la ligne de la case
   * @param column la colonne de la case
   * @param player le joueur
   */
  set(row, column, player) {
    // On colore la case
    this.board[row][column] = player;
    // On compte le coup
    this.moves++;
  }

  /**
   * Cette fonction ajoute un pion dans une colonne.
   * @param column la colonne dans laquelle on veut mettre notre pion
   */
  play(column) {
    // Trouver la première case libre dans la colonne
    let row;
    for (let i = 0; i < this.rows; i++) {
      if (this.board[i][column] == 0) {
        row = i;
        break;
      }
    }
    if (row === undefined) {
      return null;
    } else {
      // Effectuer le coup
      this.set(row, column, this.turn);
      // Renvoyer la ligne où on a joué
      return row;
    }
  }

  /**
   * Permet de jouer un nouveau coup.
   * @param column la colonne dans laquelle on veut mettre notre pion
   * @param name le nom du joueur qui joue le pion
   * @return null si pas de gagnant, player1 ou player2 si un gagnant, nobody si personne et toutes les cases sont remplies
   */
  newMove(column, name) {
    if (column !== undefined) {
      column = parseInt(column);
      let row = this.play(parseInt(column));

      if (row === null) {
        throw new Error("Colonne complete")
      } else {
        // Vérifier s'il y a un gagnant, ou si la partie est finie
        if (this.win(row, column, this.turn)) {
          return name;
        } else if (this.moves >= this.rows * this.cols) {
          return "nobody";
        }
        // Passer le tour : 3 - 2 = 1, 3 - 1 = 2
        this.turn = 3 - this.turn;
        return null;
      }
    }
  }

  /**
   * Cette fonction vérifie si le coup dans la case `row`, `column` par
   * le joueur `player` est un coup gagnant.
   * @param row la ligne du coup
   * @param column la colonne du coup
   * @param player la colonne du coup
   * @return
   *   true  : si la partie est gagnée par le joueur `player`
   *   false : si la partie continue
   */
  win(row, column, player) {
    // Horizontal
    let count = 0;
    for (let j = 0; j < this.cols; j++) {
      count = this.board[row][j] == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Vertical
    count = 0;
    for (let i = 0; i < this.rows; i++) {
      count = this.board[i][column] == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Diagonal
    count = 0;
    let shift = row - column;
    for (
      let i = Math.max(shift, 0);
      i < Math.min(this.rows, this.cols + shift);
      i++
    ) {
      count = this.board[i][i - shift] == player ? count + 1 : 0;
      if (count >= 4) return true;
    }
    // Anti-diagonal
    count = 0;
    shift = row + column;
    for (
      let i = Math.max(shift - this.cols + 1, 0);
      i < Math.min(this.rows, shift + 1);
      i++
    ) {
      count = this.board[i][shift - i] == player ? count + 1 : 0;
      if (count >= 4) return true;
    }

    return false;
  }

  /**
   * Cette fonction vide le plateau et remet à zéro l'état.
   */
  reset() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.board[i][j] = 0;
      }
    }
    this.move = 0;
    this.winner = null;
  }

  /**
   * Retourne le plateau.
   * @returns le plateau
   */
  getBoard() {
    return this.board;
  }
};
