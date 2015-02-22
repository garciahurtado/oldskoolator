var File = java.io.File;
var Files = java.nio.file.Files;
var Path = java.nio.file.Path;
var Paths = java.nio.file.Paths;
var Charset = java.nio.charset.Charset;
var ByteBuffer = java.nio.ByteBuffer;
var ReadWriteHeapByteBuffer = java.nio.ReadWriteHeapByteBuffer;

var Alert = javafx.scene.control.Alert;
var AlertType = Alert.AlertType;
var ImageIO = javax.imageio.ImageIO;
var SwingFXUtils = javafx.embed.swing.SwingFXUtils;
var System = java.lang.System;
var Integer = java.lang.Integer;
var Byte = java.lang.Byte;

load("fx:base.js");
load("fx:controls.js");
load("fx:graphics.js");
load("fx:fxml.js");

load("charsets.js");
load("palettes.js");
load("pixel-utils.js");
load("ascii-char.js");

/**
 * ==== Oldskoolator ====
 *
 * Desktop app which parses a raster image, and converts it to an ASCII art version of it.
 * 
 * It uses the JavaFX packages from Java 8. 
 * In order to take advantage of the Alert dialogs, Java 1.8.0_40 or higher is needed.
 *
 * Launch with:
 * jjs ascii-reader.js -fx
 *
 * @author Garcia Hurtado <ghurtado@gmail.com>
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

/**
 * List of colors in the currently selected palette
 */
var palette;
    
function start(stage) {
	print("Java version : " + System.getProperty("java.version"));

    // Read UI layout file
    var layout = new File(__DIR__ + "layout.fxml");
    var root = FXMLLoader.load(layout.toURL());
    stage.scene = new Scene(root, 527, 677);
    stage.title = "Oldskoolator";

    // Load CSS file
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
    clearCanvas(charsetPreview, Color.rgb(200,200,200));

    var palettePreview = stage.scene.lookup("#palettePreview").graphicsContext2D;
    clearCanvas(palettePreview, Color.rgb(200,200,200)); 

    var userImage = stage.scene.lookup("#userImage");
    stage.scene.lookup("#loadImage").onAction = function(){
        openFileBrowser(stage, userImage.graphicsContext2D);
    };

    var charsetCombo = stage.scene.lookup("#charsetSelect");
    charsetCombo.onAction = function(){
        var selected = charsetCombo.selectionModel.selectedItem;
        charImages = loadCharset(selected, charsetPreview);
        palette = loadPalette(selected, palettePreview);
    }

    var charsets = loadCharsetNames();
    for each(charset in charsets){
        charsetCombo.items.addAll(charset.charset);
    }
    charImages = loadCharset(charsets[0].charset, charsetPreview);
    palette = loadPalette(charsets[0].charset, palettePreview);
    charsetCombo.value = charsets[0].charset;

    stage.scene.lookup("#convert").onAction = function(){
        convertImage(userImage, charImages);
    }

    stage.scene.lookup("#save").onAction = function(){
        openSaveDialog(stage, userImage.graphicsContext2D);
    }
}

/**
 * Convert the user provided image according to the ASCII charset loaded
 */
 function convertImage(canvas, charImages){
    print("Converting image");
    var startTime = System.nanoTime();
    
    var ctx = canvas.graphicsContext2D;
    var rows = canvas.width / charWidth;
    var cols = canvas.height / charHeight;

    // Save the original user image
    var userImage = new WritableImage(canvas.width, canvas.height);
    canvas.snapshot(null, userImage);
    var imageReader = userImage.pixelReader;
    var format = PixelFormat.getByteBgraInstance();

    // Process one image block at a time, character sized
    for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
            var x = col * charWidth;
            var y = row * charHeight;

            // Save the original image data for this block 
            var blockPixels = ByteBuffer.allocate(charWidth * charHeight * 4); // 4 = RGBA format
            imageReader.getPixels(x, y, charWidth, charHeight, format, blockPixels, imageStride);

            // Set the block to red to indicate processing
            ctx.setFill(Color.rgb(255,0,0));
            ctx.fillRect(x, y, charWidth, charHeight);

            var blackWhitePixels = decolorize(blockPixels, 1); // TODO: make sampling level configurable in UI
            var matchCharacter = findMatchingCharacter(blackWhitePixels, charImages, charWidth, charHeight, 4);
            matchCharacter.setPixelation(1);

            var colorLight = getAvgColor(blockPixels, matchCharacter.pixels);
            var colorDark = getAvgColor(blockPixels, matchCharacter.pixels, true);

            // TODO: implement sensible "color deduping" to avoid both light and dark colors mapping to the same palette color
            colorDark = findClosestColor(colorDark, palette);
            colorLight = findClosestColor(colorLight, palette);

            var coloredPixels = colorize(matchCharacter.pixels, colorLight, colorDark);

            ctx.pixelWriter.setPixels(x, y, charWidth, charHeight, format, coloredPixels, imageStride);
            // ctx.pixelWriter.setPixels(x, y, charWidth, charHeight, format, blackWhitePixels, imageStride);
        };
    };

    var elapsedTime = System.nanoTime() - startTime;
    print("Image converted in " + elapsedTime / Math.pow(10, 9) + " seconds");
 }

/**
 * Show the file browser dialog, to choose the image to load.
 */
function openFileBrowser(stage, imageCanvas){
    fileChooser = new FileChooser();
    fileChooser.title = "Find image to convert";
    fileChooser.initialDirectory = new File("./res/test-images/");

    var file = fileChooser.showOpenDialog(stage);
    var image = loadImageFile(file.toURI());

    // Image has been selected by the user, draw it in the preview canvas
    clearCanvas(imageCanvas, Color.rgb(255, 255, 255));
    imageCanvas.drawImage(image, 0, 0);

    var tab = stage.scene.lookup("#tabs");
    tab.selectionModel.select(1);
}

/**
 * Show the file browser dialog, to choose where to save the contents of the canvas, as a PNG
 */
function openSaveDialog(stage, ctx){
    fileChooser = new FileChooser();
    fileChooser.title = "Save Image As...";
    fileChooser.initialDirectory = new File("./res/test-images/");
    fileChooser.extensionFilters.addAll(new FileChooser.ExtensionFilter("PNG File", "*.png"));

    var saveFile = fileChooser.showSaveDialog(stage);

    if(saveFile){
        var imageContent = new WritableImage(ctx.canvas.width, ctx.canvas.height);
        ctx.canvas.snapshot(null, imageContent);
        ImageIO.write(SwingFXUtils.fromFXImage(imageContent, null), "png", saveFile);
        print("Image saved as " + saveFile.toURI());
    }
}

/**
 * Load the image selected and process it.
 */
function loadImageFile (filename) {
    var image = new Image(filename);
    print("Image loaded from: " + filename);
    return image;
}
