
// INI GLOBAL VARIABLE
var map;
var marker;
var circle;
var multi_marker = [];
var multi_infowindow = [];
var cacheTime = $("#cache_time").val(); // Cache Config 60 minute
cacheTime = parseInt(cacheTime);

if ( localStorage.getItem('tweetStorage') === null ) {

	var obj = [];
	localStorage.setItem('tweetStorage', JSON.stringify(obj));
}

// INI GLOBAL VARIABLE

$(document).ready(function() {
	
	console.info("Start oAuth Twitter ...");

	OAuth.initialize('aaOi_JjbM3fNth9xh1H5ZoXgV2Q');
	OAuth.popup('twitter').done(function(result) {

		console.info("Authenticate Success");
		initMap();
		geocodeLatLng();
	    // console.log(result);
	    // do some stuff with result

	    getTwitterResult(result); // FIRST CALL WHEN LOAD PAGE

	    // LISTEN GOOGLE EVENT
	    google.maps.event.addListener(map, 'center_changed', function() { } );
	    google.maps.event.addListener(map, 'dragend', function() { console.info('dragend'); getTwitterResult(result); geocodeLatLng(); } );
	    google.maps.event.addListener(map, 'zoom_changed', function() { console.info('zoom_changed'); getTwitterResult(result); geocodeLatLng(); } );
	    google.maps.event.addListener(map, 'click', function() { closeAllInfo(); });
	    // LISTEN GOOGLE EVENT

	    setTimeout(function() { $(".alert").fadeOut(300); }, 10000); // HIDE WARNING BOX

	})
	.fail(function (err) {
        //handle error with err
        console.error(err);
        console.error("Please make sure you run script with localhost or correct registered url.");
    });

});

function getTwitterResult(result) {

	var fetch_status = $('#fetch_status').val(); // CHECK STATUS FETCH DATA ON LIVE OR HISTORY

	if ( fetch_status == "on" ) {

		console.info("Start Pull Tweet ...");

		// $(".tweet").empty();
		
		result.get('https://api.twitter.com/1.1/search/tweets.json?geocode='+map.getCenter().lat()+','+map.getCenter().lng()+',50mi') // GET API CALL TO TWITTER
	    .done(function (response) {

	        console.info("Pull Tweet Success");
	        // console.log(response);

	        cleanMarker();

	        $.each(response.statuses, function(index, val) {
	        	 /* iterate through array or object */

	        	 // $(".tweet").append('<img src = "'+val.user.profile_image_url+'" />'+val.created_at+" : "+val.text+"<br />");
	        	 genInfoCard(val); // CREATE INFO WINDOW (Google Map)

	        });

	    })
	    .fail(function (err) {
	        //handle error with err
	        console.error(err);
	    });
	}
	else {

		showHistory(); // FETCH DATA FROM HISTORY
	}
}

function initMap() {

	// ******************** //
	// INI MAP & SEARCH BOX //
	// ******************** //
    
    //Create a map object and specify the DOM element for display.
    map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: 13.6741713, lng: 100.608395},
      scrollwheel: true,
      zoom: 10
    });

    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);

    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
      searchBox.setBounds(map.getBounds());
    });

    searchBox.addListener('places_changed', function() {
      var places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      // For each place, get the icon, name and location.
      var bounds = new google.maps.LatLngBounds();
      places.forEach(function(place) {

        if (!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }

        if (place.geometry.viewport) {
          // Only geocodes have viewport.
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });
      map.fitBounds(bounds);

    });
  }

function genRadius() {

	// ******************** //
	// MAKE CENTER RADIUS   //
	// ******************** //

	// console.log(map.getCenter().lat(), map.getCenter().lng());
	// $("#coordinate").text(map.getCenter().lat()+","+map.getCenter().lng());
	// marker.setMap(null);
	// circle.setMap(null);
	
	// Create marker 
	marker = new google.maps.Marker({
	  map: map,
	  position: new google.maps.LatLng(map.getCenter().lat(), map.getCenter().lng()),
	  title: 'Center Radius'
	});

	// Add circle overlay and bind to marker
	circle = new google.maps.Circle({
	  map: map,
	  radius: 50000,    // 10 miles in metres // UNIT METER
	  fillColor: '#cccccc'
	});
	// circle.bindTo('center', marker, 'position');
	marker.setMap(null);

}

function genInfoCard(tweetData) {

	// ******************************** //
	// GENERATE INFO CARD AROUND RADIUS //
	// ******************************** //
	
	var contentString = `
	<div id="content">
			<div id="siteNotice"></div>
			<h1 id="firstHeading" class="firstHeading"><img src = "${tweetData.user.profile_image_url_https}" /> ${tweetData.user.name}</h1>
			<div id="bodyContent">
  			<p>
  				${tweetData.text}
  			</p>
  			<p>
  				(Created at ${tweetData.created_at}).
  			</p>
			</div>
	</div>`;

	var infowindow = new google.maps.InfoWindow({
	    content: contentString
	});

   var randLAT = randomIntFromInterval(-4116, 4116);
	randLAT = randLAT / 10000;

	var randLNG = randomIntFromInterval(-4116, 4116);
	randLNG = randLNG / 10000;


	// MARKER CREATE

	var marker = new google.maps.Marker({
	  map: map,
	  position: new google.maps.LatLng(map.getCenter().lat()+randLAT, map.getCenter().lng()+randLNG),
	  title: tweetData.text,
	  // icon: 'assets/images/twitter-icon-40x40.png'
	  icon: tweetData.user.profile_image_url_https
	});

	marker.addListener('click', function() {
		closeAllInfo();
	    infowindow.open(map, marker);
	});

	multi_marker.push(marker);
	multi_infowindow.push(infowindow);

	// Storage Tweet Data

	tweetData.lat = map.getCenter().lat()+randLAT;
	tweetData.lng = map.getCenter().lng()+randLNG;

	tweetData.timeCache = new Date();

	var obj = JSON.parse(localStorage.getItem('tweetStorage'));
	obj.push(tweetData);
	localStorage.setItem('tweetStorage', JSON.stringify(obj));

	// Storage Tweet Data
}

function genInfoCardHistory(tweetData) {

	// ******************************** //
	// GENERATE INFO CARD AROUND RADIUS //
	// HISTORY
	// ******************************** //

	// After 1 Hour Not Show Tweet Cache

	var now = new Date();
	var tweetTime = new Date(tweetData.timeCache);

	var second =  Math.floor(((now-tweetTime)/1000));
	var minute = second / 60;

	if ( tweetData.lat < map.getCenter().lat()+0.4116 && tweetData.lat > map.getCenter().lat()-0.4116 && tweetData.lng < map.getCenter().lng()+0.4116 && tweetData.lng > map.getCenter().lng()-0.4116 && minute < cacheTime ) {

		var contentString = `
		<div id="content">
   			<div id="siteNotice"></div>
   			<h1 id="firstHeading" class="firstHeading"><img src = "${tweetData.user.profile_image_url_https}" /> ${tweetData.user.name}</h1>
   			<div id="bodyContent">
      			<p>
      				${tweetData.text}
      			</p>
      			<p>
      				(Created at ${tweetData.created_at}).
      			</p>
   			</div>
		</div>`;

		var infowindow = new google.maps.InfoWindow({
		    content: contentString
		});

		var marker = new google.maps.Marker({
		  map: map,
		  position: new google.maps.LatLng(tweetData.lat, tweetData.lng),
		  title: 'Multi Marker',
		  // icon: 'assets/images/twitter-icon-40x40.png'
		  icon: tweetData.user.profile_image_url_https
		});

		marker.addListener('click', function() {
			closeAllInfo();
		    infowindow.open(map, marker);
		});

		multi_marker.push(marker);
		multi_infowindow.push(infowindow);
	}
}

function showHistory() {

	// FETCH HISTORY FROM CACHE STORAGE
	
	var obj = JSON.parse(localStorage.getItem('tweetStorage'));
	// console.log(obj);

	cleanMarker();

	obj.forEach( function(element, index) {
		
		genInfoCardHistory(element);
	});
}

$('#liveHistoryBTN').on('click', function() {

	// LIVE, HISTORY BUTTON HANDLE

	if ( $(this).text() == "HISTORY MODE" ) {

		showHistory();
		$(this).text('LIVE MODE');
		$(this).addClass('btn-success');
		$(this).removeClass('btn-primary');
		$('#fetch_status').val('off');
		$('#statusColor').addClass('text-default');
		$('#statusColor').removeClass('text-danger');
		$('#statusColor').removeClass('blink');
		$('#statusColor').attr("title", "HISTORY MODE");
	}
	else {

		$(this).text('HISTORY MODE');
		$(this).addClass('btn-primary');
		$(this).removeClass('btn-success');
		$('#fetch_status').val('on');
		$('#statusColor').addClass('text-danger');
		$('#statusColor').removeClass('text-default');
		$('#statusColor').addClass('blink');
		$('#statusColor').attr("title", "LIVE MODE");

		map.setZoom(9);
	}
})

function closeAllInfo() {

	// CLOSE ALL INFO WINDOW

	if ( multi_infowindow.length  ) {

		for (var i = 0; i < multi_infowindow.length; i++) {

			multi_infowindow[i].close();
		}
	}
}

function cleanMarker() {

	// CLEAR ALL MARKER ON MAP
	
	if ( multi_marker.length  ) {

		for (var i = 0; i < multi_marker.length; i++) {

			multi_marker[i].setMap(null);
		}

		multi_marker = [];
	}
}

function geocodeLatLng() {

	// ***************************************** //
	// FIND LOCATION NAME BY LAT & LONG TITUDE   //
	// ***************************************** //

    var latlng = {lat: parseFloat(map.getCenter().lat()), lng: parseFloat(map.getCenter().lng())};

    var geocoder = new google.maps.Geocoder;
    geocoder.geocode({'location': latlng}, function(results, status) {

      if (status === 'OK') {

        if (results[1]) {

          // map.setZoom(11);
          // console.log(results[0].formatted_address);
          $("#tweetLocation").text(results[0].formatted_address);

        } else {

          console.info('No results found');
        }
      } else {

        console.error('Geocoder failed due to: ' + status);
      }
    });
  }

function randomIntFromInterval(min,max) {

    return Math.floor(Math.random()*(max-min+1)+min);
}

function cacheSetting() {

	var obj = JSON.parse(localStorage.getItem('tweetStorage'));
	
	if ( confirm("Your cache tweets size : "+obj.length+" record.\nYou want to clear cache or not?\n\ninfo : Too many tweets cache will make your application slowly.") ) {

		var obj = [];
		localStorage.setItem('tweetStorage', JSON.stringify(obj));
	}

	var cacheTimeNew = prompt("Config cache time (minute) : ", cacheTime);
	cacheTimeNew = (cacheTimeNew) ? cacheTimeNew : cacheTime;
	cacheTime = parseInt(cacheTimeNew);
	$("#cache_time").val(cacheTime); // Cache Config 60 minute
}

// google.maps.event.addListener(map, 'bounds_changed', function() { console.info('bounds_changed'); } );
// google.maps.event.addListener(map, 'center_changed', function() { console.info('center_changed'); } );
// google.maps.event.addListener(map, 'click', function() { console.info('click'); } );
// google.maps.event.addListener(map, 'dblclick', function() { console.info('dblclick'); } );
// google.maps.event.addListener(map, 'drag', function() { console.info('drag'); } );
// google.maps.event.addListener(map, 'dragend', function() { console.info('dragend'); } );
// google.maps.event.addListener(map, 'dragstart', function() { console.info('dragstart'); } );
// google.maps.event.addListener(map, 'heading_changed', function() { console.info('heading_changed'); } );
// google.maps.event.addListener(map, 'idle', function() { console.info('idle'); } );
// google.maps.event.addListener(map, 'maptypeid_changed', function() { console.info('maptypeid_changed'); } );
// google.maps.event.addListener(map, 'mousemove', function() { console.info('mousemove'); } );
// google.maps.event.addListener(map, 'mouseout', function() { console.info('mouseout'); } );
// google.maps.event.addListener(map, 'mouseover', function() { console.info('mouseover'); } );
// google.maps.event.addListener(map, 'projection_changed', function() { console.info('projection_changed'); } );
// google.maps.event.addListener(map, 'resize', function() { console.info('resize'); } );
// google.maps.event.addListener(map, 'rightclick', function() { console.info('rightclick'); } );
// google.maps.event.addListener(map, 'tilesloaded', function() { console.info('tilesloaded'); } );
// google.maps.event.addListener(map, 'tilt_changed', function() { console.info('tilt_changed'); } );
// google.maps.event.addListener(map, 'zoom_changed', function() { console.info('zoom_changed'); } );

// google.maps.event.addListener(map, 'center_changed', function() { console.info('center_changed'); circle.setMap(null); setCircle(); } );