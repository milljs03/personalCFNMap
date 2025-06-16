
// main.js

var map, geocoder, drawingManager;
var drawnPolygons = [];
var selectedPolygon = null;
var editMode = false;
var mode = 'view';



function initMap() {
    var mapOptions = {
        zoom: 11,
        center: { lat: 41.5816015, lng: -85.8367576 }
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    geocoder = new google.maps.Geocoder();

    // Initialize the Drawing Manager with only polygons
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        drawingControlOptions: {
            drawingModes: ['polygon'] // Allow only polygons
        },
        polygonOptions: {
            editable: true,
            draggable: true,
            fillColor: '#d3d3d3' // Default fill color
        }
    });
    drawingManager.setMap(map);
    
    
    //Load the polygons into the map
    loadPolygonsFromDatabase();
    // Listen for polygon completion event
    google.maps.event.addListener(drawingManager, 'overlaycomplete', function (event) {
        if (event.type == google.maps.drawing.OverlayType.POLYGON) {
            var newPolygon = event.overlay;
            drawnPolygons.push(newPolygon);
    
            // Add click event listener to the polygon
            google.maps.event.addListener(newPolygon, 'click', function () {
                selectPolygon(newPolygon);
            });
            google.maps.event.addListener(polygon, 'dragend', function () {
                polygon.isModified = true;
            });
            
            google.maps.event.addListener(polygon.getPath(), 'set_at', function () {
                polygon.isModified = true;
            });
    
            // Add listener for polygon edits
        
            
        }
        
    });


    // Add a button to toggle edit mode
    
}


async function loadPolygonsFromDatabase() {
    console.log('Loading polygons from the database...');
    const polygonsData = await fetchPolygonsFromDatabase();
    console.log('Fetched polygons data:', polygonsData);
    const polygons = createPolygonsFromData(polygonsData);
    drawnPolygons = drawnPolygons.concat(polygons);

    // Draw each polygon on the map
    for (const polygon of polygons) {
        drawPolygonOnMap(polygon);
    }
}

function drawPolygonOnMap(polygon) {
    // Set the map for the polygon
    polygon.setMap(map);

    // Set isSaved to true
    polygon.isSaved = true;

    google.maps.event.addListener(polygon, 'dragend', function () {
        polygon.isModified = true;
    });
    
    google.maps.event.addListener(polygon.getPath(), 'set_at', function () {
        polygon.isModified = true;
    });

    // Optionally, you can add click event listener or other customization here
    google.maps.event.addListener(polygon, 'click', function () {
        selectPolygon(polygon);
    });
}



function parsePolygonCoordinates(polygonGeometry) {
    // Extracting the coordinates string and removing the 'POLYGON(' and ')' parts
    const coordinatesString = polygonGeometry.replace('POLYGON((', '').replace('))', '');
    console.log(coordinatesString);
    // Splitting the coordinates into an array
    const coordinatesArray = coordinatesString.split(',');
    console.log(coordinatesArray);
    // Mapping over the array to parse longitude and latitude
    const parsedCoordinates = coordinatesArray.map(coord => {
        const [longitude, latitude] = coord.trim().split(' ');
        return { lng: parseFloat(longitude), lat: parseFloat(latitude) };
    });

    return parsedCoordinates;
}


function toggleEditMode() {
    if (mode == 'edit')
        mode = 'view';
    else
        mode = 'edit';

    editMode = (mode === 'edit');

    setMapEditable(editMode);

    // Show/hide buttons based on the mode
    var buttons = document.querySelectorAll('.map-control-button');
    buttons.forEach(function (button) {
        button.style.display = editMode ? 'inline-block' : 'none';
    });

    if (!editMode && selectedPolygon) {
        selectedPolygon.setOptions({
            fillColor: selectedPolygon.originalFillColor,
            strokeColor: selectedPolygon.originalStrokeColor,
            strokeWeight: selectedPolygon.originalStrokeWeight
        });
        selectedPolygon = null;
    }
}

function setMapEditable(editable) {
    map.setOptions({ draggableCursor: editable ? 'crosshair' : null }); // Set crosshair cursor for drawing polygons

    drawingManager.setOptions({
        drawingControl: editable,
        drawingControlOptions: {
            drawingModes: editable ? ['polygon'] : [] // Allow only polygon drawing when in edit mode
        }
    });

    drawnPolygons.forEach(function (polygon) {
        polygon.setEditable(editable);
        polygon.setDraggable(mode == 'edit'); // Disable dragging in edit mode
    });
}

function findAddress() {
    var address = document.getElementById('address-input').value;
    geocoder.geocode({ 'address': address }, function (results, status) {
        if (status == 'OK') {
            map.setCenter(results[0].geometry.location);
            var newMarker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location
            });
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}


function setPointerCursor() {
    map.setOptions({ draggableCursor: null });
    drawingManager.setDrawingMode(null);

    if (selectedPolygon) {
        // Revert the color of the selected polygon
        selectedPolygon.setOptions({
            fillColor: selectedPolygon.originalFillColor,
            strokeColor: selectedPolygon.originalStrokeColor,
            strokeWeight: selectedPolygon.originalStrokeWeight
        });
        selectedPolygon = null;
    }
}

function enableDrawingMode() {
    if (editMode) {
        // Deselect the selected polygon, if any
        if (selectedPolygon) {
            selectedPolygon.setOptions({
                fillColor: selectedPolygon.originalFillColor,
                strokeColor: selectedPolygon.originalStrokeColor,
                strokeWeight: selectedPolygon.originalStrokeWeight
            });
            selectedPolygon = null;
        }

        map.setOptions({ draggableCursor: 'crosshair' });
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    }
}

// Add event listener for keydown event
document.addEventListener('keydown', function (e) {
    // Check if the pressed key is the Backspace key (key code 8)
    if (e.key === 'Backspace' || e.keyCode === 8) {
        deleteSelectedPolygon();
    }
});

// Delete selected polygon
async function deleteSelectedPolygon() {
    if (editMode && selectedPolygon) {
        // Check if the polygon is marked as saved
        const isSaved = selectedPolygon.isSaved;

        // Get the unique identifier of the selected polygon using the 'id' property
        const polygonId = selectedPolygon.insertId;
        
        if (isSaved && polygonId !== undefined) {
            // Send a request to the server to delete the polygon from the database
            try {
                const response = await fetch(`http://localhost:3000/deletePolygon/${polygonId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    console.error(`Error deleting polygon: ${response.statusText}`);
                } else {
                    console.log(`Polygon deleted successfully from the database`);
                }
            } catch (error) {
                console.error('Error:', error.message);
            }
        }

        // Remove the polygon from the map
        selectedPolygon.setMap(null);

        // Remove the polygon from the drawnPolygons array
        const index = drawnPolygons.indexOf(selectedPolygon);
        if (index > -1) {
            drawnPolygons.splice(index, 1);
        }

        selectedPolygon = null;
    }
}



function selectPolygon(polygon) {
    if (editMode) {
        if (selectedPolygon) {
            // Revert the previously selected polygon to its original state
            selectedPolygon.setOptions({
                fillColor: selectedPolygon.originalFillColor,
                strokeColor: selectedPolygon.originalStrokeColor,
                strokeWeight: selectedPolygon.originalStrokeWeight,
                isModified: false, // Reset isModified when changing selection
            });
        }

        selectedPolygon = polygon;

        // Save the current state before changing it to red outline
        selectedPolygon.originalFillColor = polygon.get('fillColor');
        selectedPolygon.originalStrokeColor = polygon.get('strokeColor');
        selectedPolygon.originalStrokeWeight = polygon.get('strokeWeight');
        selectedPolygon.isModified = false; // Initialize isModified property
       
        // Set the red outline
        selectedPolygon.setOptions({
            strokeColor: '#FF0000', // Red color for stroke
            strokeWeight: 3, // Adjust the stroke weight as needed
        });
    }
}



function changePolygonColor() {
    var color = document.getElementById('polygon-color').value;
    if (editMode && selectedPolygon && color) {
        // Update the original color of the selected polygon
        selectedPolygon.originalFillColor = color;

        // Set the new color
        selectedPolygon.setOptions({ fillColor: color });

        // Send a request to update the color on the server
        selectedPolygon.isModified = true;
    }
}

async function updatePolygon(polygon) {
    // Check if the polygon is marked as saved
    const isSaved = polygon.isSaved;

    if (isSaved) {
        const polygonPath = polygon.getPath().getArray();
        
        if (polygonPath.length < 3) {
            console.error('Polygon must have at least 3 vertices');
            return;
        }

        // Ensure the starting and ending vertices are the same
        polygonPath.push(polygonPath[0]);

        // Generate the WKT string for the polygon geometry
        const wktString = `POLYGON((${polygonPath
            .map((vertex) => `${vertex.lng()} ${vertex.lat()}`)
            .join(', ')}))`;

        // Get the updated color
        const updatedColor = polygon.get('fillColor');

        // Get the updated tag from the dropdown
        const tagDropdown = document.getElementById('polygon-color');
        const updatedTag = tagDropdown.options[tagDropdown.selectedIndex].text;

        const polygonData = {
            polygon_geometry: wktString,
            color: updatedColor,
            tag: updatedTag,
        };

        try {
            const response = await fetch(`http://localhost:3000/updatePolygon/${polygon.insertId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(polygonData),
            });

            if (!response.ok) {
                console.error(`Error updating polygon: ${response.statusText}`);
            } else {
                console.log(`Polygon updated successfully`);
                
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

async function savePolygons() {
    // Iterate over drawnPolygons and send each polygon to the server
    for (const polygon of drawnPolygons) {
        if(polygon.isModified){
            updatePolygon(polygon);
            polygon.isModified = false;
        }
    

        
        if (polygon.isSaved) {
            console.log('Polygon is already saved.');
            continue; // Skip saving if the polygon is already saved
        }
        
        const polygonPath = polygon.getPath().getArray();
        const tagDropdown = document.getElementById('polygon-color');
        const tag = tagDropdown.options[tagDropdown.selectedIndex].text;

        if (polygonPath.length < 3) {
            console.error('Polygon must have at least 3 vertices');
            continue;
        }

        // Ensure the starting and ending vertices are the same
        polygonPath.push(polygonPath[0]);

        // Generate the WKT string for the polygon geometry
        const wktString = `POLYGON((${polygonPath
            .map((vertex) => `${vertex.lng()} ${vertex.lat()}`)
            .join(', ')}))`;

        const polygonData = {
            polygon_geometry: wktString,
            color: polygon.get('fillColor'),
            tag: tag,
        };

        // Log the generated WKT string
        console.log('Generated WKT string:', wktString);

        // Send a POST request to save the polygon data
        try {
            const response = await fetch('http://localhost:3000/insertPolygon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(polygonData),
            });

            if (!response.ok) {
                console.error(`Error saving polygon: ${response.statusText}`);
            } else {
                const result = await response.json(); // Parse the response JSON
                console.log(`Polygon saved successfully with id: ${result.insertId}`);

                // Update the polygon with the received ID
                polygon.isSaved = true;
                polygon.insertId = result.insertId;
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

async function fetchPolygonsFromDatabase() {
    try {
        const response = await fetch('http://localhost:3000/getPolygons'); // Replace with your actual endpoint
        if (!response.ok) {
            console.error(`Error fetching polygons: ${response.statusText}`);
            return [];
        }
        const data = await response.json();
        return data.polygons || [];
        
    } catch (error) {
        console.error('Error:', error.message);
        return [];
    }
    
}


function createPolygonsFromData(polygonsData) {
    console.log('Creating polygons from data...');
    return polygonsData.map(polygonData => {
        try {
            const coordinatesString = polygonData.polygon_geometry.replace('POLYGON((', '').replace('))', '');
            const coordinatesArray = coordinatesString.split(',');

            const polygonPath = coordinatesArray.map(coord => {
                const [longitude, latitude] = coord.trim().split(' ');
                return { lat: parseFloat(latitude), lng: parseFloat(longitude) };
            });

            const color = polygonData.color;
            const tag = polygonData.tag;
            polygonPath.pop();
            const newPolygon = new google.maps.Polygon({
                paths: polygonPath,
                fillColor: color,
                strokeColor: '#000000',
                strokeWeight: 2,
                editable: false,
                draggable: false,
                map: map
            });

            // Add click event listener to the polygon
            google.maps.event.addListener(newPolygon, 'click', function () {
                selectPolygon(newPolygon);
            });

            // Save additional data with the polygon
            newPolygon.isSaved = true;
            newPolygon.insertId = polygonData.id;

            console.log('Polygon created:', newPolygon);
            return newPolygon;
        } catch (error) {
            console.error('Error creating polygon:', error);
            return null; // Return null if there's an error creating the polygon
        }
    }).filter(polygon => polygon !== null); // Filter out null entries
}





