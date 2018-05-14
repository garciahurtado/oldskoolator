- OldSkoolator

An image to color ASCII converter in Javascript, running on the Nashorn engine of the JVM, and with a JavaFX UI. 

It breaks up the source image into chunks and then tries to find the character from the set which best resembles the contents of the chunk. It also tries to identify the 2 most common colors in the chunk and picks the closest two colors from the selected palette. 

![Original image and ASCII converted version using Amstrad CPC character set](res/docs/sample.png "Original image and ASCII converted version")

You can add your own character sets and color palettes as PNGs placed in res/charsets and res/palettes. 

All sample images provided for testing purposes only and are the copyright of their respective holders.

- Requirements

JDK / JRE for Java 8. The jjs executable must be in your path. 

In order to add jjs.exe to your path:

- Find out the location of your JDK / JRE: 

- echo echo %JAVA_HOME% (ie: C:\Program Files\Java\jdk1.8.0_144)
- Add %JAVA_HOME%/bin to your path
- Run ascii-maker.bat

- License

This code is provided under the MIT license. See attached LICENSE.txt

