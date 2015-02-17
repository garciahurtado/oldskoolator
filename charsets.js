
/**
 * Load the list of files found in /res/charsets/ and return it as an array
 */
function loadCharsetNames(){
    var charsets = [];

    // Read in all character set images in the /res/ directory
    var rootPath = './res/charsets/';
    var stream = Files.newDirectoryStream(Paths.get(rootPath));

    for each(path in stream){
        var file = new File(path);
        if(file.isFile()){
            var charset = {
                charset: file.name,
                filename: path
            }
            charsets.push(charset);
        }
    }

    return charsets;
}

/**
 * Load the bitmaps for each ASCII character set
 */
function loadCharset(filename, ctx) {
    var charImages = [];
    clearCanvas(ctx);
   
    // Read in all character set images in the /res/ directory
    var rootPath = './res/charsets/';
    
    var file = new File(rootPath + filename);
    var image = loadImageFile(file.toURI());
    print("Charset loaded (width: " + image.width + ", height: " + image.height + ")");

    // Slice up the charset map into it's individual characters
    var pixels = image.getPixelReader();
    var format = PixelFormat.getByteBgraInstance();

    // For each character in charset map
    for (var y = 0; y < image.height / charHeight; y++) {
        for (var x = 0; x < image.width / charWidth; x++) {
            var newCharPixels = ByteBuffer.allocate(charWidth * charHeight * 4); 
            pixels.getPixels(x * charWidth, y * charHeight, charWidth, charHeight, format, newCharPixels, imageStride);

            var oneByte;
            charImages.push(new AsciiChar(newCharPixels, 8, 8)); 
        }
    }

    var x = 0;
    var y = 0;
    var charsetPreviewImage = new WritableImage(ctx.canvas.width, ctx.canvas.height);
    var imageWriter = charsetPreviewImage.getPixelWriter();

    // Display the individual characters of the charmap on the screen
    for each(character in charImages){
        imageWriter.setPixels(x, y, charWidth, charHeight, format, character.pixels, imageStride);
        x += 8 + 4; // 8px character width + 4px padding
        if(x > ctx.canvas.width){
            x = 0;
            y += 8 + 4;
        }
    }

    ctx.drawImage(charsetPreviewImage, 8, 8);

    return charImages;
}

/**
 * Clear the charset preview image (use when switching charsets)
 */
function clearCanvas(ctx){
    ctx.setFill(Color.rgb(200,200,200));
    ctx.fillRect(0,0,500,300);
}
