var File = java.io.File;
var Files = java.nio.file.Files;
var Path = java.nio.file.Path;
var Paths = java.nio.file.Paths;
var Charset = java.nio.charset.Charset;
var ByteBuffer = java.nio.ByteBuffer;

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
function start(stage) {
	print("Java version : " + System.getProperty("java.version"));

    var root = new StackPane();
    stage.scene = new Scene(root, 600, 600);

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
    imagePreview.width = 500;
    imagePreview.height = 500;
    tab2Content.children.add(imagePreview);

    stage.show();

    loadCharSets(ctx);
}

/**
 * Load the bitmaps for each ASCII character set
 */
function loadCharSets(ctx) {
    var charWidth = 8;
    var charHeight = 8;
    var stride = charWidth * 4;
    var charImages = [];

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
            pixels.getPixels(x * charWidth, 0, charWidth, charHeight, format, charPixels, stride);

            var oneByte;
            charImages.push(charPixels);

            // Debug view of image buffer as ints
            // var j = 0;
            // var line = "";
            // while (charPixels.hasRemaining()){
            //     oneByte = charPixels.get();
            //     line = line + "[" + oneByte + "]"; 
            //     if(++j % 8 == 0){
            //         print(line);
            //         line = "";
            //     }
            // }
            // charPixels.rewind();    
        }

        var x = 0;
        var charsetPreviewImage = new WritableImage(500, 500);
        var imageWriter = charsetPreviewImage.getPixelWriter();

        for each(character in charImages){
            imageWriter.setPixels(x, 0, charWidth, charHeight, format, character, stride);
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
