console.log("coucou");

function startGame() {
  console.log("start game");
  fetch("/newGame")
    .then((result) => result.text())
    .then(console.log, console.error);
}

function playMove(val) {
  gri = {
    grid: {
      A0: 0,
      A1: 0,
      A2: 0,
      A3: 0,
      A4: 0,
      A5: 0,
      B0: 0,
      B1: 0,
      B2: 0,
      B3: 0,
      B4: 0,
      B5: 0,
      C0: 0,
      C1: 0,
      C2: 0,
      C3: 0,
      C4: 0,
      C5: 0,
      D0: 0,
      D1: 0,
      D2: 0,
      D3: 0,
      D4: 0,
      D5: 0,
      E0: 0,
      E1: 0,
      E2: 0,
      E3: 0,
      E4: 0,
      E5: 0,
      F0: 0,
      F1: 0,
      F2: 0,
      F3: 0,
      F4: 0,
      F5: 0,
      G0: 0,
      G1: 0,
      G2: 0,
      G3: 0,
      G4: 0,
      G5: 0,
    },
  };
  let data = { grid: gri, position: val };
  console.log("play move");
  fetch("/jeton", {
    method: "post",
    body: JSON.stringify(data),
    headers: { "Content-type": "application/json" },
  })
    .then((result) => result.text())
    .then(console.log, console.error);
}
