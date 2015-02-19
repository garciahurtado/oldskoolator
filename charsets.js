
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
    print("Total: " + charImages.length + " characters in charset");

    return charImages;
}


/**
 * Recursive function which calls itself with increasing levels of resolution until 
 * either a perfect match is found between the input pixels and the character set.
 *
 * If no perfect match is found, a fuzzy match will be performed to return the closest
 * matching character.
 */
function findMatchingCharacter(inputBlock, charset, width, height, pixelation){
    var MIN_LEVEL = 1;
    var MAX_LEVEL = 4;

    inputBlock.rewind();
    var lowresInputBlock = pixelize(inputBlock, width, height, pixelation, 4, false);
    
    var matches = [];
    for each(var character in charset){
        character.setPixelation(pixelation);
        if(character.isEqual(lowresInputBlock)){
            matches.push(character);
        }
    }

    var matchCount = matches.length;
    // print("Matches count: " + matches.length + " Charset size: " + charset.length);

    // No exact matches were found, so we may need to resort to fuzzy match
    if(matchCount == 0){
        // We are at the lowest resolution (max. pixelation), so there's no hope for a fuzzy match.
        // Just return the first character in the set.
        if(pixelation == MAX_LEVEL){ 
            return charset[0];
        } else {
            return findClosestMatch(inputBlock, charset, width, height);
        }
    } else if(matchCount == 1){ // best case scenario: single perfect match
        return matches[0];
    } else if(matchCount > 1){ // more than one match, increase resolution up to the maximum (min. pixelation)
        if(pixelation == MIN_LEVEL){
            return matches[0];
        } else {
            return findMatchingCharacter(inputBlock, matches, width, height, pixelation / 2);
        }
    }
}

/**
 * Given a pixel block and a set of characters, find the one that is the closest pixel
 * per pixel match, without using pixelation.
 */
function findClosestMatch(inputBlock, charset){
    var bestMatch = charset[0];
    var bestScore = -10000;

    for each(character in charset){
        character.setPixelation(1); // no pixelation is used for this comparison
        var score = character.findDifferences(inputBlock);
        if(score > bestScore){
            bestMatch = character;
            bestScore = score;
        }
    }

    return bestMatch;
}


