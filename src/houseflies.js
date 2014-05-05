


function Point( x, y )
{
    this.x = x || 0;
    this.y = y || 0;
}

    Point.polar = function( l, a )
    {
        var x = Math.round( l * Math.cos( a ) );
        var y = Math.round( l * Math.sin( a ) );
        return new Point( x, y );
    };


function Agent( x, y, v )
{
    this.draw = false;
    this.created = new Date();
    this.p = new Point( x, y );
    this.a = 0;     // Angle
    this.v = 0;     // Velocity

    this.vec = function()
    {
        return Point.polar( this.v, this.a );
    };

    this.getNewAngles = function()
    {
        var rand = [];
        var arr = [];
        arr.push( this.a + -0.5 * Math.PI );
        arr.push( this.a );
        arr.push( this.a + 0.5 * Math.PI );

        var pos;
        for ( var i = arr.length; i > -1; i-- )
        {
            pos = Math.floor( Math.random() * ( arr.length ) );
            rand.push( arr.splice( pos, 1 )[ 0 ] );
        }

        return rand;
    };

    this.getNextPosition = function( a )
    {
        var vec = Point.polar( this.v, a );
        return new Point( this.p.x + vec.x, this.p.y + vec.y );
    };
}



var canvas = document.getElementsByTagName( "canvas" )[ 0 ];
var context = canvas.getContext( '2d' );

var junctionCanvas;
var junctionContext;


var debug = true;
var debugTotals = { updates: 0, calcs: 0, max: 0 }
var stats, gui, houseFlies;


var HouseFlyAgents = function()
{
    this.spacing = 20;
    this.bounds = { t: 0, r: 0, b: 0, l: 0 };
    this.rows;
    this.cols;
    this.interval;
    this.velocity = 5;


    this.fliesMax = 250; // Max
    this.fliesCurrent = 0;
    this.timeSpawn = 350;
    this.fadeOut = true;

    this.agents = [];
    this.calcs = '0';



    this.init = function()
    {
        document.body.addEventListener( 'keypress', this.keyHandler );

        window.onresize = this.resize.bind( this );

        this.resize();
        this.playPause();
    };

    this.resize = function()
    {
        // Should probably do something fancy re: resizing, but nothing for now
        var width = Math.floor( window.innerWidth / this.spacing );
        canvas.width = width * this.spacing - this.spacing;
        canvas.style.left = ( window.innerWidth - canvas.width ) * 0.5 + 'px';

        var height = Math.floor( window.innerHeight / this.spacing );
        canvas.height = height * this.spacing - this.spacing;


        if ( ! junctionCanvas )
        {
            junctionCanvas = document.createElement( 'canvas' );
            junctionContext = junctionCanvas.getContext( '2d' );
        }

        junctionCanvas.width = canvas.width;
        junctionCanvas.height = canvas.height;
        junctionContext.fillStyle = '#000';
        junctionContext.fillRect( 0, 0, canvas.width, canvas.height );


        this.rows = canvas.height / this.spacing;
        this.cols = canvas.width / this.spacing;


        this.bounds.t = 0 + this.spacing;
        this.bounds.r = canvas.width - this.spacing;
        this.bounds.b = canvas.height - this.spacing;
        this.bounds.l = 0 + this.spacing;


        // console.log( this.agents );
        var arr = [];
        for ( var i = 0; i < this.agents.length; i++ )
        {
            if ( ! this.isOutOfBounds( this.agents[ i ].p ) )
            {
                arr.push( this.agents[ i ] );
            }
        }
        this.agents = arr;

        if ( ! this.interval )
            this.draw();
    };





    // EVENT HANDLERS

    this.keyHandler = function( e )
    {
        // console.log( 'Key pressed:', e.charCode );
        if ( e.charCode == 112 || e.charCode == 80 ) // p
            houseFlies.playPause();

        if ( e.charCode == 114 || e.charCode == 82 ) // r
            houseFlies.reset();
    };


    this.reset = function()
    {
        junctionContext.globalAlpha = 1;
        junctionContext.globalCompositeOperation = 'source-over';
        junctionContext.fillStyle = '#000';
        junctionContext.fillRect( 0, 0, canvas.width, canvas.height );

        houseFlies.agents = [];
        houseFlies.calcs = '0';

        this.draw();
    };


    this.playPause = function()
    {
        // console.log( 'playPause:', interval );
        if ( ! this.interval )
        {
            if ( this.agents.length == 0 )
            {
                this.addAgent();
            }

            this.interval = requestAnimationFrame( this.update.bind( this ) );
        }
        else
        {
            cancelAnimationFrame( this.interval );
            this.interval = null;
        }
    };





    this.addAgent = function()
    {
        // Needs to be rewritten to use flat list of grid points
        var start = new Point( Math.floor( this.cols * 0.5 ), Math.floor( this.rows * 0.5 ) );
        start.x *= this.spacing;
        start.y *= this.spacing;

        var agent = new Agent();
        agent.p.y = start.y;
        agent.p.x = start.x;

        // Return a cardinal direction
        agent.a = Math.floor( Math.random() * 4 ) * 0.5 * Math.PI;
        agent.v = this.velocity;

        this.agents.push( agent );
    };




    this.update = function()
    {
        if ( this.interval == null ) return;

        if ( debug ) stats.begin();

        requestAnimationFrame( this.update.bind( this ) );

        this.draw();

        var agent;
        for ( var i = 0; i < this.agents.length; i++ )
        {
            agent = this.agents[ i ];
            agent.p.x += agent.vec().x;
            agent.p.y += agent.vec().y;


            // At junction, so change angle
            if ( agent.p.x % this.spacing == 0
                    && agent.p.y % this.spacing == 0
                    )
            {
                agent.draw = true;

                var w = 0; // While count
                var next;
                var angles = agent.getNewAngles();
                var a = angles[ w ];

                if ( this.isAtBounds( agent.p ) )
                {
                    var calcs = 0;
                    debugTotals.updates++;
                    debugTotals.calcs++;

                    next = agent.getNextPosition( a );

                    while ( this.isOutOfBounds( next ) )
                    {
                        calcs++;
                        debugTotals.calcs++;

                        if ( calcs > debugTotals.max )
                            debugTotals.max = calcs;

                        if ( w >= angles.length ) // Assumes two possible angles
                        {
                            alert( 'Exiting; caught in a while loop' );
                            clearInterval( this.interval );
                            this.interval = null;
                            break;
                        }

                        a = angles[ w ];
                        next = agent.getNextPosition( a );

                        w++;
                    }
                }

                agent.a = a;
            }
        }

        // Add agents
        if ( this.agents.length < this.fliesMax )
        {
            if ( this.agents.length == 0
                    || ( this.agents.length >= 1
                            && new Date().getTime() - this.agents[ this.agents.length - 1 ].created.getTime() > this.timeSpawn
                            )
                    )
            {
                this.addAgent();
            }
        }
        else if ( this.agents.length > this.fliesMax )
        {
            // Think of the children!
            this.agents = this.agents.slice( this.agents.length - this.fliesMax );
        }

        // Update GUI
        this.fliesCurrent = this.agents.length;

        if ( debugTotals.updates > 1 && debugTotals.updates % 60 == 0 )
        {
            this.calcs = Number( debugTotals.calcs / debugTotals.updates ).toFixed( 5 );
        }

        if ( debug ) stats.end();
    };


    this.draw = function()
    {
        if ( this.fadeOut )
        {
            // Apply fade to trails
            junctionContext.globalAlpha = 0.1;
            junctionContext.globalCompositeOperation = 'darker';
            junctionContext.fillStyle = '#000';
            junctionContext.fillRect( 0, 0, canvas.width, canvas.height );

            // Reset for drawing new point
            junctionContext.globalAlpha = 1;
            junctionContext.globalCompositeOperation = 'source-over';
        }
        context.drawImage( junctionCanvas, 0, 0 );

        var agent;
        var hw = 10;
        var time = new Date().getTime();
        for ( var i = 0; i < this.agents.length; i++ )
        {
            agent = this.agents[ i ];

            // Draw trail, always using the same green dot
            if ( agent.draw )
            {
                agent.draw = false;
                var pos = 15; // Position is set to 15 to force use of the darker green circle
                var sq = Math.sqrt( cacheMax );
                var y = Math.floor( pos / sq ) * hw;
                var x = pos % sq * hw;

                junctionContext.drawImage( cache, x, y, hw, hw, agent.p.x - hw * 0.5, agent.p.y - hw * 0.5, hw, hw );
            }

            // Draw current agent based on age
            var heat = 0;
            var diff = time - agent.created.getTime();
            if ( diff < 1600 )
            {
                heat = 3 - Math.floor( diff / 400 );
            }
            // console.log( heat );

            context.drawImage( cache, 40, heat * 10, hw, hw, agent.p.x - hw * 0.5, agent.p.y - hw * 0.5, hw, hw );
        }
    };

    this.isAtBounds = function( p )
    {
        return ( p.x == this.bounds.r
                    || p.x == this.bounds.l
                    || p.y == this.bounds.t
                    || p.y == this.bounds.b
                    );
    };

    this.isOutOfBounds = function( p )
    {
        return ( p.x < this.bounds.l
                    || p.x > this.bounds.r
                    || p.y < this.bounds.t
                    || p.y > this.bounds.b
                    );
    };

};














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

        // Agents
        var yellow = parseInt( ( y / rows ) * 255 );
        tempContext.fillStyle = 'rgba( 255, 255, ' + yellow + ', 1 )';
        tempContext.beginPath();
        tempContext.arc( hw * cols + offset , hw * y + offset, 5, 0, Math.PI * 2 );
        tempContext.fill();
	}

	cache = temp;
}




window.onload = function()
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

    buildCache();

    houseFlies = new HouseFlyAgents();

    gui = new dat.GUI();
    gui.add( houseFlies, 'fliesMax', 1, 5000 ).step( 1 );
    gui.add( houseFlies, 'timeSpawn', 0, 1000 );
    gui.add( houseFlies, 'fadeOut' );
    gui.add( houseFlies, 'reset' );
    gui.add( houseFlies, 'playPause' );

    var guiDebug = gui.addFolder( 'debug' );
    guiDebug.add( houseFlies, 'fliesCurrent' ).listen();
    guiDebug.add( houseFlies, 'calcs' ).listen();

    houseFlies.init();
};
