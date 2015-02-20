
/**
 * Downsamples an image (pixel array) using nearest neighbor sampling.
 *
 * It copies one pixel at a time from the original image, skipping every "sampleLevel" pixels, 
 * which are treated as "filler" pixels and colored according to its nearest sampled pixel.
 *
 * ex:
 * sampleLevel 2
 *
 * @#@#@#@#
 * ########
 * @#@#@#@#
 * ########
 *
 * sampleLevel 3
 *
 * @##@##@##
 * #########
 * #########
 * @##@##@##
 *
 * @: sampled pixel
 * #: filler pixel
 * 
 * @inputPixels: ByteBuffer with the original pixel data
 * @width / height: dimensions of the original image
 * @sampleLevel: how many pixels to skip between samples. The higher this number, the more pixelated the 
 * resulting image (lower resolution). Level of 1 will leave the original pixels untouched
 * @pixelSize : size of one individual pixel (in bytes)
 * @addFiller : whether to add "filler pixels" in the rows and columns in between the sampled pixels
 */
function pixelize(inputPixels, width, height, sampleLevel, pixelSize, addFiller){
    // defaults 
    addFiller = typeof addFiller !== 'undefined' ? addFiller : false;

    if(addFiller){
        var bufferSize = width * height * pixelSize;
    } else {
        var bufferSize = (width * height * pixelSize) / sampleLevel;
    }

    var newPixels = ByteBuffer.allocate(bufferSize); // 4 = RGBA format
    var inputPixel;
    var newPixel;
    var inputRow = [];

    // TODO: We need a better algorithm for this, which works for both bright and dark images
    // 245 as a magic number works great for Mario and Link, but not so much for soldier Che & Obama
    // var threshold = 245 - getAvgLuminance(inputPixels, 2); // luminance threshold for the posterizing
    var threshold = 50;

    inputPixels.rewind();

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
                    inputPixel = clampColor(inputPixels.getInt(index * pixelSize), threshold);
                    newPixel = inputPixel;
                    inputRow.push(newPixel);
                    newPixels.putInt(newPixel);
                } else if(addFiller) {
                    newPixel = inputRow[x]; // use the pixel from the previous row
                    newPixels.putInt(newPixel);
                }
            } else if(addFiller) { 
                newPixel = newPixel; // Keep using the last pixel we sampled on the previous column
                inputRow.push(newPixel);
                newPixels.putInt(newPixel);
            }
        }
    };

    // since we've been writing to this buffer, flip it before returning it
    newPixels.flip(); 

    return newPixels;
}

/**
 * "Clamps" the value of an BGRA pixel (provided as an int32) to one of either complete white or 
 * complete black.
 *
 * @param pixel: Pixel data as an int32, in BGRA format (blue, green, red, alpha)
 * @param threshold: (0-255) If the total luminance is under this threshold, it will get rounded down to
 * black, otherwise, white is returned.
 */
function clampColor(pixel, threshold){
    var blue = (pixel & 0xFF000000) >> 24;
    var green = (pixel & 0x00FF0000) >> 16;
    var red = (pixel & 0x0000FF00) >> 8;

    if(getPixelLuminance(red, green, blue) > threshold){
        return 0xFFFFFFFF; // white
    } else {
        return 0x000000FF; // black
    }
}

/**
 * Given the RGB components of a pixel, compute the luminance
 */
function getPixelLuminance(red, green, blue){
    return 0.2126*red + 0.7152*green + 0.0722*blue;
}

/**
 * Compute the averaged luminosity of a block of pixels (in BGRA format), optionally only sampling 
 * a certain number of them, rather than all of them.
 *
 * @param pixelBlock : Block of pixels, as a ByteBuffer of BGRA pixels
 * @param samples : Level of sampling: 1 = all pixels, 2 = half of the pixels, 4 = 1/4 of the pixels...
 */
function getAvgLuminance(pixelBlock, resolution){
    resolution = resolution || 1; // Default
    var red = 0;
    var green = 0;
    var blue = 0;
    var samples = 0;

    pixelBlock.rewind();

    for(var i = 0; i < pixelBlock.limit(); i = i + resolution){
        pixel = pixelBlock.get();
        blue += (pixel & 0xFF000000) >> 24;
        green += (pixel & 0x00FF0000) >> 16;
        red += (pixel & 0x0000FF00) >> 8;
        samples++;
    }

    return getPixelLuminance(red / samples, green / samples, blue / samples);
}

/**
 * Build a color object from a int32 BGRA pixel
 */
function buildColor(pixel){
    var blue = (pixel & 0xFF000000) >> 24;
    var green = (pixel & 0x00FF0000) >> 16;
    var red = (pixel & 0x0000FF00) >> 8;

    return Color.rgb(blue, green, red);
}

/** 
 * Given a pixel block, return the average color found in it after applying a mask
 *
 * @param pixelBlock (ByteBuffer) Block of colored pixels which we will sample 
 * @param mask (ByteBuffer) Black and white pixel mask. Only the white pixels
 * will be used to determine the light color of the block.
 * @param inverse If true, the black pixels of the mask will be sampled, rather than the white ones
 */
function getAvgColor(pixelBlock, mask, inverse){
    var inverse = typeof inverse !== 'undefined' ? inverse : false;
    var resolution = 2; // sample every other row, every other column
    var pixelSize = 4; // BGRA
    var sampledRed = 0;
    var sampledGreen = 0;
    var sampledBlue = 0;
    var numSamples = 0;

     // For every row...
    for (var y = 0; y < charHeight; y += resolution) {
        // For every column...
        for (var x = 0; x < charWidth; x += resolution) {
            var index = (y * charWidth) + x;
            var maskPixel = mask.getInt(index * pixelSize);
            maskPixel = (maskPixel & 0x0000FF00) >> 8; // use red channel to identify white

            // Only sample if pixel is within the white part of the mask
            if((maskPixel == 0xFF) != inverse){
                var sampledPixel = pixelBlock.getInt(index * pixelSize);
                sampledRed += (sampledPixel & 0x0000FF00) >> 8;
                sampledGreen += (sampledPixel & 0x00FF0000) >> 16;
                var blue = (sampledPixel & 0xFF000000) >> 24;
                sampledBlue += blue & 0x000000FF; // fixes weird overflow bug after bitshifting 24 bits

                numSamples++;
            }
        }
    }

    return Color.rgb(sampledRed / numSamples, sampledGreen / numSamples, sampledBlue / numSamples); 
}

/**
 * Take a pixel block (ByteBuffer of i32s) of black and white pixels, 
 * and convert the black ones to the dark color, and the white ones to the light color
 */
function colorize(pixels, lightColor, darkColor){
    var bufferSize = charWidth * charHeight * 4; // 4 = RGBA format
    var newPixels = ByteBuffer.allocate(bufferSize); 
    var pixel;

    while(pixels.hasRemaining()){
        pixel = pixels.getInt();

        // being lazy, check only the red component of the pixel, since it should
        // either be completely black or completely white
        var red = (pixel & 0x0000FF00) >> 8;

        if(red > 128){
            newPixels.putInt(colorToInt(lightColor));
        } else {
            newPixels.putInt(colorToInt(darkColor));
        }
    }
    pixels.rewind();
    newPixels.flip();

    return newPixels;
}

/**
 * Take a ByteBuffer of pixels as input, and identify the lightest and darkest colors in it.
 * From there, calculate the midpoint of both to use as a threshold in turning the light
 * pixels into full white and the dark pixels into full black.
 *
 * @param pixels ByteBuffer of int32 pixels
 * @param sampling Level of sampling, the higher the number, the more pixels skipped
 */
function decolorize(pixels, sampling){
    var newPixels = ByteBuffer.allocate(pixels.capacity()); 
    var pixel;
    var luminances = [];
    var pixelSize = 4;

    // Loop through all the pixels in the block to collect luminance levels,
    // skipping every few pixels as determined by sampling
    
    for (var y = 0; y < charHeight; y += sampling) { // For every row...
        for (var x = 0; x < charWidth; x += sampling) { // For every column...
            var index = (y * charWidth) + x;

            var sampledPixel = pixels.getInt(index * pixelSize);
            var color = intToRgb(sampledPixel);
            luminances.push(getPixelLuminance(color.red, color.green, color.blue));
        }
    }
    pixels.rewind();

    // Drop highest and lowest values from luminance array
    luminances.sort();
    // trimming 2 from start and end of array seems to yield optimal quality
    luminances = luminances.slice(2, -2); 

    // Calc average luminance
    var sum = 0;
    for(var i = 0; i < luminances.length; i++){
        sum += luminances[i];
    }
    var threshold = Math.round(sum / luminances.length);

    var j = 0;
    for(var i = 0; i < pixels.capacity() / pixelSize; i++){

        pixel = pixels.getInt(i * pixelSize);
        var color = intToRgb(pixel);
        var lum = getPixelLuminance(color.red, color.green, color.blue);

        if(lum < threshold){
            var newPixel = 0x00FFFFFF; // red
        } else {
            var newPixel = 0x000000FF; // black
        }
        // print("New pixel: " + Integer.toHexString(newPixel));
        newPixels.putInt(newPixel);
        j++;
    }
    pixels.rewind();
    newPixels.flip();

    return newPixels;
}

/**
 * Convert a Java Color object into an BGRA int32
 */
function colorToInt(color){
    var pixel = color.blue * 255;
    pixel = (pixel << 8) + (color.green * 255);
    pixel = (pixel << 8) + (color.red * 255);
    pixel = (pixel << 8) + 255; // alpha

    // print(Integer.toHexString(pixel));
    return pixel;
}

/**
 * Takes an int32 pixel as input and decomposes it into the RGB components by returning 
 * a javascript literal with red, green and blue elements
 */
function intToRgb(int32pixel){
    var red = (int32pixel & 0x0000FF00) >> 8;
    var green = (int32pixel & 0x00FF0000) >> 16;
    var blue = ((int32pixel & 0xFF000000) >> 24) & 0x000000FF; // fixes weird overflow bug after bitshifting 24 bits

    return {red: red, green: green, blue: blue};
}

/**
 * Clear a canvas with a medium grey. Used when switching charsets or loading a user image.
 */
function clearCanvas(ctx, color){
    ctx.setFill(color);
    ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
}