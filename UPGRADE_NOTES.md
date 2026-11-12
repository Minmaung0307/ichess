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


## Refresh stability update
- All buttons explicitly use type=button to avoid implicit form submissions.
- The local match is saved in localStorage after board updates and restored on page load, including the move history and AI turn.
- New Game resets the board in-place, without navigation.
- Service worker updates no longer call skipWaiting/clients.claim, so an updated worker will not take control mid-game.
- No explicit location.reload is used in the app. Browser/hosting reloads cannot be fully prevented by site code, but game recovery protects progress.
