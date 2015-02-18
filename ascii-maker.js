var File = java.io.File;
var Files = java.nio.file.Files;
var Path = java.nio.file.Path;
var Paths = java.nio.file.Paths;
var Charset = java.nio.charset.Charset;
var ByteBuffer = java.nio.ByteBuffer;
var ReadWriteHeapByteBuffer = java.nio.ReadWriteHeapByteBuffer;

var Alert = javafx.scene.control.Alert;
var AlertType = Alert.AlertType;
var System = java.lang.System;

load("fx:base.js");
load("fx:controls.js");
load("fx:graphics.js");
load("fx:fxml.js");

load("charsets.js");
load("pixel-utils.js");
load("ascii-char.js");

/**
 * Desktop app which parses a raster image, and converts it to an ASCII art version of it.
 * 
 * It uses the JavaFX packages from Java 8. 
 * In order to take advantage of the Alert dialogs, Java 1.8.0_40 or higher is needed.
 *
 * Launch with:
 * jjs ascii-reader.js -fx
 *
 * @author Garcia Hurtado
 */

/**
 * Holds the individual images which make up the current character set
 */
var charImages = [];

/**
 * Dimensions of a single character in the charset
 */
var charWidth = 8;
var charHeight = 8;

var imageStride = charWidth * 4;
    
function start(stage) {
	print("Java version : " + System.getProperty("java.version"));

    var layout = new File(__DIR__ + "layout.fxml");
    var root = FXMLLoader.load(layout.toURL());

    // var root = new StackPane();
    stage.scene = new Scene(root, 520, 670);

    // Load FX CSS file
    var cssFile = new File(__DIR__ + "style.css");
    stage.scene.stylesheets.add(cssFile.toURI().toString());

    attachListeners(stage);
    stage.show();
}

/**
 * Attach listeners to the UI (buttons, pulldowns, etc..)
 */
function attachListeners(stage) {
    var charsetPreview = stage.scene.lookup("#charsetPreview").graphicsContext2D;
    clearCanvas(charsetPreview); 

    var userImage = stage.scene.lookup("#userImage");
    stage.scene.lookup("#loadImage").onAction = function(){
        openFileBrowser(stage, userImage.graphicsContext2D);
    };

    var charsetCombo = stage.scene.lookup("#charsetSelect");
    charsetCombo.onAction = function(){
        print("Selected");
        charImages = loadCharset(charsetCombo.selectionModel.selectedItem, charsetPreview);
    }

    var charsets = loadCharsetNames();
    for each(charset in charsets){
        charsetCombo.items.addAll(charset.charset);
    }
    charImages = loadCharset(charsets[0].charset, charsetPreview);
    charsetCombo.value = charsets[0].charset;

    stage.scene.lookup("#convert").onAction = function(){
        convertImage(userImage, charImages);
    }

    stage.scene.lookup("#save").onAction = function(){
        openFileSave(stage, userImage.graphicsContext2D);
    }
}

function createLayout () {
    
    stage.title = "ASCII Art Maker";

    var outerBox = new VBox(6);
    root.children.add(outerBox);
    root.setPadding(new Insets(8,8,8,8));

    // Title
    var title = new Text();
    title.font = new Font(32);
    title.text = "ASCII Image Generator";
    outerBox.children.add(title);

    // Buttons
    var fileButton = new Button(); // # loadImage
    fileButton.text = "Load image...";

    fileButton.onAction = function(){
        openFileBrowser(stage, imagePreview.graphicsContext2D);
    };

    var box2 = new HBox();
    // box2.style = borderStyle;
    box2.setAlignment(Pos.BASELINE_RIGHT);
    box2.minWidth = Pos.MAX_VALUE;
    box2.children.add(fileButton);
    HBox.setHgrow(box2, Priority.ALWAYS);
    outerBox.children.add(box2);

    // Add tabs
    var tabs = new TabPane();
    tabs.id = "tabs";
    tabs.tabClosingPolicy = TabPane.TabClosingPolicy.UNAVAILABLE;
    outerBox.children.add(tabs);

    // Tab 1
    var tab1 = new Tab();
    tab1.text = "Character Set";
    var tab1Content = new VBox();
    tab1Content.styleClass.add("padded");
    tab1.setContent(tab1Content);
    tabs.tabs.add(tab1);

    var tab1Content2 = new HBox();
    tab1Content2.styleClass.add("padded");

    var charsetLabel = new Label("Charset");
    var charsetCombo = new ComboBox(); // #charsetSelect
    charsetCombo.onAction = function(){
        charImages = loadCharset(charsetCombo.selectionModel.selectedItem, ctx);
    }
    tab1Content2.children.add(charsetLabel);
    tab1Content2.children.add(charsetCombo);

    tab1Content.children.add(tab1Content2);

    // Image view of the character set loaded
    var charsetPreview = new Canvas(); // #charsetPreview
    charsetPreview.height = 300;
    charsetPreview.width = 500;
    ctx = charsetPreview.getGraphicsContext2D();
    clearCanvas(ctx);

    var charsets = loadCharsetNames();
    for each(charset in charsets){
        print (charset);
        charsetCombo.items.addAll(charset.charset);
    }
    charImages = loadCharset(charsets[0].charset, ctx);
    charsetCombo.value = charsets[0].charset;

    tab1Content.children.add(charsetPreview);

    // Tab2
    var tab2 = new Tab();
    tab2.text = "Image";
    var tab2Content = new VBox();
    tab2.setContent(tab2Content);
    tabs.tabs.add(tab2);

    // User provided image
    var imagePreview = new Canvas(); // #userImage
    imagePreview.name = "userImage";
    imagePreview.width = 512;
    imagePreview.height = 512;
    tab2Content.children.add(imagePreview);
    var convertButton = new Button("Convert"); // #convert
    convertButton.onAction = function(){
        convertImage(imagePreview, charImages);
    }
    tab2Content.children.add(convertButton);

}

/**
 * Convert the user provided image according to the ASCII charset loaded
 */
 function convertImage(canvas, charImages){
    print("Converting image");

    var ctx = canvas.graphicsContext2D;
    var rows = canvas.width / charWidth;
    var cols = canvas.height / charHeight;

    // Save the original user image
    var userImage = new WritableImage(canvas.width, canvas.height);
    canvas.snapshot(null, userImage);
    var imageReader = userImage.pixelReader;
   
    // Process one image block at a time, character sized
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var x = col * charWidth;
            var y = row * charHeight;

            // Save the original image data for this block
            var format = PixelFormat.getByteBgraInstance();
            var blockPixels = ByteBuffer.allocate(charWidth * charHeight * 4); // 4 = RGBA format
            imageReader.getPixels(x, y, charWidth, charHeight, format, blockPixels, imageStride);

            // Set the block to red to indicate processing
            ctx.setFill(Color.rgb(255,0,0));
            ctx.fillRect(x, y, charWidth, charHeight);

            // Restore the block to the one from the original image
            var newPixels = convertPixelsToChar(blockPixels, charWidth, charHeight);
            ctx.pixelWriter.setPixels(x, y, charWidth, charHeight, format, newPixels, imageStride);
        };
    };
 }

/**
 * Takes a block of pixels as input and returns the best matching ASCII character in the existing charset
 */
function convertPixelsToChar(inputBlock, width, height){
    var level = 1;
    var found = false;
    var pixelBlock = pixelize(inputBlock, width, height, level, 4);
    
    // Increase the level of pixelation x 2 every loop, until we find a match
    pixelation:
    for(var level = 1; level <= 8; level = level * 2){

        for each(var oneChar in charImages){
            oneChar.setVersion(level);
            pixelBlock = pixelize(inputBlock, width, height, level, 4);
    
            if(oneChar.isEqual(pixelBlock)) { // equal
                oneChar.setVersion(1);
                matchingBlock = oneChar.pixels;
                found = true;
                break pixelation;
            }
        }
    }

    if(found){
        return matchingBlock;
    } else {
        return inputBlock;
    }
}

/**
 * Show the file browser dialog, to choose the image to load.
 */
function openFileBrowser(stage, imageCanvas){
    fileChooser = new FileChooser();
    fileChooser.title = "Find image to convert";
    fileChooser.initialDirectory = new File("./res/");

    var file = fileChooser.showOpenDialog(stage);
    var image = loadImageFile(file.toURI());

    // load image in preview
    // var canvas = stage.scene.lookup("#userImage").getGraphicsContext2D();
    imageCanvas.drawImage(image, 0, 0);

    var tab = stage.scene.lookup("#tabs");
    tab.selectionModel.select(1);
}

/**
 * Load the image selected and process it.
 */
function loadImageFile (filename) {
    var image = new Image(filename);
    print("Image loaded from: " + filename);
    return image;
}
