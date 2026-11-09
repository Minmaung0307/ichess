# iChess Studio — Sound & Interactive Academy

## Changes
- Local Web Audio move/capture/checkmate tones; Sound On/Off in header. Browsers may require a first user interaction to unlock audio.
- Separate interactive training chess board; does not alter the main game state.
- Chess Basics, Opening Academy, Endgame Academy with Beginner, Intermediate, Pro/Advanced tracks.
- Play/Pause, Next, Back, Replay and Try Yourself controls.
- All demonstration moves use chess.js legal-move processing. Some advanced endgame concept lessons are static position studies and explicitly say so.

## Deployment
Run `firebase deploy --only hosting` from the `ichess` directory after testing locally. Database rules are unchanged.

## Limitations
This is a first interactive curriculum, not a complete professional chess course. Lessons do not yet include narration, video export, evaluation-based coaching, spaced repetition, or progress sync. Online multiplayer has not been end-to-end tested in this environment.
