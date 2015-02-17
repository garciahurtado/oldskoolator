/**
 * Represents a set of pixels which displays as an ASCII character.
 * When the character is created, it will automatically create downsampled (pixelated)
 * versions of itself, for easier matching against a portion of an image.
 *
 * @param pixels : ByteStream of pixels in BGRA format (array of int32)
 */
function AsciiChar(pixels, width, height){
  this.width = width;
  this.height = height;
  this.pixels = pixels;
  this.originalPixels = pixels;
  this.versions = []
  this.versions[0] = pixels;
  this.generateVersions([1,2,4,8])
}

/**
 * @param levels Array of sample sizes to generate (ie: [2,4,8])
 */
AsciiChar.prototype.generateVersions = function(levels) {
  for each(var level in levels){
    // print("Generated level: " + level);
    var newPixels = pixelize(this.originalPixels, this.width, this.height, level, 4);
    this.versions[level] = newPixels;
  }
}

/**
 * Set this characters pixels to a specific downsampled version (previously generated)
 */
AsciiChar.prototype.setVersion = function(level){
  this.pixels = this.versions[level];
}

/**
 * Compare the pixels to another set of pixels (as a ByteStream) to see if they are the same
 */
AsciiChar.prototype.isEqual = function(pixels){
  if(this.pixels.compareTo(pixels) == 0){
    return true;
  } else {
    return false;
  }
}