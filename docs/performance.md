Performance time comparison:

- Old algorithm
 - Used filler pixels (although this didnt make a difference)
 - Went from least pixelated version of block to most, looking for perfect match
 - No fuzzy match
 - No search tree pruning from one level to the next, all characters are compared every time

- New algorithm
 - Starts at highest level of pixelation, potentially hitting early matches for many blocks
 - Does not use filler pixels (again, not that much impact on performance)
 - When no matches found, uses "fuzzy match"
 - Prunes the search tree as it goes to higher resolutions (lower pixelation)

Using Atari charset

Before
- Wind waker: 5.88s
- Che: 1.40s
- Star Wars Poster: 3.83s

After overhaul of block comparison algorithm 
- Wind waker: 0.35s (x17)
- Che: 0.31s (x4.5)
- Star Wars Poster: 0.37s (x10)

Average speed gain: about 10x faster!!