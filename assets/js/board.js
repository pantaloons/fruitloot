Array.prototype.transpose = function() {
 
  // Calculate the width and height of the Array
  var a = this,
    w = a.length ? a.length : 0,
    h = a[0] instanceof Array ? a[0].length : 0;
 
  // In case it is a zero matrix, no transpose routine needed.
  if(h === 0 || w === 0) { return []; }
 
  /**
   * @var {Number} i Counter
   * @var {Number} j Counter
   * @var {Array} t Transposed data is stored in this array.
   */
  var i, j, t = [];
 
  // Loop through every item in the outer array (height)
  for(i=0; i<h; i++) {
 
    // Insert a new row (array)
    t[i] = [];
 
    // Loop through every item per item in outer array (width)
    for(j=0; j<w; j++) {
 
      // Save transposed data.
      t[i][j] = a[j][i];
    }
  }
 
  return t;
};

var Board = {
	init3: function() {
		HEIGHT = 6;
		WIDTH = 6;
		
		Board.board =
			[[0, 0, 0, 0, 0, 0],
			 [0, 0, 0, 0, 0, 0],
			 [0, 0, 0, 0, 0, 0],
			 [0, 0, 0, 0, 0, 0],
			 [0, 0, 3, 0, 0, 0],
			 [0, 3, 0, 0, 2, 0]];
			
		Board.numberOfItemTypes = 3;
		Board.totalItems = [1, 3, 5];
		Board.myBotCollected = [1, 1, 1];
		Board.simpleBotCollected = [0, 1, 2];
        Board.myX = 3;
        Board.myY = 2;
        Board.oppX = 5;
        Board.oppY = 4;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
	},
	init: function() {
		
			
		HEIGHT = 5;
		WIDTH = 5;
		
		Board.board =
			[[4,0,3,0,0],
			[0,4,0,3,0],
			[0,0,0,4,4],
			[0,0,0,0,4],
			[3,0,0,3,0]].transpose();
			
			
		Board.numberOfItemTypes = 4;
		Board.totalItems = [1,3,5,7];
		Board.myBotCollected = [1.0,1.5,0.0,1.0];
		Board.simpleBotCollected = [0.0,1.5,1.0,1.0];
        Board.myX = 3;
        Board.myY = 2;
        Board.oppX = 3;
        Board.oppY = 2;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
	},
    init2: function() {
        var fullBoard;

        // initialize board
        HEIGHT = Math.min(Math.floor(Math.random() * 11) + 5, 15);
        WIDTH = Math.min(Math.floor(Math.random() * 11) + 5, 15);
        
        //HEIGHT = 5;
        //WIDTH = 5;
        
        Board.board = new Array(WIDTH);

        for (var i=0; i<WIDTH; i++) {
            Board.board[i] = new Array(HEIGHT);
            for (var j=0; j<HEIGHT; j++) {
                Board.board[i][j] = 0;
            }
        }

        Board.history = new Array(WIDTH);

        for (var i=0; i<WIDTH; i++) {
            Board.history[i] = new Array(HEIGHT);
            for (var j=0; j<HEIGHT; j++) {
                Board.history[i][j] = 0;
            }
        }

        // initialize items on board
        do {
            Board.numberOfItemTypes = Math.floor(Math.random() * 3 + 3);
        } while(Board.numberOfItemTypes * Board.numberOfItemTypes >= HEIGHT * WIDTH)
        Board.totalItems = new Array();
        Board.simpleBotCollected = new Array(Board.numberOfItemTypes);
        Board.myBotCollected = new Array(Board.numberOfItemTypes);
        var x;
        var y;
        for (var i=0; i<Board.numberOfItemTypes; i++) {
            Board.myBotCollected[i] = 0;
            Board.simpleBotCollected[i] = 0;
            Board.totalItems[i] = i * 2 + 1;
            for (var j=0; j<Board.totalItems[i]; j++) {
                do {
                    x = Math.min(Math.floor(Math.random() * WIDTH), WIDTH);
                    y = Math.min(Math.floor(Math.random() * HEIGHT), HEIGHT);
                } while (Board.board[x][y] != 0);
                Board.board[x][y] = i + 1;
            }
        }

        // get them the same starting position
        do {
            x = Math.min(Math.floor(Math.random() * WIDTH), WIDTH);
            y = Math.min(Math.floor(Math.random() * HEIGHT), HEIGHT);
        } while (Board.board[x][y] != 0);
        Board.myX = x;
        Board.myY = y;
        Board.oppX = x;
        Board.oppY = y;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
    },
    reset: function() {
        Board = Board.initial_state;
        Board.initial_state = {};
        jQuery.extend(true, Board.initial_state, Board);
        Board.newGame();
        GamePlay.start();
    },
    newGame: function() {
        var new_game_exists = undefined;
        try {
            new_game_exists = new_game;
        } catch(e) {
        }
        if(new_game_exists !== undefined) {
            new_game();
        }
        // SimpleBot currently doesn't need any sort of init, but if it did, it'd be called here too
    },
    processMove: function() {
        var myMove = make_move();
        var simpleBotMove = SimpleBot.makeMove();
        if ((Board.myX == Board.oppX) && (Board.myY == Board.oppY) && (myMove == TAKE) && (simpleBotMove == TAKE) && Board.board[Board.myX][Board.myY] > 0) {
            Board.myBotCollected[Board.board[Board.myX][Board.myY]-1] = Board.myBotCollected[Board.board[Board.myX][Board.myY]-1] + 0.5;
            Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1] = Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1] + 0.5;
            Board.board[Board.myX][Board.myY] = 0; 
        } else {
            if (myMove == TAKE && Board.board[Board.myX][Board.myY] > 0) {
                Board.myBotCollected[Board.board[Board.myX][Board.myY]-1]++;
                Board.board[Board.myX][Board.myY] = 0; 
            }
            if (simpleBotMove == TAKE && Board.board[Board.oppX][Board.oppY] > 0) {
                Board.simpleBotCollected[Board.board[Board.oppX][Board.oppY]-1]++;
                Board.board[Board.oppX][Board.oppY] = 0; 
            }
        }
        if (myMove == NORTH) {
            if (Board.myY - 1 >= 0) {
                Board.myY = Board.myY - 1;
            }
        }
        if (simpleBotMove == NORTH) {
            if (Board.oppY - 1 >= 0) {
                Board.oppY = Board.oppY - 1;
            }
        }
        if (myMove == SOUTH) {
            if (Board.myY + 1 < HEIGHT) {
                Board.myY = Board.myY + 1;
            }
        }
        if (simpleBotMove == SOUTH) {
            if (Board.oppY + 1 < HEIGHT) {
                Board.oppY = Board.oppY + 1;
            }
        }
        if (myMove == EAST) {
            if (Board.myX + 1 < WIDTH) {
                Board.myX = Board.myX + 1;
            }
        }
        if (simpleBotMove == EAST) {
            if (Board.oppX + 1 < WIDTH) {
                Board.oppX = Board.oppX + 1;
            }
        }
        if (myMove == WEST) {
            if (Board.myX - 1 >= 0) {
                Board.myX = Board.myX - 1;
            }
        }
        if (simpleBotMove == WEST) {
            if (Board.oppX - 1 >= 0) {
                Board.oppX = Board.oppX - 1;
            }
        }

        if (Board.myX == Board.oppX && Board.myY == Board.oppY) {
            Board.history[Board.myX][Board.myY] = 3;
        } else {
            Board.history[Board.myX][Board.myY] = 1;
            Board.history[Board.oppX][Board.oppY] = 2;
        }


    },
    noMoreItems: function() {
        for (var i=0; i<WIDTH; i++) {
            for (var j=0; j<HEIGHT; j++) {
                if (Board.board[i][j] != 0) {
                    return false;
                }
            }
        }
        return true;
    }
}

// Everything below is are API commands you can use.
// This, however, is not the actual API that's on the server
// but rather a working model of it for the purposes of giving
// you an environment to develop and debug in.

// don't rely on these constants to be the exact value listed here
var EAST = 1;
var NORTH = 2;
var WEST = 3;
var SOUTH = 4;
var TAKE = 5;
var PASS = 6;

var HEIGHT;
var WIDTH;

function has_item(i) {
    return i > 0;
}

function get_board() {
    return Board.board;
}

function get_number_of_item_types() {
    return Board.numberOfItemTypes;
}

function get_my_x() {
    return Board.myX;
}

function get_my_y() {
    return Board.myY;
}

function get_opponent_x() {
    return Board.oppX;
}

function get_opponent_y() {
    return Board.oppY;
}

function get_my_item_count(type) {
    return Board.myBotCollected[type-1];
}

function get_opponent_item_count(type) {
    return Board.simpleBotCollected[type-1];
}

function get_total_item_count(type) {
    return Board.totalItems[type-1];
}

function trace(mesg) {
    console.log(mesg);
}
