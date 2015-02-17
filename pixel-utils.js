
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
 * resulting image
 * @pixelSize : size of one individual pixel (in bytes)
 */
function pixelize(inputPixels, width, height, sampleLevel, pixelSize){
    var newPixels = ByteBuffer.allocate(width * height * pixelSize); // 4 = RGBA format
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
                    inputPixel = clampColor(inputPixels.getInt(index * pixelSize), 50);
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

    // since we've been writing to this buffer, flip it before returning it
    newPixels.flip(); 

    return newPixels;
}

/**
 * "Clamps" the value of an BGRA pixel (provided as an int32) to one of either complete white or 
 * complete black.
 *
 * Uses the formula for luminance: Y = (0.2126*R + 0.7152*G + 0.0722*B)
 *
 * @param pixel: Pixel data as an int32, in BGRA format (blue, green, red, alpha)
 * @param threshold: (0-255) If the total luminance is under this threshold, it will get rounded down to
 * black, otherwise, white is returned.
 */
function clampColor(pixel, threshold){
    var blue = (pixel & 0xFF000000) >> 24;
    var green = (pixel & 0x00FF0000) >> 16;
    var red = (pixel & 0x0000FF00) >> 8;
    var luminance = (0.2126*red + 0.7152*green + 0.0722*blue);

    if(luminance > threshold){
        return 0xFFFFFFFF; // white
    } else {
        return 0x000000FF; // black
    }
}