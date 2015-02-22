
/**
 * Load the list of files found in /res/charsets/ and return it as an array
 */
function paletteExists(filename){
    var rootPath = './res/charsets/';
    var path = rootPath + filename;

    return Files.exists(path);
}

/**
 * Load the bitmaps for each ASCII character set
 */
function loadPalette(filename, ctx) {
    var paletteColors = [];
    clearCanvas(ctx, Color.rgb(200,200,200));
   
    var rootPath = './res/palettes/';
    var file = new File(rootPath + filename);
    var image = loadImageFile(file.toURI());
    
    // Slice up the palette map into it's individual colors
    var pixels = image.getPixelReader();
    // var format = PixelFormat.getByteBgraInstance();

    // For each color block in the palette image
    for (var y = 0; y < image.height / charHeight; y++) {
        for (var x = 0; x < image.width / charWidth; x++) {
            // var newColorPixel = ByteBuffer.allocate(4); // we read a single pixel per color
            // pixels.getPixels(x * charWidth, y * charHeight, 1, 1, format, newColorPixel, imageStride);
            
            paletteColors.push(pixels.getColor(x * charWidth, y * charHeight)); 
        }
    }

    // Display the individual color blocks on the palette preview
    var x = 0;
    var y = 0;

    for each(color in paletteColors){
        blockSize = charWidth * 2;

        ctx.setFill(color);
        ctx.fillRect(x, y, blockSize, blockSize);

        x += blockSize; // 8px character width + 4px padding
        if(x > ctx.canvas.width){
            x = 0;
            y += blockSize;
        }
    }

    print("Total: " + paletteColors.length + " colors in palette");

    return paletteColors;
}

/**
 * Given a color and a palette, find the color in the palette that is the closest match, and return it.
 */
function findClosestColor(color, palette){
    var closestDistance = 1000;
    var closestColor;

    for each(paletteColor in palette){
        var dist = getColorDistance(color, paletteColor);
        if(dist < closestDistance){
            closestDistance = dist;
            closestColor = paletteColor;
        }
    }

    return closestColor;
}

/**
 * Get the distance between two colors: the closer the colors, the smaller the distance
 *
 * @ref http://stackoverflow.com/questions/2103368/color-logic-algorithm
 */
function getColorDistance(colorA, colorB){
    var rmean = ( colorA.red + colorB.red )/2;

    var red = colorA.red - colorB.red;
    var green = colorA.green - colorB.green;
    var blue = colorA.blue - colorB.blue;

    var weightRed = 2 + rmean/256;
    var weightGreen = 4.0;
    var weightBlue = 2 + (255-rmean)/256;

    return Math.sqrt(weightRed*red*red + weightGreen*green*green + weightBlue*blue*blue);
}

/**
 * In order to avoid returning the same color for both the light and dark area of a block, we 
 * need a way to remove an already picked color from our existing palette.
 *
 * This function returns a new palette with parameter color removed
 */
function removeFromPalette(palette, removeColor){
    var newPalette = [];
    for each(var color in palette){
        if(color != removeColor){
            newPalette.push(color);
        }
    }

    return newPalette;
}
