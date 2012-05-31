var retain = [];

function new_game() {
}

function make_move() {
	var startTime = new Date().getTime();
	
	var dx = [-1, 0, 1, 0, 0, 0];
	var dy = [0, -1, 0, 1, 0, 0];
	var MIN_DEPTH = 1;
	var MAX_DEPTH = 100;
	var PENALTY_DRAW = 0;
	var TIMEOUT_MSEC = 9720;
	
	var PERMUTE = [WEST, NORTH, EAST, SOUTH, TAKE, PASS];
	
	var killer = [];
	var guessed = false;
	var map = { w: WIDTH, h: HEIGHT, fruits: [], invents: [] };
	(function() {
		var board = [];
		var other = get_board();
		for(var i = 0; i < map.w; i++) {
			board[i] = [];
			for(var j = 0; j < map.h; j++) {
				board[i][j] = undefined;
				if(other[i][j] > 0) {
					board[i][j] = map.fruits.length;
					map.fruits.push({taken: false, x: i, y: j, type: other[i][j] - 1});
				}
			}
		}
		map.fruits.sort(function(a, b) {
			return a.type - b.type;
		});
		
		var nfruits = get_number_of_item_types();
		for(var i = 0; i < nfruits; i++) {
			map.invents.push([get_my_item_count(i+1), get_opponent_item_count(i+1), get_total_item_count(i+1)]);
		}
		
		for(var i = 0; i < retain.length; i++) killer[i] = board[retain[i].x][retain[i].y];
	}());
	
	var StaleStore = function() {
		var stale, hasHalf, won;
		
		this.update = function() {
			hasHalf = [0, 0];
			isHalf = [0, 0];
			won = [0, 0];
			for(var i = 0; i < map.invents.length; i++) {
				if(map.invents[i][0] >= map.invents[i][2] / 2) {
					if(map.invents[i][0] == map.invents[i][2] / 2) isHalf[0]++;
					if(map.invents[i][0] > map.invents[i][2] / 2) won[0]++;
					hasHalf[0]++;
				}
				if(map.invents[i][1] >= map.invents[i][2] / 2) {
					if(map.invents[i][1] == map.invents[i][2] / 2) isHalf[1]++;
					if(map.invents[i][1] > map.invents[i][2] / 2) won[1]++;
					hasHalf[1]++;
				}
			}
		}
		
		this.canWin = function(player) {
			var winnable = map.invents.length - hasHalf[1 - player];
			var tieable = isHalf[1 - player];
			
			return winnable > (map.invents.length - tieable) / 2;
		}
		
		this.isDraw = function() {
			return !this.canWin(0) && !this.canWin(1);
		}
		
		this.isWin = function(player) {
			if(won[player] > map.invents.length - hasHalf[player]) return true;
			return false;
		}
		
		this.isLoss = function(player) {
			return this.isWin(1 - player);
		}
	}
	var staleManager = new StaleStore();
	
	var State = function() {
		this.targets = [-1, -1];
		this.pos = [{x: -1, y: -1}, {x: -1, y: -1}];
		
		this.nextstate = function() {
			var dists = [
				Math.abs(this.pos[0].x - map.fruits[this.targets[0]].x) + Math.abs(this.pos[0].y - map.fruits[this.targets[0]].y),
				Math.abs(this.pos[1].x - map.fruits[this.targets[1]].x) + Math.abs(this.pos[1].y - map.fruits[this.targets[1]].y)
			];
			var next = new State();
			for(var i = 0; i < 2; i++) {
				if(dists[i] > dists[1 - i]) {
					next.targets[i] = this.targets[i];
					/* Be super careful the 1, it adjusts fully for time to take fruit. */
					var steps = dists[1 - i] + 1;
					var xdir = this.pos[i].x < map.fruits[this.targets[i]].x ? 1 : -1;
					var ydir = this.pos[i].y < map.fruits[this.targets[i]].y ? 1 : -1;
					var distx = Math.abs(this.pos[i].x - map.fruits[this.targets[i]].x);
					var disty = Math.abs(this.pos[i].y - map.fruits[this.targets[i]].y);
					if(steps >= distx) {
						steps -= distx;
						next.pos[i] = {x: map.fruits[this.targets[i]].x, y: this.pos[i].y + steps * ydir};
					}
					else {
						next.pos[i] = {x: this.pos[i].x + steps * xdir, y: this.pos[i].y};
					}
				}
				else {
					next.pos[i] = {x: map.fruits[this.targets[i]].x, y: map.fruits[this.targets[i]].y};
				}
			}
			return next;
		}
		var took = [false, false];
		this.domap = function() {
			var dists = [
				Math.abs(this.pos[0].x - map.fruits[this.targets[0]].x) + Math.abs(this.pos[0].y - map.fruits[this.targets[0]].y),
				Math.abs(this.pos[1].x - map.fruits[this.targets[1]].x) + Math.abs(this.pos[1].y - map.fruits[this.targets[1]].y)
			];
			if(dists[0] == dists[1] && this.targets[0] == this.targets[1]) {
				map.fruits[this.targets[0]].taken = true;
				map.invents[map.fruits[this.targets[0]].type][2]--;
				return;
			}
			else {
				for(var i = 0; i < 2; i++) {
					if(dists[i] <= dists[1 - i] && !map.fruits[this.targets[i]].taken) {
						map.fruits[this.targets[i]].taken = true;
						map.invents[map.fruits[this.targets[i]].type][i]++;
						took[i] = true;
					}
				}
			}
		}
		this.undomap = function() {
			var dists = [
				Math.abs(this.pos[0].x - map.fruits[this.targets[0]].x) + Math.abs(this.pos[0].y - map.fruits[this.targets[0]].y),
				Math.abs(this.pos[1].x - map.fruits[this.targets[1]].x) + Math.abs(this.pos[1].y - map.fruits[this.targets[1]].y)
			];
			if(dists[0] == dists[1] && this.targets[0] == this.targets[1]) {
				map.fruits[this.targets[0]].taken = false;
				map.invents[map.fruits[this.targets[0]].type][2]++;
			}
			else {
				for(var i = 0; i < 2; i++) {
					if(dists[i] <= dists[1 - i] && took[i]) {
						map.fruits[this.targets[i]].taken = false;
						map.invents[map.fruits[this.targets[i]].type][i]--;
					}
				}
			}
		}
	}

	function evaluate(state, player) {
		guessed = true;
		var score = 0;
		
		var pp = [0, 0], stale = [];
		for(var i = 0; i < map.invents.length; i++) {
			stale[i] = false;
			if(map.invents[i][0] > map.invents[i][2] / 2) {
				stale[i] = true;
				pp[0]++;
			}
			else if(map.invents[i][1] > map.invents[i][2] / 2) {
				stale[i] = true;
				pp[1]++;
			}
			else if(map.invents[i][0] + map.invents[i][1] == map.invents[i][2]) stale[i] = true;
			else {
				score += (map.invents[i][player] - map.invents[i][1 - player]) * (15.0 / (map.invents[i][2] - map.invents[i][0] - map.invents[i][1]));
			}
		}
		
		score += (pp[player] - pp[1 - player]) * 25;
		
		var dd = [0, 0];
		for(var i = 0; i < map.fruits.length; i++) {
			if(!stale[map.fruits[i].type] && !map.fruits[i].taken) {
				dd[0] += Math.sqrt(Math.abs(map.fruits[i].x - state.pos[0].x) + Math.abs(map.fruits[i].y - state.pos[0].y));
				dd[1] += Math.sqrt(Math.abs(map.fruits[i].x - state.pos[1].x) + Math.abs(map.fruits[i].y - state.pos[1].y));
			}
		}
				
		score += dd[1 - player] - dd[player];
		
		return score;
	}

	var curDepth = -1;
	
	//TODO: ALSO minimize time to win / draw
	function minimax(state, player, alpha, beta, depth) {
		var oldTarget = state.targets[player];
		var otherTarget = state.targets[1 - player];
		staleManager.update();
		if(staleManager.isDraw() || staleManager.isWin(player) || staleManager.isLoss(player)) {
			var path = [];
			for(var i = 0; i < map.fruits.length; i++) {
				if(!map.fruits[i].taken) {
					path.push(i);
					break;
				}
			}
			if(staleManager.isDraw()) return {alpha: PENALTY_DRAW, path: path};
			else if(staleManager.isWin(player)) return {alpha: Number.MAX_VALUE, path: path};
			else if(staleManager.isLoss(player)) return {alpha: -Number.MAX_VALUE, path: path};
		}
		
		if(depth >= curDepth) return {alpha: evaluate(state, player), path: [0]};
		
		var bestPath = [];
		var kill = killer[depth];
		for(var ii = -1; ii < map.fruits.length && !(new Date().getTime() - startTime > TIMEOUT_MSEC); ii++) {
			if(ii == -1 && kill == undefined) continue;
			var i = ii;
			if(ii == -1) i = kill;
			else if(ii == kill) continue;
			
			if(oldTarget >= 0 && i != oldTarget) continue;
			if(map.fruits[i].taken && oldTarget < 0) continue;
			
			var next = state;
			next.targets[1 - player] = otherTarget;
			next.targets[player] = i;
			if(player == 1) {
				state.domap();
				next = state.nextstate();
			}

			var res = minimax(next, 1 - player, -beta, -alpha, depth + 1);
			res.alpha = -res.alpha;
			if(res.alpha > alpha) {
				alpha = res.alpha;
				bestPath = [i];
				bestPath.push.apply(bestPath, res.path);
				
				killer[depth] = i;
			}
			
			if(player == 1) state.undomap();
			
			if(new Date().getTime() - startTime > TIMEOUT_MSEC) return {alpha: -Number.MAX_VALUE, path: [0]};
			
			if(alpha >= beta) break;
		}
		
		return {alpha: alpha, path: bestPath};
	}
	
	function getDirection(pos, fruit) {
		if(map.fruits[fruit].x > pos.x) return 2;
		else if(map.fruits[fruit].x < pos.x) return 0;
		else if(map.fruits[fruit].y > pos.y) return 3;
		else if(map.fruits[fruit].y < pos.y) return 1;
		else return 4;
	}
	
	var nextFruit = -1;
	for(var i = 0; i < map.fruits.length; i++) {
		if(!map.fruits[i].taken) {
			nextFruit = i;
			break;
		}
	}
	
	var initial = new State();
	initial.pos[0] = {x: get_my_x(), y: get_my_y()};
	initial.pos[1] = {x: get_opponent_x(), y: get_opponent_y()};
	for(var i = MIN_DEPTH; i < MAX_DEPTH && !(new Date().getTime() - startTime > TIMEOUT_MSEC); i++) {
		guessed = false;
		initial.targets[0] = -1;
		initial.targets[1] = -1;
		
		curDepth = 2 * i;
		var res = minimax(initial, 0, -Number.MAX_VALUE, Number.MAX_VALUE, 0);
		//console.log(i);
		
		if(res.alpha == -Number.MAX_VALUE) break;
		nextFruit = res.path[0];
		killer = res.path.slice(0);
		if(res.alpha == Number.MAX_VALUE || !guessed) break;
	}
	//console.log("Target: ", nextFruit);
	retain = [];
	for(var i = 2; i < killer.length; i++) {
		if(killer[i] == undefined) retain[i - 2] = {x: 0, y: 0}
		else retain[i - 2] = {x: map.fruits[killer[i]].x, y: map.fruits[killer[i]].y};
	}
	return PERMUTE[getDirection(initial.pos[0], nextFruit)];
}

//TODO: Better evaluation (need some played games first)
//TODO: Optimization
