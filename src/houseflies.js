


var stats;


var spacing = 20;
var canvas = document.getElementsByTagName( "canvas" )[ 0 ];
var context = canvas.getContext( '2d' );
var velocity = 5;


var interval;
var bounds = { t: 0, r: 0, b: 0, l: 0 };

var rows;
var cols;



var debug = true;
var debugTotals = { updates: 0, calcs: 0, max: 0 }



function Point( x, y )
{
	this.x = x || 0;
	this.y = y || 0;
	// console.log( this );
}

function Agent( x, y, v )
{
	this.p = new Point( x, y );
	this.v = v || new Point();	// Vector
	this.a = 0; 				// Angle
	this.draw = false;
	this.created = new Date();
}




function resize()
{
	// Should probably do something fancy re: resizing, but nothing for now
	if ( true )
	{
		var width = Math.floor( window.innerWidth / spacing );
		canvas.width = width * spacing - spacing;
		canvas.style.left = ( window.innerWidth - canvas.width ) * 0.5 + 'px';

		var height = Math.floor( window.innerHeight / spacing );
		canvas.height = height * spacing - spacing;
	}
	else
	{
		canvas.style.position = 'relative';
	}


	if ( ! junctionCanvas )
	{
		junctionCanvas = document.createElement( 'canvas' );
		junctionContext = junctionCanvas.getContext( '2d' );
	}

	junctionCanvas.width = canvas.width;
	junctionCanvas.height = canvas.height;
    junctionContext.fillStyle = '#000';
    junctionContext.fillRect( 0, 0, canvas.width, canvas.height );


	rows = canvas.height / spacing;
	cols = canvas.width / spacing;


	bounds.t = 0 + spacing;
	bounds.r = canvas.width - spacing;
	bounds.b = canvas.height - spacing;
	bounds.l = 0 + spacing;


	var arr = [];
	for ( var i = 0; i < houseFlies.agents.length; i++ )
	{
		if ( ! outOfBounds( houseFlies.agents[ i ].p ) )
		{
			arr.push( houseFlies.agents[ i ] );
		}
	}
    houseFlies.agents = arr;
}


function init()
{
	if ( debug )
	{
		stats = new Stats();
		stats.setMode(0);
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.left = '0px';
		stats.domElement.style.top = '0px';
		document.body.appendChild( stats.domElement );
	}


    houseFlies = new HouseFlyAgents();
    gui = new dat.GUI();
    gui.add(houseFlies, 'message');
    gui.add(houseFlies, 'flies', 1, 250).step( 1 );
    gui.add(houseFlies, 'timeSpawn', 0, 5000 );
    gui.add(houseFlies, 'fade');
    gui.add(houseFlies, 'reset');
    gui.add(houseFlies, 'playPause');
    var f1 = gui.addFolder( 'debug' );
    f1.add(houseFlies, 'fliesCurrent').listen();
    f1.add(houseFlies, 'calcs').listen();
    // console.log( gui );


    resize();


    buildCache();
	playPauseHandler();


    document.body.addEventListener( 'keypress', keyHandler );
}


var gui;
var houseFlies;
var HouseFlyAgents = function()
{
    this.message = 'House Fly Agents';
    this.flies = 50;
    this.fliesCurrent = 0;
    this.timeSpawn = 650;
    this.fade = true;
    this.reset = resetHandler;
    this.playPause = playPauseHandler;

    this.agents = [];
    this.calcs = '0';
};



function addAgent()
{
	var start = getRandomStartPoint();
	var agent = new Agent();
	agent.p.y = start.y;
	agent.p.x = start.x;
	agent.a = getNewAngle( agent );
	agent.v = getRandomVector();

    houseFlies.agents.push( agent );
}



function resetHandler()
{
    junctionContext.globalAlpha = 1;
    junctionContext.globalCompositeOperation = 'source-over';
    junctionContext.fillStyle = '#000';
    junctionContext.fillRect( 0, 0, canvas.width, canvas.height );

    // this.flies = 0;
    // houseFlies.flies = 0;
    houseFlies.agents = [];
    houseFlies.calcs = '0';
}


function keyHandler( e )
{
    // console.log( 'Key pressed:', e.charCode );
    if ( e.charCode == 112 || e.charCode == 80 ) // p
        playPauseHandler();

    if ( e.charCode == 114 || e.charCode == 82 ) // r
        resetHandler();
}


function playPauseHandler( e )
{
	// console.log( 'playPause:', interval );
	if ( ! interval )
	{
		if ( houseFlies.agents.length == 0 )
		{
			addAgent();
		}

		interval = requestAnimationFrame( update );
	}
	else
	{
		// clearInterval( interval );
		cancelAnimationFrame( interval );
		interval = null;
	}
}




// Needs to be rewritten to use flat list of grid points
function getRandomStartPoint()
{
	var start = new Point( Math.floor( cols * 0.5 ), Math.floor( rows * 0.5 ) );
	start.x *= spacing;
	start.y *= spacing;
	return start;
}



function update()
{
	if ( interval == null ) return;

	if ( debug ) stats.begin();

	requestAnimationFrame( update );

	draw();

	var agent;
	for ( var i = 0; i < houseFlies.agents.length; i++ )
	{
		agent = houseFlies.agents[ i ];
		if ( isJunction( agent.p ) )
		{
			agent.draw = true;


			var a = getNewAngle( agent );
			if ( isAtBoundary( agent.p ) )
			{
				var calcs = 0;
				debugTotals.updates++;

				// console.log( 'At boundary' )
				debugTotals.calcs++;

				var w = 0;
				while ( goingOutOfBounds( agent.p, a ) )
				{
					calcs++;
					debugTotals.calcs++;

					if ( calcs > debugTotals.max )
						debugTotals.max = calcs;

					if ( w > 50 )
					{
						console.log( 'Exiting; caught in a while loop' );
						clearInterval( interval );
						interval = null;
						break;
					}

					// console.log( 'Out of bounds:', getNewVector( a ) );
					a = getNewAngle( agent );

					w++;
				}
			}

			agent.a = a;
			agent.v = getNewVector( a );
		}
	}


	if ( houseFlies.agents.length < houseFlies.flies )
	{
        if ( houseFlies.agents.length == 0
                || ( houseFlies.agents.length >= 1
                        && new Date().getTime() - houseFlies.agents[ houseFlies.agents.length - 1 ].created.getTime() > houseFlies.timeSpawn
                        )
                )
        {
            addAgent();
        }
	}
    else if ( houseFlies.agents.length > houseFlies.flies )
    {
        // Think of the children!
        houseFlies.agents = houseFlies.agents.slice( houseFlies.agents.length - houseFlies.flies );
    }



    houseFlies.fliesCurrent = houseFlies.agents.length;



	if ( debugTotals.updates > 1 && debugTotals.updates % 60 == 0 )
	{
        houseFlies.calcs = Number( debugTotals.calcs / debugTotals.updates ).toFixed( 5 );
		// document.getElementById( 'calcsNumber' ).innerHTML = Number( debugTotals.calcs / debugTotals.updates ).toFixed( 5 );
	}



	if ( debug ) stats.end();
}




function isJunction( p )
{
	if ( p.x % spacing == 0
			&& p.y % spacing == 0
			)
	{
		return true;
	}
	else
	{
		return false;
	}
}


function isAtBoundary( p )
{
	if ( p.x == bounds.r
			|| p.x == bounds.l
			)
	{
		return true;
	}
	else if ( p.y == bounds.t
				|| p.y == bounds.b
				)
	{
		return true;
	}

	return false;
}





function goingOutOfBounds( p, a )
{
	var v = getNewVector( a );
	var next = new Point( p.x + v.x, p.y + v.y );

	if ( next.x < bounds.l
			|| next.x > bounds.r
			)
	{
		return true;
	}
	else if ( next.y < bounds.t
				|| next.y > bounds.b
				)
	{
		return true;
	}

	return false;
}


function outOfBounds( p )
{
	if ( p.x < bounds.l
			|| p.x > bounds.r
			)
	{
		return true;
	}
	else if ( p.y < bounds.t
				|| p.y > bounds.b
				)
	{
		return true;
	}

	return false;
}


function getNewAngle( agent )
{
	var newAngle = Math.floor( Math.random() * 3 ) - 1;
	newAngle *= 0.5;
	// console.log( newAngle );

	return agent.a + newAngle * Math.PI;
}

function getNewVector( a )
{
    var x = Math.round( velocity * Math.cos( a ) );
    var y = Math.round( velocity * Math.sin( a ) );

    return new Point( x, y ); 
}

function getRandomVector()
{
	var rand = Math.floor( Math.random() * 4 );

	switch( rand )
	{
		case 0:
			v = new Point( velocity, 0 );
			break;

		case 1:
			v = new Point( 0, velocity );
			break;

		case 2:
			v = new Point( -velocity, 0 );
			break;

		case 3:
			v = new Point( 0, -velocity );
			break;
	}

	return v;
}




var junctionCanvas;
var junctionContext;

function draw()
{
    if ( houseFlies.fade )
    {
        // /*
        // Apply fade to trails
        junctionContext.globalAlpha = 0.1; // 0.2;
        junctionContext.globalCompositeOperation = 'darker';
        junctionContext.fillStyle = '#000';
        junctionContext.fillRect( 0, 0, canvas.width, canvas.height );

        // Reset for drawing new point
        junctionContext.globalAlpha = 1;
        junctionContext.globalCompositeOperation = 'source-over';
        // */
    }


	context.drawImage( junctionCanvas, 0, 0 );


	var hw = 10;
	for ( var i = 0; i < houseFlies.agents.length; i++ )
	{
		agent = houseFlies.agents[ i ];

		if ( agent.draw )
		{
			agent.draw = false;
			var pos = 15; // Math.round( junction.getOpacity() * cacheMax );
			var sq = Math.sqrt( cacheMax );
			var y = Math.floor( pos / sq ) * hw;
			var x = pos % sq * hw;
			junctionContext.drawImage( cache, x, y, hw, hw, agent.p.x - hw * 0.5, agent.p.y - hw * 0.5, hw, hw );
		}

		agent.p.x += agent.v.x;
		agent.p.y += agent.v.y;

		// Draw current agent
		context.drawImage( cache, 40, 0, hw, hw, agent.p.x - hw * 0.5, agent.p.y - hw * 0.5, hw, hw );
	}
}



var cacheMax = 16;
var temp, tempContext;
var cache = new Image();

function buildCache()
{
	temp = document.createElement( 'canvas' );
	temp.height = temp.width = 128;
	temp.name = "junctions";
	tempContext = temp.getContext( '2d' );


	// Junctions
	var hw = 10;
	var offset = hw * 0.5;
	var junctionRadius = 4;
	var rows, cols;
	rows = cols = Math.sqrt( cacheMax );
	// console.log( rows, cols );

	var i = 0;
	for ( var y = 0; y < rows; y++ )
	{
		for ( var x = 0; x < cols; x++ )
		{
			var green = Number( Math.floor( i / cacheMax * 128 ) ).toString( 16 );
			green = ( green.length == 1 ) ? '0' + green : green ;
			tempContext.fillStyle = "#00" + green + "00";
			tempContext.beginPath();
			tempContext.arc( x * hw + offset, y * hw + offset, junctionRadius, 0, Math.PI * 2 );
			tempContext.fill();
			i++;
		}
	}


	// Agents
	tempContext.fillStyle = 'yellow';
	tempContext.beginPath();
	tempContext.arc( hw * cols + offset , offset, 5, 0, Math.PI * 2 );
	tempContext.fill();

	cache = temp;
}




window.onload = init;
window.onresize = resize;


