# Sound Effects for Coin Flip Game

This directory contains the sound effects for the coin flip game. The application expects the following files:

## Required Sound Files

### 1. `win.mp3` - Win Sound
**When it plays:** When the player wins a coin flip
**Recommended sound:** 
- Blockchain success sound (chain linking)
- Crypto cash register / "cha-ching"
- ETH deposit/success beep
- Digital coin drop
- Celebratory synth sound

**Suggestions:**
- Use a positive, rewarding sound that fits the Web3/crypto theme
- Duration: 1-3 seconds
- Consider sounds like blockchain confirmation, crypto wallet success, or digital treasure chest

### 2. `lose.mp3` - Lose Sound
**When it plays:** When the player loses a coin flip
**Recommended sound:**
- Transaction failed beep
- Disconnect/error sound
- Digital glitch
- Blockchain reject sound
- Short "miss" or "whoosh" sound

**Suggestions:**
- Use a short, non-intrusive sound that indicates failure
- Duration: 0.5-2 seconds
- Should be clear but not overly negative
- Consider sounds like network disconnect, transaction error, or digital miss

### 3. `select.mp3` - Selection Sound
**When it plays:** When clicking Heads or Tails buttons
**Recommended sound:**
- UI click/tap
- Digital beep
- Blockchain block select
- Soft synth click
- Mechanical switch

**Suggestions:**
- Use a crisp, short click sound
- Duration: 0.1-0.5 seconds
- Should be subtle and not overpowering
- Consider sounds like digital button press, UI confirmation, or soft click

## Where to Find Web3/Crypto Themed Sounds

### Free Sound Libraries:
1. **Freesound.org** - Search for: "blockchain", "crypto", "digital", "synth", "ui click"
2. **Zapsplat.com** - UI sounds, game sounds, digital effects
3. **Mixkit.co** - Free sound effects including game and UI sounds
4. **BBC Sound Effects** - Professional quality, free sounds

### Recommended Search Terms:
- "blockchain success"
- "crypto transaction"
- "digital coin"
- "UI click"
- "game win"
- "game lose"
- "button press"
- "synth beep"
- "digital notification"

## File Format
- Format: MP3 (for broad browser compatibility)
- Sample rate: 44.1kHz or 48kHz
- Bit rate: 128-320 kbps
- Mono or Stereo (stereo preferred for richer sound)

## Volume Settings (in code)
- Win sound: 50% volume (0.5)
- Lose sound: 50% volume (0.5)
- Select sound: 30% volume (0.3) - quieter for UI feedback

You can adjust these in `src/hooks/useSoundEffects.ts` if needed.

## Testing
After adding your sound files, test them by:
1. Starting the development server
2. Opening the browser console to check for any audio loading errors
3. Clicking Heads/Tails buttons to test select sound
4. Playing a game to test win/lose sounds

## Notes
- Sounds are loaded on component mount
- Failed sound playback will log warnings in console but won't break the app
- Browser autoplay policies may require user interaction before sounds play

