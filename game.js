/**
 * Mason Miller
 * CS375
 * Minesweeper map class and
 * game class
 */


class Minesweeper{

    /**
     * Creates the Minesweeper object; automatically
     * generates a map. 
     * @param {number} height - the desired height of the map 
     * @param {number} width - the desired width of the map
     * @param {number} weight - the number of bombs to place
     */
    constructor(height, width, weight){
        
        this.height = height;
        this.width = width; 
        this.data = [];
        this.bombs = new Array(weight);

        this.generate(this.height, this.width, weight);
    }
    
    
    /**
     * Generates a minesweeper map of <width> x <height> with <weight> bombs.
     * @param {number} height - the desired height of the map
     * @param {number} width - the desired width of the map 
     * @param {number} weight - the number of bombs to generate
     */
    generate(height, width, weight){
        

        //initialize map with 0's 
        for(let i = 0; i < height; i++){
            this.data[i] = []; 
            for(let j = 0; j < width; j++)
                this.data[i][j] = 0; 
        }
        
        //Seed the bombs to random locatoins
        for(let i = 0; i < weight; i++) {
            var loc;
            do{
                loc = [Math.floor(Math.random() * width), Math.floor(Math.random() * height)];
            }while(this.data[loc[0]][loc[1]] !== 0);
         
            // Set both the location on the map to -1, but also record the location of the bomb
            this.data[loc[0]][loc[1]] = -1;
            this.bombs[i] = loc; 
        }


        //Create the numbers around the bombs
        for(let point of this.bombs){
            for(let i = -1; i < 2; i++){
                for(let j = -1; j < 2; j++){
                    try {
                        // Make sure not to update any bombs themselves
                        if(this.data[i + point[0]][j + point[1]] >= 0)
                            this.data[i + point[0]][j + point[1]]++;
                    } catch (error) {
                        continue;
                    }
                }
            }
        }


    }

    // Output the map, mostly for debugging purposes. 
    print(){
        for(let i = 0; i < this.height; i++) {
            let str = "";
            for(let j = 0; j < this.width; j++) {
                str += this.data[i][j] + "\t";
            }
            console.log(str);
        }
    }
}

class Game{

    /**
     * Creates a multiplayer minesweeper game.
     * @param {number} size - the size to generate the game as 
     */
    constructor(size){
        this.size = size;
        this.board = new Minesweeper(size,size, size*size/5);
        this.uncover = [];
        this.changeList = [];
        for(let i = 0; i < size; i++){
            this.uncover[i] = [];
        }
        this.players = []; 
        this.losers = []; 
        this.winCount = 0; 
    }

    /**
     * Takes a player's ID and maps it to a simple id within the game
     * @param {*} playerID - player's User ID from the server 
     */
    addPlayer(playerID){
        this.players.push(playerID); 
    }

    /**
     * Parses data to be sent over the socket and clears the change list
     * @returns {JSON} the currently changed locations
     */
    getData(){
        let tempVal = this.changeList;
        this.changeList = [];

        return tempVal;
    }

    /**
     * Parses the game board to be sent over the socket
     * @returns {JSON} the game board
     */
    getBoard(){
        return this.uncover;
    }

    /**
     * Checks to see if the game is won or lost.
     * If all players are listed as losers, the game is lost and -1 is returned.
     * If all non-bomb spaces are uncovered, the game is won and 1 is returned.
     * Otherwise returns 0.
     */
    getVictory(){
        if(this.losers.length === this.players.length)
            return -1;
        if(this.winCount === this.size * this.size - this.board.bombs.length)
            return 1;
        return 0; 
    }

    /**
     * Takes a point and uncovers it. If the space is blank, it will
     * uncover all surrounding blank spaces. If the space is a bomb,
     * the player will be added to the loser list. Otherwise the space
     * is uncovered.
     * @param {number[]} space - the point to uncover 
     * @param {*} player - the player's browser ID 
     * @returns the point value of the space, which is synonomous with
     * the space's number. A clump of empty spaces only counts as 1 space.
     * Bombs return -1. 
     */
    processMove(space, player){
        if(this.uncover[space[0]][space[1]] === undefined && !this.losers.includes(player)) {
            switch(this.board.data[space[0]][space[1]]){
                case 0:
                    this.uncoverGroup(space, player);
                    return 1;
                case -1:
                    this.uncover[space[0]][space[1]] = [player, -1]
                    this.addChangeVal(space[0],space[1], player ,-1)
                    this.losers.push(player);
                    return 0;
                default:
                    this.uncover[space[0]][space[1]] = [player, this.board.data[space[0]][space[1]]]
                    this.addChangeVal(space[0],space[1],player,this.board.data[space[0]][space[1]])
                    this.winCount++;
                    return this.board.data[space[0]][space[1]]; 
            }
        }       
    }

    /**
     * Toggles a flag at the given space. Flags give no points, and will
     * not be toggled on an already uncovered space
     * @param {number []} space - the space to toggle a flag at
     * @param {*} player - the player's browser ID
     */
    toggleFlag(space, player){

        
        if(this.uncover[space[0]][space[1]] === undefined && !this.losers.includes(player)){
            this.uncover[space[0]][space[1]] = [player,10];
            this.addChangeVal(space[0],space[1],player,10)
        }else if(this.uncover[space[0]][space[1]][1] === 10 && !this.losers.includes(player)){
            this.uncover[space[0]][space[1]] = undefined;
            this.addChangeVal(space[0],space[1],player,undefined); 
        }
    }

    /**
     * Uncovers the adjacent spaces to the current index if they
     * are also empty
     * @param {number[]} space - the current space to uncover
     * @param {*} playerID - the game player ID of who uncovered the first in the series
     */
    uncoverGroup(space, playerID){
        try{
            if(space[0] > -1 && space[1] > -1)
                if(!this.board.data[space[0]][space[1]] && this.uncover[space[0]][space[1]] === undefined){
                    this.uncover[space[0]][space[1]] = [playerID, 0]
                    this.addChangeVal(space[0],space[1],playerID,0);
                    this.winCount++;

                    

                    // Go through all surrounding spaces 
                    for(let i = -1; i < 2; i++)
                        for(let j = -1; j < 2; j++)
                            if(!(i==0 && j==0))
                                this.uncoverGroup([i+space[0],j+space[1]],playerID);
                }
        }catch(error) {
            return
        }
    }
    
    /**
     * adds an entry to changeList
     * @param {number} xVal 
     * @param {number} yVal
     * @param {*} player the player game ID
     * @param {number} value the space's value 
     */
    addChangeVal(xVal, yVal, player, value){
        this.changeList.push({x: xVal, y: yVal, playerID: player, val: value});
    }
   
   
    // Outputs the currently uncovered spaces; primarily for debugging
    print(){
        for(let i = 0; i < 20; i++) {
            let str = "";
            for(let j = 0; j < 20; j++) {
                if(this.uncover[i][j] == undefined)
                    str+= "u\t"
                else
                    str += this.uncover[i][j] + "\t";
            }
            console.log(str);
        }
    }

}


exports.Game = Game;
exports.Minesweeper = Minesweeper;