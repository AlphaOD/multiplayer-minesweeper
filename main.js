/**
 * Mason Miller
 * CS375
 * Minesweeper server
 */

var express = require("express");
var sockets = require("socket.io");
var game = require("./game.js");
var sql = require("mysql"); 

// SQL Schema: table minesweeper (id int primary key auto_increment, name varchar(30), score int default 0)
var sqlInfo = require("./sqlInfo.json"); 


var app = express(); 
app.use(express.static("./public_html"));
app.listen(8080, "0.0.0.0");

var io = sockets(25565);

var Game = new game.Game(30);

var pool = sql.createPool(sqlInfo);


/**
* Creates the initial connection to the client;
* Takes the player name and creates a unique ID to the player
*/
app.get("/connect", function(req,res){
  pool.getConnection(function (err, con) {
    con.query("INSERT INTO minesweeper (name) VALUES ('"+ req.query.name + "')")
    con.query("select id from minesweeper order by id desc limit 1;", function (err, val) { 
      let ID = val[0].id; 
      Game.addPlayer(ID);
      res.cookie(req.query.name, value=ID);
      res.sendStatus(200); 
    }); 
    con.release();
  })
});

/**
 * Returns all the entries in the table,
 * sorted by score.
 */
app.get("/scoreboard", function(req,res){
  pool.getConnection(function (err,con) {
    con.query("SELECT * FROM minesweeper ORDER BY score DESC", function (err, val) {
      con.release();
      res.send(val);
    });
  })
})

app.get("/currScore", function(req,res){
  pool.getConnection(function(err,con) {
    output = [];
    for(p of Game.players){
      con.query("SELECT name, score FROM minesweeper WHERE id = " + p, function (err, val) {
        output.push(val[0]);
      })
    }
    con.query("", function(err, val){
      con.release();
      res.send(output); 
    })
   
  })
})


io.on('connection', function (socket){
  
  // Checks for inactivity; if no one has made a move for the past 3 minutes,
  // the game will restart after another 3 minutes. 
  var notTimeout = true; 
  setInterval(function(){
    if(notTimeout)    
      notTimeout = false; 
    else{
      io.emit("gameEnd", -1);
      notTimeout = true;
      Game = new game.Game(30);
    }
  }, 180000)

  socket.on('requestBoard', function(user){
    if(!Game.players.includes(parseInt(user))) {
      Game.addPlayer(parseInt(user))
    }
    socket.emit("getBoard", Game.getBoard());
  });
  
  /**
   * Whenever somebody makes a move, this is called and 
   * then sends the updated board to everyone.
   * @var move - data containing x, y, and player ID 
   */ 
  socket.on('processMove',function(move){
    pool.getConnection(function (err,con){
      
      con.query("UPDATE minesweeper SET score = score + " + Game.processMove([move.x, move.y], parseInt(move.player)) + " WHERE id = " + parseInt(move.player));
      con.release();
      temp = Game.getData();
      io.emit("updateBoard", temp);
      notTimeout = true;

      if(Game.getVictory() !== 0){
        io.emit("gameEnd", Game.getVictory()); 
        Game = new game.Game(30); 
     }
    })
  });

  /**
   * Whenever somebody places or removes a flag, this is called and 
   * then sends the updated board to everyone.
   * @var move - data containing x, y, and player ID 
   */ 
  socket.on('processFlag', function(move){
    
    Game.toggleFlag([move.x,move.y],move.player);
    notTimeout = true; 
    io.emit("updateBoard",Game.getData());
  });


});