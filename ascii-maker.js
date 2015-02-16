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

    var root = new StackPane();
    stage.scene = new Scene(root, 600, 670);

    // Load FX CSS file
    var cssFile = new File(__DIR__ + "style.css");
    stage.scene.stylesheets.add(cssFile.toURI().toString());

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
    var fileButton = new Button();
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

    var tab1 = new Tab();
    tab1.text = "Character Set";
    var tab1Content = new VBox();
    tab1.setContent(tab1Content);
    tabs.tabs.add(tab1);

    var tab2 = new Tab();
    tab2.text = "Image";
    var tab2Content = new VBox();
    tab2.setContent(tab2Content);
    tabs.tabs.add(tab2);

    // Image view of the character set loaded
    var charsetPreview = new Canvas();
    charsetPreview.height = 300;
    charsetPreview.width = 500;
    ctx = charsetPreview.getGraphicsContext2D();
    ctx.setFill(Color.rgb(200,200,200));
    ctx.fillRect(0,0,500,300);

    tab1Content.children.add(charsetPreview);

    // User provided image
    var imagePreview = new Canvas();
    imagePreview.name = "userImage";
    imagePreview.width = 512;
    imagePreview.height = 512;
    tab2Content.children.add(imagePreview);
    var convertButton = new Button("Convert");
    convertButton.onAction = function(){
        convertImage(imagePreview, charImages);
    }
    tab2Content.children.add(convertButton);

    stage.show();

    loadCharSets(ctx);
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
            var newPixels = convertPixelBlock(blockPixels, charWidth, charHeight);
            ctx.pixelWriter.setPixels(x, y, charWidth, charHeight, format, newPixels, imageStride);
        };
    };
 }

/**
 * Takes a block of pixels as input and returns the best matching ASCII character in the existing charset
 */
function convertPixelBlock(inputBlock, width, height){
    var pixelBlock = downSample(inputBlock, width, height, 8, 4);
    return pixelBlock;
}

/**
 * Downsamples an image (pixel array) using nearest neighbor sampling.
 *
 * @pixelSize : size of one individual pixel (in bytes)
 */
function downSample(inputPixels, width, height, sampleLevel, pixelSize){
    var newPixels = ByteBuffer.allocate(width * height * pixelSize); // 4 = RGBA format
    // inputPixels.rewind();

    // One pixel at a time, copy from original image scanning rows and colums of the block,
    // and skipping every "sampleLevel" pixels, to create a downsampled grid of pixels
    var inputPixel;
    var newPixel;
    var inputRow = [];
    
    // For every row...
    for (var y = 0; y < height; y++) {
        // For every column...
        for (var x = 0; x < width; x++) {
            var index = (y * height) + x;
            
            if((x % sampleLevel == 0)){
                if((y % sampleLevel == 0)){
                    if(x == 0){
                        inputRow = [];
                    }
                    inputPixel = inputPixels.getInt(index * pixelSize);
                    newPixel = inputPixel;
                    inputRow.push(newPixel);
                } else {
                    newPixel = inputRow[x]; // use the pixel from the previous row
                }
            } else {
                newPixel = newPixel; // Keep using the last pixel we sampled on the previous column
                inputRow.push(newPixel);
            }
            newPixels.putInt(newPixel);

        }
    };
    newPixels.flip();

    return newPixels;
}

/**
 * Load the bitmaps for each ASCII character set
 */
function loadCharSets(ctx) {
   
    // Read in all character set images in the /res/ directory
    var rootPath = './res/charsets/';
    var stream = Files.newDirectoryStream(Paths.get(rootPath));

    for each(path in stream){
        var file = new File(path);
        var image = loadImageFile(file.toURI());
        print("Charset loaded (width: " + image.width + ", height: " + image.height + ")");

        // Slice up the charset map into it's individual characters
        var pixels = image.getPixelReader();
        var format = PixelFormat.getByteBgraInstance();

        // For each character in charset map
        for (var x = 0; x < image.width / charWidth; x++) {
            var charPixels = ByteBuffer.allocate(charWidth * charHeight * 4); // byte buffer to store pixels for new character
            pixels.getPixels(x * charWidth, 0, charWidth, charHeight, format, charPixels, imageStride);

            var oneByte;
            charImages.push(charPixels); 
        }

        var x = 0;
        var charsetPreviewImage = new WritableImage(500, 500);
        var imageWriter = charsetPreviewImage.getPixelWriter();

        for each(character in charImages){
            imageWriter.setPixels(x, 0, charWidth, charHeight, format, character, imageStride);
            x += 16;
        }

        ctx.drawImage(charsetPreviewImage, 8, 8);
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
