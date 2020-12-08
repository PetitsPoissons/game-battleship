document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user');
  const computerGrid = document.querySelector('.grid-computer');
  const displayGrid = document.querySelector('.grid-display');
  const ships = document.querySelectorAll('.ship');
  const destroyer = document.querySelector('.destroyer-container');
  const submarine = document.querySelector('.submarine-container');
  const cruiser = document.querySelector('.cruiser-container');
  const battleship = document.querySelector('.battleship-container');
  const carrier = document.querySelector('.carrier-container');
  const startButton = document.querySelector('#start');
  const rotateButton = document.querySelector('#rotate');
  const turnDisplay = document.querySelector('#whose-go');
  const infoDisplay = document.querySelector('#info');
  const singlePlayerButton = document.querySelector('#singlePlayerButton');
  const multiPlayerButton = document.querySelector('#multiPlayerButton');
  const userSquares = [];
  const computerSquares = [];
  let isHorizontal = true;
  let isGameOver = false;
  let currentPlayer = 'user';
  const nbSquares = 10; // grids are 10 squares x 10 squares

  // variables for multiplayer mode
  let gameMode = '';
  let playerNum = 0;
  let ready = false;
  let enemyReady = false;
  let allShipsPlaced = false; // to verify all players placed their ships before the game
  let shotFired = -1;

  // Select player mode
  singlePlayerButton.addEventListener('click', startSinglePlayer);
  multiPlayerButton.addEventListener('click', startMultiPlayer);

  // Multiplayer mode
  function startMultiPlayer() {
    gameMode = 'multiPlayer';

    // start our socket connection
    const socket = io();

    // get your player number
    // we're listening for a transmission that is titled 'player-number' as defined in the socket.emit in the server.js file
    socket.on('player-number', (num) => {
      if (num === -1) {
        infoDisplay.innerHTML = 'Sorry, the server is full'; // we already have two players playing
      } else {
        playerNum = parseInt(num);
        if (playerNum === 1) currentPlayer = 'enemy';
        console.log(`You are player ${playerNum + 1}.`);

        // get other player' status
        socket.emit('check-players');
      }
    });

    // another player has connected or disconnected
    socket.on('player-connection', (num) => {
      console.log(
        `Player number ${parseInt(num) + 1} has connected or disconnected`
      );
      playerConnectedOrDisconnected(num);
    });

    // on enemy ready
    socket.on('enemy-ready', (num) => {
      enemyReady = true;
      playerReady(num);
      if (ready) playGameMulti(socket);
    });

    // check player status
    socket.on('check-players', (players) => {
      players.forEach((player, index) => {
        if (player.connected) playerConnectedOrDisconnected(index);
        if (player.ready) {
          playerReady(index);
          if (index !== playerReady) enemyReady = true;
        }
      });
    });

    // 'ready' button click
    startButton.addEventListener('click', () => {
      if (allShipsPlaced) {
        playGameMulti(socket);
      } else {
        infoDisplay.innerHTML = 'Please place all ships';
      }
    });

    // show whether a player is connected (green) or disconnected (red)
    function playerConnectedOrDisconnected(num) {
      let playerClass = `.p${parseInt(num) + 1}`; // we want to access the classes .p1 or .p2
      console.log('playerClass', playerClass);
      document
        .querySelector(`${playerClass} .connected span`)
        .classList.toggle('green');
      // if the player that is connecting is us. then
      if (parseInt(num) === playerNum)
        document.querySelector(playerClass).style.fontWeight = 'bold';
    }
  }

  // Single player mode
  function startSinglePlayer() {
    gameMode = 'singlePlayer';

    // generate & place computer ships
    for (let i = 0; i < shipArray.length; i++) {
      console.log('Placing ship: ', shipArray[i].name);
      generate(shipArray[i]);
    }
    startButton.addEventListener('click', playGameSingle);
  }

  // Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1], // divs with ids 0 and 1 if we paint the ship horizontally
        [0, nbSquares], // divs with ids 0 and 10 if we paint the ship vertically
      ],
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2], // divs with ids 0, 1 and 2 if we paint the ship horizontally
        [0, nbSquares, nbSquares * 2], // // divs with ids 0, 10 and 20 if we paint the ship vertically
      ],
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2], // divs with ids 0, 1 and 2 if we paint the ship horizontally
        [0, nbSquares, nbSquares * 2], // divs with ids 0, 10 and 20 if we paint the ship verically
      ],
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3], // divs with ids 0, 1, 2 and 3 if we paint the ship horizontally
        [0, nbSquares, nbSquares * 2, nbSquares * 3], // divs with ids 0, 10, 20 and 30 if we paint the ship vertically
      ],
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4], // divs with ids 0, 1, 2, 3 and 4 if we paint the ship horizontally
        [0, nbSquares, nbSquares * 2, nbSquares * 3, nbSquares * 4], // divs with ids 0, 10, 20, 30 and 40 if we paint the ship vertically
      ],
    },
  ];

  // Create the user and the computer boards
  function createBoard(grid, squares) {
    for (let i = 0; i < nbSquares * nbSquares; i++) {
      const square = document.createElement('div');
      square.dataset.id = i; // we give each square an id
      grid.appendChild(square);
      squares.push(square);
    }
  }

  createBoard(userGrid, userSquares);
  createBoard(computerGrid, computerSquares);

  // Draw each of the computer's ships in a random location
  function generate(ship) {
    // get a random direction, either vertical or horizontal
    let randomDirection = Math.floor(Math.random() * ship.directions.length); // the 'Math.random() * 2' is either going to be 0 or 1
    let directionArray = ship.directions[randomDirection]; // we grab the ship's direction array
    //if (randomDirection === 0) countBy = 1; // count by 1 if direction is horizontal
    //if (randomDirection === 1) countBy = 10;  // count by 10n if direction is vertical

    // get a random start to paint our ship
    let randomStart = Math.floor(Math.random() * computerSquares.length); // gives us a random number from 0 to 99

    // determine ids of the divs where the ship would be painted
    let shipDivsIdArray = [];
    for (let i = 0; i < directionArray.length; i++) {
      shipDivsIdArray.push(randomStart + directionArray[i]);
    }

    // check if ship can fit entirely in grid from randomStart position
    let tooCloseToEdge = false;
    // if direction is horizontal, check if the random start is too close to right edge given the length of the ship to be painted
    if (randomDirection === 0) {
      tooCloseToEdge = shipDivsIdArray
        .slice(1)
        .some((id) => id % nbSquares === 0);
    }
    // if direction is vertical, check if the random start is too close to the bottom edge given the length of the ship to be painted
    if (randomDirection === 1) {
      tooCloseToEdge = shipDivsIdArray.some((id) => {
        return id > 99;
      });
    }

    let isTaken = true;
    if (!tooCloseToEdge) {
      // check if any of the squares the ship will be painted on is already taken
      isTaken = shipDivsIdArray.some((id) =>
        computerSquares[id].classList.contains('taken')
      );
      if (isTaken) {
      }
    }

    // place ship
    if (!tooCloseToEdge && !isTaken) {
      console.log('Ship placed on square numbers: ', shipDivsIdArray);
      shipDivsIdArray.forEach((id) =>
        computerSquares[id].classList.add('taken', ship.name)
      );
    } else {
      console.log('TRY AGAIN!');
      generate(ship);
    }
  }

  // rotate the user's ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical');
      submarine.classList.toggle('submarine-container-vertical');
      cruiser.classList.toggle('cruiser-container-vertical');
      battleship.classList.toggle('battleship-container-vertical');
      carrier.classList.toggle('carrier-container-vertical');
      isHorizontal = false;
      return;
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical');
      submarine.classList.toggle('submarine-container-vertical');
      cruiser.classList.toggle('cruiser-container-vertical');
      battleship.classList.toggle('battleship-container-vertical');
      carrier.classList.toggle('carrier-container-vertical');
      isHorizontal = true;
      return;
    }
  }
  rotateButton.addEventListener('click', rotate);

  // let the user place his/her ships
  // listen for user moving his/her ship around
  ships.forEach((ship) => ship.addEventListener('dragstart', dragStart));
  userSquares.forEach((square) =>
    square.addEventListener('dragstart', dragStart)
  );
  userSquares.forEach((square) =>
    square.addEventListener('dragover', dragOver)
  );
  userSquares.forEach((square) =>
    square.addEventListener('dragenter', dragEnter)
  );
  userSquares.forEach((square) =>
    square.addEventListener('dragleave', dragLeave)
  );
  userSquares.forEach((square) => square.addEventListener('drop', dragDrop));
  userSquares.forEach((square) => square.addEventListener('dragend', dragEnd));

  let selectedShipNameWithIndex;
  let draggedShip;
  let draggedShipDivsArray;
  let draggedShipLength;

  // grab id of whichever ship we are dragging
  ships.forEach((ship) =>
    ship.addEventListener('mousedown', (e) => {
      selectedShipNameWithIndex = e.target.id; // returns for ex 'submarine-1' - depends where the mouse grabbed the ship
    })
  );

  function dragStart() {
    draggedShip = this; // get the entire div ship container with its div squares inside
    draggedShipDivsArray = draggedShip.getElementsByTagName('div'); // get array of div square inside entire div ship container
    draggedShipLength = draggedShipDivsArray.length; // count how many divs are in the ship container that was grabbed
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragEnter(e) {
    e.preventDefault();
  }

  function dragLeave() {
    // e.preventDefault();
  }

  function dragDrop() {
    // get the last child's id (last div's id of all the divs that are in the ship container we dragged)
    let shipNameWithLastId = draggedShipDivsArray[draggedShipLength - 1].id;
    // get ship category (destroyer, submarine, etc.)
    let shipClass = shipNameWithLastId.slice(0, -2);
    // get ship's last div id
    let shipLastIndex = parseInt(shipNameWithLastId.substr(-1));
    // get the index of the div square where our mouse landed on the ship we grabbed
    let selectedShipGrabIndex = parseInt(selectedShipNameWithIndex.substr(-1));
    // get the grid id where the ship's last div will land if horizontal
    let gridIdShipLastDivHorizontal =
      parseInt(this.dataset.id) + shipLastIndex - selectedShipGrabIndex;
    // get the grid id where the ship's first div will land if vertical
    let gridIdShipFirstDivVertical =
      parseInt(this.dataset.id) - selectedShipGrabIndex * nbSquares;

    // determine off-limit divs for ships placed horizontally
    const possiblyNotAllowedHorizontal = [
      10,
      20,
      30,
      40,
      50,
      60,
      70,
      80,
      90,
      100,
      11,
      21,
      31,
      41,
      51,
      61,
      71,
      81,
      91,
      101,
      2,
      12,
      22,
      32,
      42,
      52,
      62,
      72,
      82,
      92,
      102,
      3,
      13,
      23,
      33,
      43,
      53,
      63,
      73,
      83,
      93,
      103,
    ];
    let notAllowedHorizontal = possiblyNotAllowedHorizontal.splice(
      0,
      10 * shipLastIndex
    );

    // determine off-limit divs for ships placed vertically
    const possiblyNotAllowedVertical = [
      99,
      98,
      97,
      96,
      95,
      94,
      93,
      92,
      91,
      90,
      89,
      88,
      87,
      86,
      85,
      84,
      83,
      82,
      81,
      80,
      79,
      78,
      77,
      76,
      75,
      74,
      73,
      72,
      71,
      70,
      69,
      68,
      67,
      66,
      65,
      64,
      63,
      62,
      61,
      60,
    ];
    let notAllowedVertical = possiblyNotAllowedVertical.splice(
      0,
      10 * shipLastIndex
    );

    if (
      isHorizontal &&
      !notAllowedHorizontal.includes(gridIdShipLastDivHorizontal)
    ) {
      for (let i = 0; i < draggedShipLength; i++) {
        userSquares[
          parseInt(this.dataset.id) - selectedShipGrabIndex + i
        ].classList.add('taken', shipClass);
      }
    } else if (
      !isHorizontal &&
      !notAllowedVertical.includes(gridIdShipFirstDivVertical)
    ) {
      for (let i = 0; i < draggedShipLength; i++) {
        userSquares[
          parseInt(this.dataset.id) -
            nbSquares * selectedShipGrabIndex +
            nbSquares * i
        ].classList.add('taken', shipClass);
      }
    } else return;

    // remove ship from display grid once it's been placed
    displayGrid.removeChild(draggedShip);

    // verify that user placed all his/her ships
    if (!displayGrid.querySelector('.ship')) allShipsPlaced = true;
  }

  function dragEnd() {}

  // Game logic for multiplayer
  function playGameMulti(socket) {
    if (isGameOver) return;
    if (!ready) {
      socket.emit('player-ready');
      ready = true;
      playerReady(playerNum);
    }

    if (enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go';
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go";
      }
    }
  }

  function playerReady(num) {
    let playerClass = `.p${parseInt(num) + 1}`;
    document
      .querySelector(`${playerClass} .ready span`)
      .classList.toggle('green');
  }

  // Game logic for single player
  function playGameSingle() {
    if (isGameOver) return;
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go';
      computerSquares.forEach((square) =>
        square.addEventListener('click', function (e) {
          revealSquare(square);
        })
      );
    }
    if (currentPlayer === 'computer') {
      turnDisplay.innerHTML = "Computer's Go";
      // delay of 1s before computerGo function gets invoked
      setTimeout(computerGo, 1000);
    }
  }

  let destroyerCount = 0;
  let submarineCount = 0;
  let cruiserCount = 0;
  let battleshipCount = 0;
  let carrierCount = 0;
  function revealSquare(square) {
    if (!square.classList.contains('boom')) {
      // actions when player hits an enemy's ship
      if (square.classList.contains('destroyer')) destroyerCount++;
      if (square.classList.contains('submarine')) submarineCount++;
      if (square.classList.contains('cruiser')) cruiserCount++;
      if (square.classList.contains('battleship')) battleshipCount++;
      if (square.classList.contains('carrier')) carrierCount++;
      checkForWins();
    }
    if (square.classList.contains('taken')) {
      square.classList.add('boom');
    } else {
      square.classList.add('miss');
    }
    currentPlayer = 'computer';
    playGameSingle();
  }

  let cpuDestroyerCount = 0;
  let cpuSubmarineCount = 0;
  let cpuCruiserCount = 0;
  let cpuBattleshipCount = 0;
  let cpuCarrierCount = 0;
  function computerGo() {
    // computer picks a random square
    let random = Math.floor(Math.random() * userSquares.length);
    if (!userSquares[random].classList.contains('boom')) {
      userSquares[random].classList.add('boom');
      if (userSquares[random].classList.contains('destroyer'))
        cpuDestroyerCount++;
      if (userSquares[random].classList.contains('submarine'))
        cpuSubmarineCount++;
      if (userSquares[random].classList.contains('cruiser')) cpuCruiserCount++;
      if (userSquares[random].classList.contains('battleship'))
        cpuBattleshipCount++;
      if (userSquares[random].classList.contains('carrier')) cpuCarrierCount++;
      checkForWins();
    } else {
      computerGo();
    }
    currentPlayer = 'user';
  }

  function checkForWins() {
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = "You sunk the computer's destroyer";
      destroyerCount = 10;
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = "You sunk the computer's submarine";
      submarineCount = 10;
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = "You sunk the computer's cruiser";
      cruiserCount = 10;
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = "You sunk the computer's battleship";
      battleshipCount = 10;
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = "You sunk the computer's carrier";
      carrierCount = 10;
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = "You sunk the computer's destroyer";
      cpuDestroyerCount = 10;
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = "You sunk the computer's submarine";
      cpuSubmarineCount = 10;
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = "You sunk the computer's cruiser";
      cpuCruiserCount = 10;
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = "You sunk the computer's battleship";
      cpuBattleshipCount = 10;
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = "You sunk the computer's carrier";
      cpuCarrierCount = 10;
    }
    if (
      destroyerCount +
        submarineCount +
        cruiserCount +
        battleshipCount +
        carrierCount ===
      50
    ) {
      infoDisplay.innerHTML = 'YOU WIN!';
      gameOver();
    }
    if (
      cpuDestroyerCount +
        cpuSubmarineCount +
        cpuCruiserCount +
        cpuBattleshipCount +
        cpuCarrierCount ===
      50
    ) {
      infoDisplay.innerHTML = 'COMPUTER WINS!';
      gameOver();
    }
  }

  function gameOver() {
    isGameOver = true;
    startButton.removeEventListener('click', playGameSingle);
  }
});
