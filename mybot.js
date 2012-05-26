var killPath = [];

function new_game() {
	for(var i = 0; i < 202; i++) killPath[i] = 4; //killpath take..take..take as best initial guess
}

function make_move() {
	
	var startTime = new Date().getTime();
	
	var MAX_DEPTH = 5;
	var PENALTY_DRAW = 0;
	var TIMEOUT_MSEC = 9975;
	
	var PERMUTE = [WEST, NORTH, EAST, SOUTH, TAKE, PASS];
	
	var _other = get_board();
	var map = { w: WIDTH, h: HEIGHT, b: [] };
	
	for(var i = 0; i < map.w; i++) {
		map.b[i] = [];
		for(var j = 0; j < map.h; j++) {
			map.b[i][j] = _other[i][j] - 1;
		}
	}
	
	var cfruits = 0;
	var nfruits = get_number_of_item_types();
	var invents = [];
	for(var i = 0; i < nfruits; i++) {
		invents[i] = [get_my_item_count(i+1), get_opponent_item_count(i+1), get_total_item_count(i+1)];
		cfruits += invents[i][2];
	}
	
	var path = [];
	
	var dx = [-1, 0, 1, 0, 0, 0];
	var dy = [0, -1, 0, 1, 0, 0];
	
	var StaleStore = function() {
		var p1, p2, stale;
		this.stales = [];
		this.freshCount = 0;
		
		this.update = function() {
			p1 = 0, p2 = 0, stale = 0, this.freshCount = 0;
			for(var i = 0; i < nfruits; i++) {
				this.stales[i] = false;
				if(invents[i][0] > invents[i][2] / 2) {
					p1++;
					this.stales[i] = true;
				}
				else if(invents[i][1] > invents[i][2] / 2) {
					p2++;
					this.stales[i] = true;
				}
				else if(invents[i][0] + invents[i][1] == invents[i][2]) {
					stale++;
					this.stales[i] = true;
				}
				if(!this.stales[i]) this.freshCount += invents[i][2] - invents[i][0] - invents[i][1];
			}
		}
		
		this.isDraw = function() {
			return (p1 == p2 && p1 + p2 == nfruits - stale);
		}
		this.isWin = function(player) {
			if(player == 0) return p1 > (nfruits - stale) / 2;
			else return p2 > (nfruits - stale) / 2;
		}
		this.isLoss = function(player) {
			return this.isWin(1 - player);
		}
	}
	var staleManager = new StaleStore();
	
	var Pos = function(x, y) {
		this.x = x;
		this.y = y;
		
		this.move = function(dir) {
			return new Pos(x + dx[dir], y + dy[dir]);
		}
		
		this.unmove = function(dir) {
			return new Pos(x - dx[dir], y - dy[dir]);
		}
		
		this.clone = function() {
			return new Pos(x, y);
		}
	}

	var State = function() {
		this.positions = [];
		this.moves = [];
		this.targets = [];
		
		var fruitCache = [];
		var split = false;
		
		this.clone = function() {
			var x = new State();
			x.positions = [this.positions[0].clone(), this.positions[1].clone()];
			x.moves = [this.moves[0], this.moves[1]];
			if(this.targets[0] != undefined) x.targets[0] = {x: this.targets[0].x, y: this.targets[0].y};
			if(this.targets[1] != undefined) x.targets[1] = {x: this.targets[1].x, y: this.targets[1].y};
			return x;
		}
		
		this.do = function() {
			for(var i = 0; i < 2; i++) fruitCache[i] = map.b[this.positions[i].x][this.positions[i].y];
			if((this.positions[0].x == this.positions[1].x) && (this.positions[0].y == this.positions[0].y) &&
					(this.moves[0] == 4 && this.moves[1] == 4)) {
				split = true;
				invents[fruitCache[0]][2]--; // Global inventory drop
				map.b[this.positions[0].x][this.positions[0].y] = -1;
				return;
			}
			for(var i = 0; i < 2; i++) {
				if(this.moves[i] == 4) {
					invents[fruitCache[i]][i]++;
					map.b[this.positions[i].x][this.positions[i].y] = -1;
				}
			}
			this.positions[0] = this.positions[0].move(this.moves[0]);
			this.positions[1] = this.positions[1].move(this.moves[1]);
		}
		
		this.undo = function() {
			this.positions[0] = this.positions[0].unmove(this.moves[0]);
			this.positions[1] = this.positions[1].unmove(this.moves[1]);
			if(split) {
				invents[fruitCache[0]][2]++; //inventory restore
				map.b[this.positions[0].x][this.positions[0].y] = fruitCache[0];
			}
			else {
				for(var i = 0; i < 2; i++) {
					if(this.moves[i] == 4) invents[fruitCache[i]][i]--;
					map.b[this.positions[i].x][this.positions[i].y] = fruitCache[i];
				}
			}
		}
	}
	
	

	function evaluate(state, player) {
		var score = 0;
		
		var pp = [0, 0], stale = [];
		for(var i = 0; i < nfruits; i++) {
			stale[i] = false;
			if(invents[i][0] > invents[i][2] / 2) {
				stale[i] = true;
				pp[0]++;
			}
			else if(invents[i][1] > invents[i][2] / 2) {
				stale[i] = true;
				pp[1]++;
			}
			else if(invents[i][0] + invents[i][1] == invents[i][2]) stale[i] = true;
			else {
				score += (invents[i][player] - invents[i][1 - player]) * (15.0 / (invents[i][2] - invents[i][0] - invents[i][1]));
			}
		}
		
		score += (pp[player] - pp[1 - player]) * 25;
		
		//hacky rebalancer, move towards clustered regions when we dont know what to do
		var dd = [0, 0];
		for(var i = 0; i < map.w; i++) {
			for(var j = 0; j < map.h; j++) {
				if(map.b[i][j] >= 0 && !stale[map.b[i][j]]) {
					dd[0] += 1.1 * Math.sqrt(Math.abs(i - state.positions[0].x) + Math.abs(j - state.positions[0].y));
					dd[1] += 1.1 * Math.sqrt(Math.abs(i - state.positions[1].x) + Math.abs(j - state.positions[1].y));
				}
			}
		}
		
		//console.log("pp1 %d, pp2 %d", pp[0], pp[1], invents[0][0], invents[0][1]);
		//console.log("dd: ", dd[0], dd[1]);
		//console.log("prescore: ", score);
		
		score += dd[1 - player] - dd[player];
		
		return score;
	}
	
	function getClosest(state, player) {
		var dist = -1;
		var bi = -1, bj = -1;
		for(var i = 0; i < map.w; i++) {
			for(var j = 0; j < map.h; j++) {
				if(map.b[i][j] >= 0 && (dist < 0 || Math.abs(i - state.positions[player].x) + Math.abs(j - state.positions[player].y) < dist)) {
					bi = i;
					bj = j;
					dist = Math.abs(i - state.positions[player].x) + Math.abs(j - state.positions[player].y);
				}
			}
		}
		if(bi == -1 && bj == -1) return 5;
		else if(bi == state.positions[player].x && bj == state.positions[player].y) return 5;
		else if(bi < state.positions[player].x) return 0;
		else if(bi > state.positions[player].x) return 2;
		else if(bj < state.positions[player].y) return 3;
		else return 1;
	}
	
	function navigate(player, state) {
		if(state.positions[player].x == state.targets[player].x && state.positions[player].y == state.targets[player].y) return 4;
		else if(state.positions[player].x > state.targets[player].x) return 0;
		else if(state.positions[player].x < state.targets[player].x) return 2;
		else if(state.positions[player].y > state.targets[player].y) return 1;
		else if(state.positions[player].y < state.targets[player].y) return 3;
		else return 5; //should be impossible
	}
	
	function fullSearch(state, depth, player) {		
		var inFullSearch = function(state) {
			staleManager.update();
			if(staleManager.isDraw()) return 0;
			else if(staleManager.isWin(0)) return 1;
			else if(staleManager.isLoss(0)) return -1;
			
			var cfruits = []
			for(var i = 0; i < map.w; i++) {
				for(var j = 0; j < map.h; j++) {
					if(map.b[i][j] >= 0 && !staleManager.stales[map.b[i][j]]) {
						cfruits.push({x: i, y: j});
					}
				}
			}
			
			var cur = state.clone();
			while((cur.targets[0].x != cur.positions[0].x || cur.targets[0].y != cur.positions[0].y) &&
					(cur.targets[1].x != cur.positions[1].x || cur.targets[1].y != cur.positions[1].y)) {
				cur.positions[0] = cur.positions[0].move(navigate(0, cur));
				cur.positions[1] = cur.positions[1].move(navigate(1, cur));
			}
			var mm = -1;
			if(cur.targets[0].x == cur.positions[0].x && cur.targets[0].y == cur.positions[0].y &&
				cur.targets[1].x == cur.positions[1].x && cur.targets[1].y == cur.positions[1].y) {
				var next = cur.clone();
				if(map.b[next.targets[0].x][next.targets[0].y] >= 0) next.moves[0] = 4;
				else next.moves[0] = 5;
				if(map.b[next.targets[1].x][next.targets[1].y] >= 0) next.moves[1] = 4;
				else next.moves[1] = 5;
				next.do();
				for(var i = 0; i < cfruits.length; i++) {
					if(cfruits[i].x == cur.targets[0].x && cfruits[i].y == cur.targets[0].y) continue;
					if(cfruits[i].x == cur.targets[1].x && cfruits[i].y == cur.targets[1].y) continue;
					for(var j = 0; j < cfruits.length && !(new Date().getTime() - startTime > TIMEOUT_MSEC); j++) {
						if(cfruits[j].x == cur.targets[0].x && cfruits[j].y == cur.targets[0].y) continue;
						if(cfruits[j].x == cur.targets[1].x && cfruits[j].y == cur.targets[1].y) continue;
						next.targets[0] = cfruits[i];
						next.targets[1] = cfruits[j];
						var res = inFullSearch(next);
						if(res == 1) return 1;
						else mm = Math.max(mm, res);
						
						if(new Date().getTime() - startTime > TIMEOUT_MSEC) {
							next.undo();
							return -1;
						}
					}
				}
				next.undo();
			}
			else if(cur.targets[0].x == cur.positions[0].x && cur.targets[0].y == cur.positions[0].y) {
				var next = cur.clone();
				if(map.b[cur.targets[0].x][cur.targets[0].y] >= 0) next.moves[0] = 4;
				else next.moves[0] = 5; //hackish, really they shouldn't stop here
				next.moves[1] = navigate(1, cur);
				next.do();
				for(var i = 0; i < cfruits.length && !(new Date().getTime() - startTime > TIMEOUT_MSEC); i++) {
					if(cfruits[i].x == cur.targets[0].x && cfruits[i].y == cur.targets[0].y) continue;
					next.targets[0] = cfruits[i];
					var res = inFullSearch(next);
					if(res == 1) return 1;
					else mm = Math.max(mm, res);
					
					if(new Date().getTime() - startTime > TIMEOUT_MSEC) {
						next.undo();
						return -1;
					}
				}
				next.undo();
			}
			else if(cur.targets[1].x == cur.positions[1].x && cur.targets[1].y == cur.positions[1].y) {
				var next = cur.clone();
				if(map.b[cur.targets[1].x][cur.targets[1].y] >= 0) next.moves[1] = 4;
				else next.moves[1] = 5; //hackish again, really they shouldn't stop here
				next.moves[0] = navigate(0, cur);
				next.do();
				for(var i = 0; i < cfruits.length && !(new Date().getTime() - startTime > TIMEOUT_MSEC); i++) {
					if(cfruits[i].x == cur.targets[1].x && cfruits[i].y == cur.targets[1].y) continue;
					next.targets[1] = cfruits[i];
					var res = inFullSearch(next);
					if(res == 1) return 1;
					else mm = Math.max(mm, res);
					
					if(new Date().getTime() - startTime > TIMEOUT_MSEC) {
						next.undo();
						return -1;
					}
				}
				next.undo();
			}
			return mm;
		}
		
		var cfruits = [];
		for(var i = 0; i < map.w; i++) {
			for(var j = 0; j < map.h; j++) {
				if(map.b[i][j] >= 0 && !staleManager.stales[map.b[i][j]]) {
					cfruits.push({x: i, y: j});
				}
			}
		}
		path[depth] = 5;
		var mm = -1;
		var next = state.clone();
		for(var i = 0; i < cfruits.length; i++) {
			for(var j = 0; j < cfruits.length && !(new Date().getTime() - startTime > TIMEOUT_MSEC); j++) {
				next.targets[0] = cfruits[i];
				next.targets[1] = cfruits[j];
				var res = inFullSearch(next);
				if(res == 1) {
					path[depth] = navigate(player, next);
					return 1;
				}
				else if(res > mm) {
					path[depth] = navigate(player, next);
					mm = Math.max(mm, res);
				}
				if(new Date().getTime() - startTime > TIMEOUT_MSEC) return -1;
			}
		}
		return mm;
	}

	function minimax(state, player, alpha, beta, depth) {
		path[depth] = 5;
		
		staleManager.update();
		if(staleManager.isDraw()) {
			path[depth] = getClosest(state, player); 
			return PENALTY_DRAW;
		}
		else if(staleManager.isWin(player)) {
			path[depth] = getClosest(state, player);
			//if(depth == 0) console.log("won", path[depth]);
			return Number.MAX_VALUE;
		}
		else if(staleManager.isLoss(player)) {
			path[depth] = PASS; //maybe we can get a stalemate if they loop
			return -Number.MAX_VALUE;
		}
		
		if(staleManager.freshCount <= 5) {
			var ans = fullSearch(state, depth, player);
			if(ans == 1) return Number.MAX_VALUE;
			else if(ans == -1) return -Number.MAX_VALUE;
			else return 0;
		}
		
		if(depth >= 2 * MAX_DEPTH) return evaluate(state, player);
		
		var newPath = [];
		for(var i = depth; i < MAX_DEPTH; i++) newPath[i - depth] = 0;
		var alphas = [];
		
		var kill = killPath[depth];
		for(var ii = -1; ii < 6 && !(new Date().getTime() - startTime > TIMEOUT_MSEC); ii++) {
			var i = ii;
			if(i == 0) i = 4; //try to take after killer to generate large alpha
			else if(i == 4) i = 0;
			if(i == kill) continue;
			if(i == -1) i = kill; //killer first
			
			alphas[i] = -100;
			var p = state.positions[player].move(i);
			if(p.x < 0 || p.x >= map.w || p.y < 0 || p.y >= map.h) continue;
			if(i == 4 && map.b[p.x][p.y] == -1) continue;
			
			var next = state.clone();
			next.moves[player] = i;
			if(player == 1) {
				next.do();
			}
			
			var nAlpha = -minimax(next, 1 - player, -beta, -alpha, depth + 1);
			alphas[i] = nAlpha;
			//console.log(depth + " pos " + i + " nalpha is " + nAlpha + " aa: " + alpha);
			if(nAlpha > alpha || (Math.abs(nAlpha - alpha) < 1e-6 && i == 4)) {
				alpha = nAlpha;
				newPath[0] = i;
				for(var j = depth + 1; j < MAX_DEPTH; j++) newPath[j - depth] = path[j];
				killPath[depth]  = i;
				//console.log(depth + " newpath is " + newPath);
			}
			
			if(player == 1) next.undo();
			
			if(new Date().getTime() - startTime > TIMEOUT_MSEC) return -Number.MAX_VALUE;
			
			if(alpha >= beta) break;
		}
		
		//console.log("minimax(dep=%d [%d %d %d] [%d %d %d] %d %d) -- bestMove " + alphas, depth, state.positions[0].x, state.positions[0].y, state.moves[0],
		//		state.positions[1].x, state.positions[1].y, state.moves[1], alpha, beta, newPath[0]);
		
		for(var i = depth; i < MAX_DEPTH; i++) path[i] = newPath[i - depth];
		//console.log(" got ppath: " + path.slice(depth, -1));
		return alpha;
	}
	
	var initial = new State();
	initial.positions[0] = new Pos(get_my_x(), get_my_y());
	initial.positions[1] = new Pos(get_opponent_x(), get_opponent_y());
	var lastMove = 0;
	for(var i = 1; i < 4 && !(new Date().getTime() - startTime > TIMEOUT_MSEC); i++) {
		MAX_DEPTH = i;
		//console.log("depth: ", i);
		var res = minimax(initial, 0, -Number.MAX_VALUE, Number.MAX_VALUE, 0);
		if(res == Number.MAX_VALUE) return PERMUTE[path[0]];
		else if(res == -Number.MAX_VALUE) break;
		lastMove = path[0];
		
		for(var j = 0; j < MAX_DEPTH * 2; j++) killPath[j] = path[j];
	}
	//console.log(new Date().getTime() - startTime);
	for(var i = 0; i < MAX_DEPTH * 2 - 2; i++) killPath[i] = killPath[i + 2];
	killPath[MAX_DEPTH * 2 - 2] = 4;
	killPath[MAX_DEPTH * 2 - 1] = 4;
	return PERMUTE[lastMove];
}

//TODO: brute force all pairwise paths for low fruit-counts
//TODO: Strange cycle bug (killer misreading?)
//TODO: Better evaluation (need some played games first)
//TODO: Win detection for drawn but not yet fully eaten fruits
//TODO: Optimization
//TODO: alpha-beta with fruit vertices rather than squares for sparse grids (partial walks included)
