/**
 * Gère la partie front du puissance 4.
 */

class Puissance4Front {
  /**
   *Initialise un plateau de jeu de dimensions `rows` × `cols` (par défaut 6×7),
   * et fait l'affichage dans l'élément `element_id` du DOM.
   * @param element_id l'id de la div où on met la grille du puissance 4
   * @param board le plateau du puissance 4
   * @param rows le nombre de ligne de la grille du puissance 4
   * @param cols le nombre de colonne de la grille du puissance 4
   */
  constructor(element_id, board, rows = 6, cols = 7) {
    this.rows = rows;
    this.cols = cols;
    this.board = board;

    // L'élément du DOM où se fait l'affichage
    this.element = document.querySelector(element_id);
    // On fait l'affichage
    this.render();
  }

  /**
   * Affiche le plateau de jeu dans le DOM
   */
  render() {
    let table = document.createElement("table");
    //ATTENTION, la page html est écrite de haut en bas. Les indices
    //pour le jeu vont de bas en haut (compteur i de la boucle)
    for (let i = this.rows - 1; i >= 0; i--) {
      let tr = table.appendChild(document.createElement("tr"));
      for (let j = 0; j < this.cols; j++) {
        let td = tr.appendChild(document.createElement("td"));
        let colour = this.board[i][j];
        if (colour) td.className = "player" + colour;
        td.dataset.column = j;
      }
    }
    this.element.innerHTML = "";
    this.element.appendChild(table);
  }

  setBoard(board) {
    this.board = board;
  }
}
