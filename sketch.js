// Image Explorer - Interactive Canvas
let images = [];
let imageData = [];
let alertTimestamps = []; // Array of alert timestamps

// COMPLETELY NEW TIMELINE SYSTEM - Simple and Visual
let timeline = {
    currentAlertIndex: 0,
    isPlaying: false,
    totalAlerts: 0,
    playbackSpeed: 20.0, // Complete timeline in 20 seconds
    lastUpdateTime: 0,
    visibleObjectCount: 0,
    // Continuous time-based progression
    startTime: null,
    endTime: null,
    currentTime: null,
    timeProgress: 0.0 // 0.0 to 1.0 across entire timeline
};

// Item data class for rich object information
class ItemData {
    constructor(img, name, size, sentimentality, price, owner, entertainment, locationX, locationY, enterTime, duration) {
        this.img = img;
        this.name = name;
        
        // Object properties
        this.size = size; // 1-100 (physical size/importance)
        this.sentimentality = sentimentality; // 1-100 (emotional value)
        this.price = price; // monetary value
        this.owner = owner; // enum: 0-7 representing 8 people
        this.entertainment = entertainment; // 1-100 (fun/entertainment value)
        this.locationX = locationX; // x coordinate in location space
        this.locationY = locationY; // y coordinate in location space
        
        // SIMPLIFIED TIMELINE PROPERTIES
        this.enterTime = enterTime; // Alert index when object enters shelter
        this.duration = duration; // How long object stays (in alert units, not hours)
        this.isCurrentlyVisible = false; // Simple boolean - is it visible right now?
        this.shouldBeVisible = false; // Should it be visible at current time?
        this.visualScale = 1.0; // Scale for dramatic entrance/exit effects
        this.targetScale = 1.0; // Target scale
        
        // Display properties
        this.currentX = 0;
        this.currentY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.currentWidth = 0;
        this.currentHeight = 0;
        this.targetWidth = 0;
        this.targetHeight = 0;
        
        // Original grid position (for Explore mode)
        this.originalX = 0;
        this.originalY = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        
        this.placed = false;
    }
    
    // Smooth transition update
    update() {
        let easing = 0.05; // Smooth easing factor
        
        this.currentX = lerp(this.currentX, this.targetX, easing);
        this.currentY = lerp(this.currentY, this.targetY, easing);
        this.currentWidth = lerp(this.currentWidth, this.targetWidth, easing);
        this.currentHeight = lerp(this.currentHeight, this.targetHeight, easing);
        
        // Update visual scale for timeline effects
        this.visualScale = lerp(this.visualScale, this.targetScale, 0.1);
    }
    
    // Set target position and size
    setTarget(x, y, width, height) {
        this.targetX = x;
        this.targetY = y;
        this.targetWidth = width;
        this.targetHeight = height;
    }
    
    // Reset to original grid position
    resetToOriginal() {
        this.setTarget(this.originalX, this.originalY, this.originalWidth, this.originalHeight);
    }
    
    // Check if object should be visible at current alert index
    shouldBeVisibleAtAlert(currentAlertIndex) {
        // Object is visible from enterTime until enterTime + duration
        let enterAlert = this.enterTime;
        let exitAlert = this.enterTime + this.duration;
        
        let visible = currentAlertIndex >= enterAlert && currentAlertIndex < exitAlert;
        

        
        return visible;
    }
    
    // Update timeline visibility with dramatic effects
    updateTimelineVisibility(currentAlertIndex) {
        let newShouldBeVisible = this.shouldBeVisibleAtAlert(currentAlertIndex);
        
        // If visibility changed, trigger effects
        if (newShouldBeVisible !== this.shouldBeVisible) {
            this.shouldBeVisible = newShouldBeVisible;
            
            if (this.shouldBeVisible) {
                // Object entering - dramatic entrance
                this.visualScale = 0.1;
                this.targetScale = 1.2; // Bigger than normal
            } else {
                // Object leaving - dramatic exit
                this.targetScale = 0.1;
            }
        }
        
        // Update current visibility for rendering
        this.isCurrentlyVisible = this.shouldBeVisible;
    }
}

// Owner names (enum)
const OWNERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];

// Mode system
let currentMode = 'explore';
const MODES = {
    explore: 'Explore',
    size: 'Size',
    sentiment: 'Sentiment', 
    price: 'Price',
    owner: 'Owner',
    time: 'Time',
    location: 'Location'
};

let modeTransitioning = false;
let cameraLocked = false; // For Size mode camera lock

// Text labels for mode axes
let modeLabels = {
    currentMode: '',
    labels: [],
    targetOpacity: 0,
    currentOpacity: 0,
    transitionSpeed: 0.1
};

// Camera/View controls
let cameraX = 0;
let cameraY = 0;
let defaultZoom = 2.0; // Fixed zoom level for the entire canvas

// Edge navigation controls
let edgeThreshold = 400; // Distance from edge to start moving
let maxSpeed = 10; // Maximum movement speed

// Canvas dimensions
let canvasWidth = 3000;  // Large virtual canvas
let canvasHeight = 3000;

// Image file names (all your renamed images)
const imageFiles = [
    'advil.png', 'arak.png', 'baby_bottle.png', 'baby_toy.png', 
    'backpack.png', 'baloon.png', 'bamba.png', 'batteries.png', 'blanket.png',
    'catan.png', 'choclate_coockies.png', 'clothes_2.png', 'clothes.png', 'color_papers.png',
    'corn_can.png', 'cow_radio.png', 'dog_collar_leash.png', 'dog_food.png', 'emergancy_lamp.png',
    'english_cake.png', 'folding_chair.png', 'fork.png', 'grandma_jewelry.png', 'haaretz_paper.png',
    'hanger_game_book.png', 'keys.png', 'kindle.png', 'lool.png', 'mini_generator.png',
    'mobile_charger.png', 'motzetz.png', 'nine_stories_book.png', 'parenting_book.png', 'passport.png',
    'phone_charger.png', 'pillow.png', 'plastecine.png', 'plastic_bucket.png', 'plastic_chair.png',
    'rabit_doll.png', 'router.png', 'serenada_pills.png', 'smartphone.png', 'sneakers.png',
    'soft_football.png', 'standing_fan.png', 'tape.png', 'tiles.png', 'toilet_paper.png',
    'water.png', 'wine_glass.png', 'wipes.png'
];

function preload() {
    // Load alert timestamps
    loadJSON('tel_aviv_timestamps.json', function(data) {
        alertTimestamps = data;
        // Set timeline bounds
        if (alertTimestamps.length > 0) {
            timeline.totalAlerts = alertTimestamps.length;
            timeline.currentAlertIndex = 0;
            timeline.startTime = new Date(alertTimestamps[0]);
            timeline.endTime = new Date(alertTimestamps[alertTimestamps.length - 1]);
            timeline.currentTime = new Date(timeline.startTime);
            timeline.timeProgress = 0.0;
        }
    });

    // OWNER PROFILES:
    // 0: Yael (35, Female, Doctor) - Practical, health-conscious professional
    // 1: Yaron (42, Male, Teacher) - Intellectual, enjoys reading and culture
    // 2: Yoni (8, Male, Child) - Playful, loves toys and games
    // 3: Noa (28, Female, Engineer) - Tech-savvy, organized professional
    // 4: Esti (65, Female, Retired Grandmother) - Sentimental, family-oriented
    // 5: Omer (31, Male, Chef) - Culinary enthusiast, practical kitchen items
    // 6: Zohar (22, Female, Student) - Budget-conscious, studying lifestyle
    // 7: Yoav (45, Male, Electrician) - Hands-on, tools and practical items

    // Load all images and create ItemData objects with dynamic timeline entries
    const sampleData = [
        // [size, sentimentality, price, owner, time, locationX, locationY, enterTime, duration]
        // enterTime: alert index when object enters, duration: how many alerts it stays
        
        // IMMEDIATE ESSENTIALS (alerts 0-2) - grabbed in panic during first bombings
        [10, 5, 12, 7, 10, 150, 90, 1, 57],       // batteries - brought early, stays entire war
        [75, 80, 45, 4, 30, 180, 250, 0, 35],     // blanket - immediate comfort need
        [30, 30, 60, 3, 20, 400, 140, 1, 40],     // clothes - essential clothing
        [50, 85, 25, 4, 45, 350, 180, 0, 30],     // keys - grabbed instinctively, then lost
        
        // EARLY WAR ADDITIONS (alerts 3-8) - first organized shelter preparations  
        [12, 30, 4, 2, 40, 200, 180, 3, 6],       // bamba - quick snacks for child
        [15, 20, 6, 2, 65, 280, 160, 4, 4],       // chocolate_cookies - comfort food
        [30, 35, 85, 3, 25, 420, 120, 5, 15],     // clothes_2 - more clothing brought
        [18, 8, 15, 7, 20, 380, 200, 0, 57],      // emergancy_lamp - essential lighting throughout
        [12, 15, 8, 1, 35, 320, 240, 0, 57],      // toilet_paper - hygiene essential throughout
        [8, 5, 4, 5, 25, 200, 300, 0, 57],        // water - essential water supply throughout
        
        // MID-CONFLICT SURVIVAL (alerts 10-20) - longer-term shelter living
        [25, 90, 12, 4, 75, 90, 220, 10, 15],     // baby_toy - comfort for child during stress
        [30, 45, 25, 5, 40, 180, 320, 12, 10],    // corn_can - preserved food supplies
        [25, 25, 20, 5, 30, 240, 280, 13, 8],     // english_cake - special treat

        [35, 15, 45, 6, 50, 250, 200, 0, 57],     // folding_chair - essential seating throughout
        [20, 5, 35, 7, 15, 300, 150, 18, 10],     // phone_charger - keeping devices alive
        
        // INTENSE BOMBING PERIOD (alerts 22-28) - emergency supplies during heavy attacks
        [12, 30, 4, 2, 40, 200, 180, 23, 2],      // bamba - quick energy during stress

        [30, 25, 35, 1, 30, 250, 150, 28, 8],     // arak - alcohol for nerves
        
        // LATER WAR ADDITIONS (alerts 30-45) - adapting to prolonged conflict
        [45, 60, 55, 6, 85, 350, 200, 32, 15],    // catan - entertainment during lull
        [35, 75, 40, 1, 70, 280, 220, 34, 12],    // hanger_game_book - mental stimulation
        [40, 60, 120, 6, 80, 400, 250, 36, 10],   // kindle - digital entertainment
        [55, 40, 80, 1, 65, 320, 180, 38, 8],     // nine_stories_book - literature
        [25, 20, 30, 5, 45, 220, 200, 40, 6],     // plastecine - activity for child
        [15, 10, 25, 7, 35, 350, 280, 0, 57],     // standing_fan - essential cooling throughout
        [20, 25, 60, 6, 55, 300, 320, 0, 57],     // tiles - essential game throughout
        
        // FINAL PHASE (alerts 48-57) - war winding down, brief appearances
        [35, 15, 3, 2, 60, 300, 300, 50, 3],      // baloon - small joy for child
        [12, 5, 8, 1, 20, 280, 140, 52, 4],       // wipes - hygiene supplies
        [20, 30, 40, 4, 50, 380, 160, 54, 3],     // wine_glass - celebration of survival
        [25, 35, 25, 6, 40, 260, 240, 55, 2],     // soft_football - play resuming
        
        // REMAINING OBJECTS - continuing dynamic timeline pattern
        [20, 15, 8, 2, 30, 240, 160, 5, 8],      // color_papers - child creativity, early war
        [45, 25, 120, 6, 55, 320, 280, 19, 18],  // cow_radio - news/entertainment, mid-war
        [25, 70, 45, 4, 35, 200, 240, 9, 18],    // dog_collar_leash - pet briefly
        [20, 60, 35, 4, 40, 220, 260, 10, 15],   // dog_food - pet care
        [8, 5, 12, 5, 15, 180, 140, 6, 6],       // fork - eating utensil

        [15, 40, 8, 1, 50, 280, 180, 24, 6],     // haaretz_paper - news during intense period
        [25, 30, 15, 2, 65, 320, 200, 17, 8],    // lool - child snack, quick consumption
        [80, 15, 300, 7, 25, 450, 120, 0, 57],   // mini_generator - essential power throughout
        [20, 5, 25, 3, 20, 300, 160, 7, 10],     // mobile_charger - device charging
        [35, 20, 8, 2, 40, 260, 220, 13, 6],     // motzetz - comfort snack

        [60, 70, 80, 4, 60, 280, 300, 2, 28],    // pillow - comfort for first month
        [40, 10, 25, 6, 30, 380, 240, 14, 12],   // plastic_bucket - practical storage
        [30, 5, 40, 6, 25, 340, 200, 16, 15],    // plastic_chair - seating comfort
        [75, 85, 35, 4, 85, 400, 280, 3, 32],    // rabit_doll - child comfort
        [65, 20, 180, 7, 35, 450, 200, 0, 57],   // router - essential internet throughout
        [40, 25, 80, 6, 45, 320, 240, 29, 10],   // sneakers - footwear later
        [10, 5, 8, 7, 10, 200, 120, 9, 5],       // tape - quick repairs
        
        // MULTIPLE APPEARANCES - items that return at different times
        [12, 30, 4, 2, 40, 200, 180, 14, 3],     // bamba - second helping
        [15, 20, 6, 2, 65, 280, 160, 31, 4],     // chocolate_cookies - later treat
        [12, 5, 8, 1, 20, 280, 140, 53, 4]       // wipes - end-of-war cleanup
    ];
    
    for (let i = 0; i < imageFiles.length; i++) {
        let img = loadImage('images/' + imageFiles[i]);
        images.push(img);
        
        let data = sampleData[i] || [50, 50, 50, 0, 50, 250, 150, 0, 24]; // Default values if missing
        let itemData = new ItemData(
            img,
            imageFiles[i].replace('.png', ''),
            data[0], // size
            data[1], // sentimentality
            data[2], // price
            data[3], // owner
            data[4], // entertainment
            data[5], // locationX
            data[6], // locationY
            data[7], // enterTime (index in alertTimestamps)
            data[8]  // duration (hours)
        );
        
        imageData.push(itemData);
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Place images in organized grid (initial Explore mode)
    placeImagesInGrid();
    
    // Center camera on canvas (adjusted for zoom)
    cameraX = (-canvasWidth * defaultZoom) / 2 + width / 2;
    cameraY = (-canvasHeight * defaultZoom) / 2 + height / 2;
    
    // Initialize mode labels for the default mode
    setupModeLabels(currentMode);
}

function draw() {
    background(255); // White background
    
    // Handle edge-based navigation (only in explore mode and when camera is not locked)
    if (currentMode === 'explore' && !cameraLocked) {
        handleEdgeNavigation();
    }
    
    // Update all items for smooth transitions
    for (let item of imageData) {
        item.update();
    }
    
    // Update timeline specifically for time mode
    if (currentMode === 'time') {
        updateTimeline();
        
        // Update object visibility based on current timeline state
        timeline.visibleObjectCount = 0;
        for (let item of imageData) {
            item.updateTimelineVisibility(timeline.currentAlertIndex);
            if (item.isCurrentlyVisible) {
                timeline.visibleObjectCount++;
            }
            

        }
        

    }
    
    // Apply camera transformations
    push();
    translate(cameraX, cameraY);
    scale(defaultZoom);
    
    // Draw all placed images
    for (let item of imageData) {
        if (item.placed) {
            // Special handling for timeline mode
            if (currentMode === 'time') {
                // Only draw if visible
                if (!item.isCurrentlyVisible) continue;
                
                // Apply dramatic visual effects
                push();
                
                // Apply scale effect
                let effectiveWidth = item.currentWidth * item.visualScale;
                let effectiveHeight = item.currentHeight * item.visualScale;
                
                // Center the scaled image
                let centerX = item.currentX + item.currentWidth / 2;
                let centerY = item.currentY + item.currentHeight / 2;
                let scaledX = centerX - effectiveWidth / 2;
                let scaledY = centerY - effectiveHeight / 2;
                
                // No tinting - smooth appearance
                noTint();
                
                image(item.img, scaledX, scaledY, effectiveWidth, effectiveHeight);
                
                pop();
            } else {
                noTint();
                image(item.img, item.currentX, item.currentY, item.currentWidth, item.currentHeight);
            }
        }
    }
    
    // Reset tint
    noTint();
    
    // Draw border around virtual canvas (only in explore mode)
    if (currentMode === 'explore') {
        noFill();
        stroke(200);
        strokeWeight(2 / defaultZoom);
        rect(0, 0, canvasWidth, canvasHeight);
    }
    
    // Draw owner labels in owner mode with smooth animation
    if (window.ownerLabels && window.ownerLabels.length > 0) {
        // Update and animate each label
        for (let label of window.ownerLabels) {
            let easing = 0.08;
            
            // Update position
            label.currentX = lerp(label.currentX, label.targetX, easing);
            label.currentY = lerp(label.currentY, label.targetY, easing);
            
            // Update opacity based on current mode
            let targetOpacity = (currentMode === 'owner') ? 1 : 0;
            label.currentOpacity = lerp(label.currentOpacity, targetOpacity, easing);
            
            // Only draw if visible enough
            if (label.currentOpacity > 0.01) {
                textAlign(CENTER, CENTER);
                textSize(16 / defaultZoom);
                textFont('Arial');
                noStroke();
                
                let alpha = label.currentOpacity * 255;
                
                // Draw text
                fill(50, alpha);
                text(label.name, label.currentX, label.currentY - 8 / defaultZoom);
                text(`${label.age}, ${label.gender}`, label.currentX, label.currentY + 8 / defaultZoom);
             }
         }
         
         // Clean up labels that have completely faded out
         if (currentMode !== 'owner') {
             window.ownerLabels = window.ownerLabels.filter(label => label.currentOpacity > 0.001);
         }
     }
    
    pop();
    
    // Draw timeline (outside world coordinates, in screen coordinates)
    if (currentMode === 'time') {
        drawTimeline();
    }
    
    // Update and draw mode labels
    updateAndDrawModeLabels();
    
    // Draw mode UI
    drawModeUI();
}

function updateAndDrawModeLabels() {
    // Update animation for each label
    for (let label of modeLabels.labels) {
        // Smooth transition to target position
        let easing = 0.08;
        label.currentX = lerp(label.currentX, label.x, easing);
        label.currentY = lerp(label.currentY, label.y, easing);
        label.currentOpacity = lerp(label.currentOpacity, label.targetOpacity, easing);
    }
    
    // Update overall opacity
    modeLabels.currentOpacity = lerp(modeLabels.currentOpacity, modeLabels.targetOpacity, modeLabels.transitionSpeed);
    
    // Draw labels
    if (modeLabels.currentOpacity > 0.01) {
        push();
        
        // Set text properties
        textAlign(CENTER, CENTER);
        textSize(60);
        textFont('Arial Black');
        
        for (let label of modeLabels.labels) {
            if (label.currentOpacity > 0.01) {
                // Calculate screen position
                let screenX = label.currentX * width;
                let screenY = label.currentY * height;
                
                // Set opacity
                let alpha = label.currentOpacity * modeLabels.currentOpacity * 255;
                
                // Draw text without stroke
                noStroke();
                fill(50, alpha);
                text(label.text, screenX, screenY);
            }
        }
        
        pop();
    }
}

function handleEdgeNavigation() {
    // Calculate movement based on mouse position relative to screen edges
    let moveX = 0;
    let moveY = 0;
    
    // Left edge
    if (mouseX < edgeThreshold) {
        let intensity = (edgeThreshold - mouseX) / edgeThreshold;
        moveX = intensity * maxSpeed;
    }
    // Right edge
    else if (mouseX > width - edgeThreshold) {
        let intensity = (mouseX - (width - edgeThreshold)) / edgeThreshold;
        moveX = -intensity * maxSpeed;
    }
    
    // Top edge
    if (mouseY < edgeThreshold) {
        let intensity = (edgeThreshold - mouseY) / edgeThreshold;
        moveY = intensity * maxSpeed;
    }
    // Bottom edge
    else if (mouseY > height - edgeThreshold) {
        let intensity = (mouseY - (height - edgeThreshold)) / edgeThreshold;
        moveY = -intensity * maxSpeed;
    }
    
    // Apply movement (adjusted for zoom level)
    cameraX += moveX / defaultZoom;
    cameraY += moveY / defaultZoom;
    
    // Limit camera bounds to keep some content visible (adjusted for zoom)
    let boundsPadding = width / (4 * defaultZoom);
    cameraX = constrain(cameraX, -canvasWidth * defaultZoom + boundsPadding, boundsPadding);
    cameraY = constrain(cameraY, -canvasHeight * defaultZoom + boundsPadding, boundsPadding);
}

function placeImagesInGrid() {
    // First, scale images to reasonable sizes
    for (let i = 0; i < imageData.length; i++) {
        let item = imageData[i];
        let img = item.img;
        
        // Scale images to fit nicely (max 200px on longest side)
        let maxSize = 200;
        let scale = min(maxSize / img.width, maxSize / img.height);
        let width = img.width * scale;
        let height = img.height * scale;
        
        // Store original dimensions
        item.originalWidth = width;
        item.originalHeight = height;
        item.currentWidth = width;
        item.currentHeight = height;
        item.targetWidth = width;
        item.targetHeight = height;
    }
    
    // Grid settings
    let spacing = 190; // Equal spacing between image centers
    let cols = Math.ceil(Math.sqrt(imageData.length)); // Try to make a roughly square grid
    let rows = Math.ceil(imageData.length / cols);
    
    // Calculate starting position to center the grid
    let gridWidth = (cols - 1) * spacing;
    let gridHeight = (rows - 1) * spacing;
    let startX = (canvasWidth - gridWidth) / 2;
    let startY = (canvasHeight - gridHeight) / 2;
    
    // Place images in grid
    for (let i = 0; i < imageData.length; i++) {
        let item = imageData[i];
        let col = i % cols;
        let row = Math.floor(i / cols);
        
        // Calculate center position
        let centerX = startX + col * spacing;
        let centerY = startY + row * spacing;
        
        // Position image so its center is at the calculated position
        let x = centerX - item.originalWidth / 2;
        let y = centerY - item.originalHeight / 2;
        
        // Store original position
        item.originalX = x;
        item.originalY = y;
        item.currentX = x;
        item.currentY = y;
        item.targetX = x;
        item.targetY = y;
        item.placed = true;
    }
}

// Mode UI and interaction
function drawModeUI() {
    // Mode buttons at bottom right
    let buttonWidth = 80;
    let buttonHeight = 30;
    let margin = 10;
    let startX = width - buttonWidth - margin;
    let startY = height - (Object.keys(MODES).length * (buttonHeight + 5)) - margin;
    
    let i = 0;
    for (let [modeKey, modeName] of Object.entries(MODES)) {
        let x = startX;
        let y = startY + i * (buttonHeight + 5);
        
        // Button appearance
        if (currentMode === modeKey) {
            fill(50, 150, 250); // Active blue
            stroke(30, 120, 200);
        } else {
            fill(240, 240, 240); // Inactive gray
            stroke(200, 200, 200);
        }
        
        strokeWeight(2);
        rect(x, y, buttonWidth, buttonHeight, 5);
        
        // Button text
        fill(currentMode === modeKey ? 255 : 80);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(modeName, x + buttonWidth/2, y + buttonHeight/2);
        
        i++;
    }
}

function checkModeButtonClick(mx, my) {
    let buttonWidth = 80;
    let buttonHeight = 30;
    let margin = 10;
    let startX = width - buttonWidth - margin;
    let startY = height - (Object.keys(MODES).length * (buttonHeight + 5)) - margin;
    
    let i = 0;
    for (let [modeKey, modeName] of Object.entries(MODES)) {
        let x = startX;
        let y = startY + i * (buttonHeight + 5);
        
        if (mx >= x && mx <= x + buttonWidth && my >= y && my <= y + buttonHeight) {
            if (currentMode !== modeKey) {
                switchToMode(modeKey);
            }
            return true;
        }
        i++;
    }
    return false;
}

function switchToMode(newMode) {
    if (modeTransitioning) return;
    
    currentMode = newMode;
    modeTransitioning = true;
    
    // Handle camera locking for Size, Sentiment, Location, Owner, Price, and Time modes
    if (newMode === 'size' || newMode === 'sentiment' || newMode === 'location' || newMode === 'owner' || newMode === 'price' || newMode === 'time') {
        cameraLocked = true;
    } else {
        cameraLocked = false;
    }
    
    // When switching away from owner mode, don't delete labels immediately - let them fade out
    if (newMode !== 'owner' && window.ownerLabels) {
        for (let label of window.ownerLabels) {
            label.targetOpacity = 0;
        }
    }
    
    // Set up mode labels
    setupModeLabels(newMode);
    
    // Trigger layout change based on mode
    switch(newMode) {
        case 'explore':
            arrangeInExploreMode();
            break;
        case 'size':
            arrangeBySize();
            break;
        case 'sentiment':
            arrangeBySentiment();
            break;
        case 'price':
            arrangeByPrice();
            break;
        case 'owner':
            arrangeByOwner();
            break;
        case 'time':
            arrangeByTime();
            break;
        case 'location':
            arrangeByLocation();
            break;
    }
    
    // Reset transitioning flag after animation completes
    setTimeout(() => {
        modeTransitioning = false;
    }, 2000);
}

function setupModeLabels(mode) {
    modeLabels.currentMode = mode;
    modeLabels.labels = [];
    
    // Set up labels based on mode
    switch(mode) {
        case 'size':
            modeLabels.labels = [
                { text: 'BIG', x: 0.1, y: 0.2, fromSide: 'left' },
                { text: 'SMALL', x: 0.9, y: 0.2, fromSide: 'right' }
            ];
            modeLabels.targetOpacity = 1;
            break;
            
        case 'sentiment':
            modeLabels.labels = [
                { text: 'SENTIMENTAL', x: 0.5, y: 0.15, fromSide: 'top' },
                { text: 'FUNCTIONAL', x: 0.5, y: 0.85, fromSide: 'bottom' }
            ];
            modeLabels.targetOpacity = 1;
            break;
            
        case 'price':
            modeLabels.labels = [
                { text: 'EXPENSIVE', x: 0.85, y: 0.15, fromSide: 'top' },
                { text: 'CHEAP', x: 0.15, y: 0.85, fromSide: 'bottom' }
            ];
            modeLabels.targetOpacity = 1;
            break;
            
        case 'location':
            modeLabels.labels = [
                { text: 'LOCATION', x: 0.5, y: 0.5, fromSide: 'center' }
            ];
            modeLabels.targetOpacity = 1;
            break;
            
        default:
            modeLabels.targetOpacity = 0;
            break;
    }
    
    // Initialize each label's animation state
    for (let label of modeLabels.labels) {
        label.currentX = label.x;
        label.currentY = label.y;
        label.currentOpacity = 0;
        label.targetOpacity = 1;
        
        // Set initial position outside screen based on fromSide
        switch(label.fromSide) {
            case 'left':
                label.currentX = -0.2;
                break;
            case 'right':
                label.currentX = 1.2;
                break;
            case 'top':
                label.currentY = -0.2;
                break;
            case 'bottom':
                label.currentY = 1.2;
                break;
            case 'center':
                label.currentOpacity = 0;
                break;
        }
    }
}

// Mode arrangement functions
function arrangeInExploreMode() {
    for (let item of imageData) {
        item.resetToOriginal();
    }
}

function arrangeBySize() {
    // Sort by size and arrange horizontally with proportional scaling
    let sortedItems = [...imageData].sort((a, b) => b.size - a.size);
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let uiSpace = 100 / defaultZoom; // Space for UI at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - uiSpace;
    
    // Each object gets equal horizontal space
    let slotWidth = availableWidth / sortedItems.length;
    
    for (let i = 0; i < sortedItems.length; i++) {
        let item = sortedItems[i];
        
        // Calculate position within current screen view
        let centerX = screenLeft + margin + (i * slotWidth) + (slotWidth / 2);
        let centerY = screenTop + margin + (availableHeight / 2);
        
                 // Calculate size factor based on item's size property (smaller range)
         let sizeFactor = map(item.size, 1, 100, 0.04, 1);
         
         // Calculate aspect ratio to maintain proportions
         let aspectRatio = item.originalWidth / item.originalHeight;
         
         // Calculate maximum dimensions that fit in the slot while maintaining aspect ratio (smaller)
         let maxSlotWidth = slotWidth * 0.6; // Use 60% of slot width
         let maxSlotHeight = availableHeight * 0.4; // Use 40% of available height
        
        // Scale by size factor first
        let baseWidth = item.originalWidth * sizeFactor;
        let baseHeight = item.originalHeight * sizeFactor;
        
        // Then constrain to fit slot while maintaining aspect ratio
        let constrainedWidth = Math.min(baseWidth, maxSlotWidth);
        let constrainedHeight = Math.min(baseHeight, maxSlotHeight);
        
        // Apply aspect ratio constraint - reduce the dimension that's too large
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            // Width is the limiting factor
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            // Height is the limiting factor
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Final bounds check to ensure we don't exceed slot boundaries
        constrainedWidth = Math.min(constrainedWidth, maxSlotWidth);
        constrainedHeight = Math.min(constrainedHeight, maxSlotHeight);
        
        // If we had to reduce due to bounds, maintain aspect ratio
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Calculate final position (top-left corner)
        let finalX = centerX - (constrainedWidth / 2);
        let finalY = centerY - (constrainedHeight / 2);
        
        item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
    }
}

function arrangeBySentiment() {
    // Sort by sentiment (highest first - most sentimental at top)
    let sortedItems = [...imageData].sort((a, b) => b.sentimentality - a.sentimentality);
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let uiSpace = 100 / defaultZoom; // Space for UI at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - uiSpace;
    
    // Uniform scaling for all items (same proportion for all)
    let uniformScale = 0.4; // Adjust this to make all items smaller/larger
    let maxItemSize = Math.min(availableWidth, availableHeight) * 0.15; // Max 15% of available space
    
    for (let i = 0; i < sortedItems.length; i++) {
        let item = sortedItems[i];
        
        // Vertical position based on sentiment rank (most sentimental at top)
        let yProgress = i / (sortedItems.length - 1); // 0 to 1
        let y = screenTop + margin + (yProgress * availableHeight);
        
        // Random horizontal position
        let randomXProgress = Math.random(); // Random between 0 and 1
        let x = screenLeft + margin + (randomXProgress * availableWidth);
        
        // Calculate uniform size while maintaining aspect ratio
        let aspectRatio = item.originalWidth / item.originalHeight;
        
        // Apply uniform scaling
        let baseWidth = item.originalWidth * uniformScale;
        let baseHeight = item.originalHeight * uniformScale;
        
        // Constrain to maximum size while maintaining aspect ratio
        let constrainedWidth = Math.min(baseWidth, maxItemSize);
        let constrainedHeight = Math.min(baseHeight, maxItemSize);
        
        // Apply aspect ratio constraint
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Ensure we don't exceed maximum size
        constrainedWidth = Math.min(constrainedWidth, maxItemSize);
        constrainedHeight = Math.min(constrainedHeight, maxItemSize);
        
        // Recalculate aspect ratio if needed
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Calculate final position (top-left corner) ensuring item stays within bounds
        let finalX = Math.max(screenLeft + margin, 
                             Math.min(x - constrainedWidth/2, 
                                     screenLeft + screenWidth - margin - constrainedWidth));
        let finalY = Math.max(screenTop + margin, 
                             Math.min(y - constrainedHeight/2, 
                                     screenTop + screenHeight - margin - uiSpace - constrainedHeight));
        
        item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
    }
}

function arrangeByPrice() {
    // Sort by price (most expensive first - will go to top right)
    let sortedItems = [...imageData].sort((a, b) => b.price - a.price);
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let uiSpace = 100 / defaultZoom; // Space for UI at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - uiSpace;
    
    // Uniform scaling for all items (same proportion for all)
    let uniformScale = 0.3; // Same scale for all price items
    let maxItemSize = Math.min(availableWidth, availableHeight) * 0.12; // Max 12% of available space
    
    for (let i = 0; i < sortedItems.length; i++) {
        let item = sortedItems[i];
        
        // Calculate diagonal position from top-right (expensive) to bottom-left (cheap)
        let progress = i / (sortedItems.length - 1); // 0 to 1 (0 = most expensive, 1 = least expensive)
        
        // Most expensive (progress = 0) goes to top-right
        // Least expensive (progress = 1) goes to bottom-left
        let xProgress = 1 - progress; // 1 (right) to 0 (left)
        let yProgress = progress; // 0 (top) to 1 (bottom)
        
        // Calculate position within available screen space
        let targetX = screenLeft + margin + (xProgress * availableWidth);
        let targetY = screenTop + margin + (yProgress * availableHeight);
        
        // Calculate uniform size while maintaining aspect ratio
        let aspectRatio = item.originalWidth / item.originalHeight;
        
        // Apply uniform scaling
        let baseWidth = item.originalWidth * uniformScale;
        let baseHeight = item.originalHeight * uniformScale;
        
        // Constrain to maximum size while maintaining aspect ratio
        let constrainedWidth = Math.min(baseWidth, maxItemSize);
        let constrainedHeight = Math.min(baseHeight, maxItemSize);
        
        // Apply aspect ratio constraint
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Ensure we don't exceed maximum size
        constrainedWidth = Math.min(constrainedWidth, maxItemSize);
        constrainedHeight = Math.min(constrainedHeight, maxItemSize);
        
        // Recalculate aspect ratio if needed
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Calculate final position (top-left corner) ensuring item stays within bounds
        let finalX = Math.max(screenLeft + margin, 
                             Math.min(targetX - constrainedWidth/2, 
                                     screenLeft + screenWidth - margin - constrainedWidth));
        let finalY = Math.max(screenTop + margin, 
                             Math.min(targetY - constrainedHeight/2, 
                                     screenTop + screenHeight - margin - uiSpace - constrainedHeight));
        
        item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
    }
}

function arrangeByOwner() {
    // Group by owner
    let ownerGroups = {};
    for (let item of imageData) {
        if (!ownerGroups[item.owner]) {
            ownerGroups[item.owner] = [];
        }
        ownerGroups[item.owner].push(item);
    }
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let uiSpace = 100 / defaultZoom; // Space for UI at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - uiSpace;
    
    let numOwners = Object.keys(ownerGroups).length;
    
    // Calculate circle centers for each owner - spread randomly across screen
    let circleCenters = [];
    let minDistance = 300 / defaultZoom; // Minimum distance between circle centers
    
    for (let i = 0; i < numOwners; i++) {
        let attempts = 0;
        let centerX, centerY;
        
        do {
            centerX = screenLeft + margin + random(availableWidth);
            centerY = screenTop + margin + random(availableHeight);
            attempts++;
        } while (attempts < 100 && circleCenters.some(center => 
            dist(centerX, centerY, center.x, center.y) < minDistance));
        
        circleCenters.push({x: centerX, y: centerY});
    }
    
    // Uniform scaling for all items (same proportion for all)
    let uniformScale = 0.3; // Same scale for all owner mode items
    let maxItemSize = Math.min(availableWidth, availableHeight) * 0.12; // Max 12% of available space
    
    // Arrange each owner's items in a circle around their center
    let ownerIndex = 0;
    for (let [owner, items] of Object.entries(ownerGroups)) {
        let center = circleCenters[ownerIndex];
        let numItems = items.length;
        
        // Calculate circle radius based on number of items (increased for more space)
        let baseRadius = Math.min(180 / defaultZoom, Math.max(90 / defaultZoom, numItems * 12 / defaultZoom));
        
        if (numItems === 1) {
            // Single item placed at center
            let item = items[0];
            
            // Calculate uniform size while maintaining aspect ratio
            let aspectRatio = item.originalWidth / item.originalHeight;
            
            // Apply uniform scaling
            let baseWidth = item.originalWidth * uniformScale;
            let baseHeight = item.originalHeight * uniformScale;
            
            // Constrain to maximum size while maintaining aspect ratio
            let constrainedWidth = Math.min(baseWidth, maxItemSize);
            let constrainedHeight = Math.min(baseHeight, maxItemSize);
            
            // Apply aspect ratio constraint
            if (constrainedWidth / aspectRatio > constrainedHeight) {
                constrainedHeight = constrainedWidth / aspectRatio;
            } else {
                constrainedWidth = constrainedHeight * aspectRatio;
            }
            
            // Calculate final position (top-left corner) ensuring item stays within bounds
            let finalX = Math.max(screenLeft + margin, 
                                 Math.min(center.x - constrainedWidth/2, 
                                         screenLeft + screenWidth - margin - constrainedWidth));
            let finalY = Math.max(screenTop + margin, 
                                 Math.min(center.y - constrainedHeight/2, 
                                         screenTop + screenHeight - margin - uiSpace - constrainedHeight));
            
            item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
        } else {
            // Multiple items arranged in circle
            for (let i = 0; i < numItems; i++) {
                let item = items[i];
                let angle = (i / numItems) * TWO_PI;
                
                let targetX = center.x + cos(angle) * baseRadius;
                let targetY = center.y + sin(angle) * baseRadius;
                
                // Calculate uniform size while maintaining aspect ratio
                let aspectRatio = item.originalWidth / item.originalHeight;
                
                // Apply uniform scaling
                let baseWidth = item.originalWidth * uniformScale;
                let baseHeight = item.originalHeight * uniformScale;
                
                // Constrain to maximum size while maintaining aspect ratio
                let constrainedWidth = Math.min(baseWidth, maxItemSize);
                let constrainedHeight = Math.min(baseHeight, maxItemSize);
                
                // Apply aspect ratio constraint
                if (constrainedWidth / aspectRatio > constrainedHeight) {
                    constrainedHeight = constrainedWidth / aspectRatio;
                } else {
                    constrainedWidth = constrainedHeight * aspectRatio;
                }
                
                // Calculate final position (top-left corner) ensuring item stays within bounds
                let finalX = Math.max(screenLeft + margin, 
                                     Math.min(targetX - constrainedWidth/2, 
                                             screenLeft + screenWidth - margin - constrainedWidth));
                let finalY = Math.max(screenTop + margin, 
                                     Math.min(targetY - constrainedHeight/2, 
                                             screenTop + screenHeight - margin - uiSpace - constrainedHeight));
                
                item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
            }
        }
        
        ownerIndex++;
    }
    
    // Add owner details text at the bottom of each circle
    let ownerDetails = [
        { name: "Yael", age: 35, gender: "Female", profession: "Doctor" },
        { name: "Yaron", age: 42, gender: "Male", profession: "Teacher" },
        { name: "Yoni", age: 8, gender: "Male", profession: "Child" },
        { name: "Noa", age: 28, gender: "Female", profession: "Engineer" },
        { name: "Esti", age: 65, gender: "Female", profession: "Retired Grandmother" },
        { name: "Omer", age: 31, gender: "Male", profession: "Chef" },
        { name: "Zohar", age: 22, gender: "Female", profession: "Student" },
        { name: "Yoav", age: 45, gender: "Male", profession: "Electrician" }
    ];
    
    // Store owner text info for rendering in draw loop with animation
    if (!window.ownerLabels) window.ownerLabels = [];
    
    // Clear existing labels
    window.ownerLabels = [];
    
    ownerIndex = 0;
    for (let [owner, items] of Object.entries(ownerGroups)) {
        let center = circleCenters[ownerIndex];
        let details = ownerDetails[parseInt(owner)];
        
        // Position text in the center of the circle
        window.ownerLabels.push({
            x: center.x,
            y: center.y,
            currentX: center.x + random(-100, 100) / defaultZoom, // Start offset for animation
            currentY: center.y + random(-100, 100) / defaultZoom,
            targetX: center.x,
            targetY: center.y,
            currentOpacity: 0, // Start invisible
            targetOpacity: 1,
            name: details.name,
            age: details.age,
            gender: details.gender,
            profession: details.profession
        });
        
        ownerIndex++;
    }
}

function arrangeByTime() {
    // Timeline mode: video-like experience with scrubber and alert markers
    
    // Check if timeline is initialized
    if (alertTimestamps.length === 0) {
        // If timeline not loaded yet, show all objects
        for (let item of imageData) {
            item.isCurrentlyVisible = true;
        }
        return;
    }
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let timelineHeight = 80 / defaultZoom; // Space for timeline at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - timelineHeight;
    
    // Uniform scaling for all items
    let uniformScale = 0.4;
    let maxItemSize = Math.min(availableWidth, availableHeight) * 0.15; // Max 15% of available space
    
    // Position each item randomly but consistently
    for (let i = 0; i < imageData.length; i++) {
        let item = imageData[i];
        
        // Create consistent random position based on item name
        let seed = 0;
        for (let j = 0; j < item.name.length; j++) {
            seed += item.name.charCodeAt(j) * (j + 1); // Add position weight to avoid clustering
        }
        
        // Use different algorithms for X and Y to avoid correlation
        let pseudoRandomX = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
        let pseudoRandomY = Math.abs(Math.sin(seed * 78.233) * 43758.5453);
        
        // Get fractional parts for 0-1 range
        let randomX = pseudoRandomX - Math.floor(pseudoRandomX);
        let randomY = pseudoRandomY - Math.floor(pseudoRandomY);
        
        let targetX = screenLeft + margin + (randomX * availableWidth);
        let targetY = screenTop + margin + (randomY * availableHeight);
        
        // Calculate uniform size while maintaining aspect ratio
        let aspectRatio = item.originalWidth / item.originalHeight;
        
        // Apply uniform scaling
        let baseWidth = item.originalWidth * uniformScale;
        let baseHeight = item.originalHeight * uniformScale;
        
        // Constrain to maximum size while maintaining aspect ratio
        let constrainedWidth = Math.min(baseWidth, maxItemSize);
        let constrainedHeight = Math.min(baseHeight, maxItemSize);
        
        // Apply aspect ratio constraint
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Calculate final position (top-left corner) ensuring item stays within bounds
        let finalX = Math.max(screenLeft + margin, 
                             Math.min(targetX - constrainedWidth/2, 
                                     screenLeft + screenWidth - margin - constrainedWidth));
        let finalY = Math.max(screenTop + margin, 
                             Math.min(targetY - constrainedHeight/2, 
                                     screenTop + screenHeight - margin - timelineHeight - constrainedHeight));
        
        item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
    }
}

function updateTimeline() {
    if (alertTimestamps.length === 0 || !timeline.startTime) {
        return;
    }
    
    // Auto-play timeline if playing
    if (timeline.isPlaying) {
        let now = millis();
        
        // Calculate time progression (complete timeline in playbackSpeed seconds)
        let deltaTime = (now - timeline.lastUpdateTime) / 1000; // Convert to seconds
        let totalTimeSpan = (timeline.endTime - timeline.startTime) / 1000; // Total seconds in timeline
        let progressPerSecond = 1.0 / timeline.playbackSpeed; // Progress per real second
        
        timeline.timeProgress += deltaTime * progressPerSecond;
        timeline.lastUpdateTime = now;
        
        // Loop back to start if we reach the end
        if (timeline.timeProgress >= 1.0) {
            timeline.timeProgress = 0.0;
        }
        
        // Calculate current time within the timeline
        let timeOffset = timeline.timeProgress * (timeline.endTime - timeline.startTime);
        timeline.currentTime = new Date(timeline.startTime.getTime() + timeOffset);
        
        // Find which alert we should be at based on current time
        timeline.currentAlertIndex = 0;
        for (let i = 0; i < alertTimestamps.length; i++) {
            if (timeline.currentTime >= new Date(alertTimestamps[i])) {
                timeline.currentAlertIndex = i;
            } else {
                break;
            }
        }
    }
}

function drawTimeline() {
    if (alertTimestamps.length === 0) return;
    
    // Draw timeline UI on top of the transformed canvas (outside the pop/push)
    // We'll draw this in screen coordinates, not world coordinates
    
    // Timeline position in screen coordinates
    let margin = 50;
    let timelineY = height - 60;
    let timelineLeft = margin;
    let timelineWidth = width - (2 * margin);
    let timelineHeight = 8;
    
    // Draw timeline background
    fill(50, 50, 50);
    noStroke();
    rect(timelineLeft, timelineY, timelineWidth, timelineHeight);
    
    // Draw alert markers (red dots) - positioned by actual timestamps
    fill(255, 50, 50);
    
    // Calculate time span for proportional positioning
    let firstTimestamp = new Date(alertTimestamps[0]);
    let lastTimestamp = new Date(alertTimestamps[alertTimestamps.length - 1]);
    let totalTimeSpan = lastTimestamp - firstTimestamp;
    
    for (let i = 0; i < alertTimestamps.length; i++) {
        let currentTimestamp = new Date(alertTimestamps[i]);
        let timeFromStart = currentTimestamp - firstTimestamp;
        let progress = timeFromStart / totalTimeSpan;
        
        let markerX = timelineLeft + (progress * timelineWidth);
        let markerRadius = 3;
        
        circle(markerX, timelineY + timelineHeight/2, markerRadius * 2);
    }
    
    // Draw scrubber (current time indicator) - make it much more visible
    fill(255, 255, 0); // Bright yellow
    
    // Use continuous time progress for smooth movement
    let scrubberProgress = timeline.timeProgress;
    
    let scrubberX = timelineLeft + (scrubberProgress * timelineWidth);
    let scrubberWidth = 6; // Much wider
    let scrubberHeight = 24; // Taller
    
    rect(scrubberX - scrubberWidth/2, timelineY - 8, scrubberWidth, scrubberHeight);
    
    // Draw play/pause button
    let buttonSize = 30;
    let buttonX = margin;
    let buttonY = timelineY - 40;
    
    // Button color changes based on playing state
    if (timeline.isPlaying) {
        fill(50, 150, 50); // Green when playing
    } else {
        fill(100, 100, 100); // Gray when paused
    }
    stroke(200);
    strokeWeight(1);
    rect(buttonX, buttonY, buttonSize, buttonSize, 4);
    
    // Draw play/pause icon
    fill(255);
    noStroke();
    if (timeline.isPlaying) {
        // Pause icon (two bars)
        let barWidth = 4;
        let barHeight = 14;
        rect(buttonX + 8, buttonY + 8, barWidth, barHeight);
        rect(buttonX + 18, buttonY + 8, barWidth, barHeight);
    } else {
        // Play icon (triangle)
        triangle(buttonX + 10, buttonY + 8,
                buttonX + 10, buttonY + 22,
                buttonX + 22, buttonY + 15);
    }
    
    // Draw current time text
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(14);
    let timeText = formatTime(timeline.currentTime);
    text(timeText, buttonX + buttonSize + 15, buttonY + buttonSize/2);
    
    // Debug: Show visible objects count and playing state
    let playingText = timeline.isPlaying ? "PLAYING" : "PAUSED";
    text(`${playingText} | Visible: ${timeline.visibleObjectCount}/${imageData.length}`, buttonX + buttonSize + 15, buttonY + buttonSize/2 + 20);
    
    // Show current alert index for debugging
    text(`Alert: ${timeline.currentAlertIndex}/${timeline.totalAlerts - 1}`, buttonX + buttonSize + 15, buttonY + buttonSize/2 + 40);
    
    // Show progress percentage
    let progressPercent = timeline.timeProgress * 100;
    text(`Progress: ${progressPercent.toFixed(1)}%`, buttonX + buttonSize + 15, buttonY + buttonSize/2 + 60);
}

function formatTime(date) {
    if (!date) return "00:00";
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

function arrangeByLocation() {
    // Arrange objects based on their location coordinates
    
    // Calculate current screen bounds in world coordinates (accounting for camera and zoom)
    let screenLeft = (-cameraX) / defaultZoom;
    let screenTop = (-cameraY) / defaultZoom;
    let screenWidth = width / defaultZoom;
    let screenHeight = height / defaultZoom;
    
    // Conservative margins within the current screen view
    let margin = 50 / defaultZoom;
    let uiSpace = 100 / defaultZoom; // Space for UI at bottom
    let availableWidth = screenWidth - (2 * margin);
    let availableHeight = screenHeight - (2 * margin) - uiSpace;
    
    // Find the min/max location coordinates to map them to screen space
    let minX = Math.min(...imageData.map(item => item.locationX));
    let maxX = Math.max(...imageData.map(item => item.locationX));
    let minY = Math.min(...imageData.map(item => item.locationY));
    let maxY = Math.max(...imageData.map(item => item.locationY));
    
    // Uniform scaling for all items (same proportion for all)
    let uniformScale = 0.3; // Smaller scale for location mode
    let maxItemSize = Math.min(availableWidth, availableHeight) * 0.12; // Max 12% of available space
    
    for (let item of imageData) {
        // Map location coordinates to screen space
        let xProgress = (item.locationX - minX) / (maxX - minX);
        let yProgress = (item.locationY - minY) / (maxY - minY);
        
        // Handle edge case where all locations are the same
        if (isNaN(xProgress)) xProgress = 0.5;
        if (isNaN(yProgress)) yProgress = 0.5;
        
        // Calculate position within available screen space
        let targetX = screenLeft + margin + (xProgress * availableWidth);
        let targetY = screenTop + margin + (yProgress * availableHeight);
        
        // Calculate uniform size while maintaining aspect ratio
        let aspectRatio = item.originalWidth / item.originalHeight;
        
        // Apply uniform scaling
        let baseWidth = item.originalWidth * uniformScale;
        let baseHeight = item.originalHeight * uniformScale;
        
        // Constrain to maximum size while maintaining aspect ratio
        let constrainedWidth = Math.min(baseWidth, maxItemSize);
        let constrainedHeight = Math.min(baseHeight, maxItemSize);
        
        // Apply aspect ratio constraint
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Ensure we don't exceed maximum size
        constrainedWidth = Math.min(constrainedWidth, maxItemSize);
        constrainedHeight = Math.min(constrainedHeight, maxItemSize);
        
        // Recalculate aspect ratio if needed
        if (constrainedWidth / aspectRatio > constrainedHeight) {
            constrainedHeight = constrainedWidth / aspectRatio;
        } else {
            constrainedWidth = constrainedHeight * aspectRatio;
        }
        
        // Calculate final position (top-left corner) ensuring item stays within bounds
        let finalX = Math.max(screenLeft + margin, 
                             Math.min(targetX - constrainedWidth/2, 
                                     screenLeft + screenWidth - margin - constrainedWidth));
        let finalY = Math.max(screenTop + margin, 
                             Math.min(targetY - constrainedHeight/2, 
                                     screenTop + screenHeight - margin - uiSpace - constrainedHeight));
        
        item.setTarget(finalX, finalY, constrainedWidth, constrainedHeight);
    }
}

// Mouse interaction
function mousePressed() {
    // Check if clicking on mode buttons
    if (checkModeButtonClick(mouseX, mouseY)) {
        return;
    }
    
    // Check if clicking on timeline controls (only in time mode)
    if (currentMode === 'time' && checkTimelineClick(mouseX, mouseY)) {
        return;
    }
}

function checkTimelineClick(mx, my) {
    if (alertTimestamps.length === 0) return false;
    
    // Timeline coordinates in screen space
    let margin = 50;
    let timelineY = height - 60;
    let timelineLeft = margin;
    let timelineWidth = width - (2 * margin);
    let timelineHeight = 8;
    
    // Check play/pause button click
    let buttonSize = 30;
    let buttonX = margin;
    let buttonY = timelineY - 40;
    
    if (mx >= buttonX && mx <= buttonX + buttonSize && 
        my >= buttonY && my <= buttonY + buttonSize) {
        timeline.isPlaying = !timeline.isPlaying;
        timeline.lastUpdateTime = millis(); // Reset timing
        return true;
    }
    
    // Check timeline scrubber click
    if (mx >= timelineLeft && mx <= timelineLeft + timelineWidth && 
        my >= timelineY - 10 && my <= timelineY + timelineHeight + 10) {
        
        // Calculate clicked position as percentage of timeline
        let clickProgress = (mx - timelineLeft) / timelineWidth;
        clickProgress = Math.max(0, Math.min(1, clickProgress));
        
        // Set timeline to clicked position
        timeline.timeProgress = clickProgress;
        timeline.lastUpdateTime = millis(); // Reset timing
        
        // Calculate current time and alert index based on new position
        let timeOffset = timeline.timeProgress * (timeline.endTime - timeline.startTime);
        timeline.currentTime = new Date(timeline.startTime.getTime() + timeOffset);
        
        // Find which alert we should be at based on current time
        timeline.currentAlertIndex = 0;
        for (let i = 0; i < alertTimestamps.length; i++) {
            if (timeline.currentTime >= new Date(alertTimestamps[i])) {
                timeline.currentAlertIndex = i;
            } else {
                break;
            }
        }
        return true;
    }
    
    return false;
}

// Keyboard controls
function keyPressed() {
    if (key === ' ') {
        // Reset camera to center (adjusted for zoom)
        cameraX = (-canvasWidth * defaultZoom) / 2 + width / 2;
        cameraY = (-canvasHeight * defaultZoom) / 2 + height / 2;
    }
}

// Handle window resize
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
} 