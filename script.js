// we import guess_words and target_words from words.js

const WORD_LENGTH = 5;
const FLIP_ANIMATION_DURATION = 200;
const DANCE_ANIMATION_DURATION = 200;
const keyboard = document.querySelector("[data-keyboard]");
const alertContainer = document.querySelector("[data-alert-container]");
const guessGrid = document.querySelector("[data-guess-grid]");


start_interaction();
let remaining_words = target_words.slice();
const all_states = prepare_all_states();

function start_interaction() {
    // when waiting for user input
    document.addEventListener("click", handle_mouse_click);
    document.addEventListener("keydown", handle_key_press);
}

function stop_interaction() {
    // when not waiting for user input
    document.removeEventListener("click", handle_mouse_click);
    document.removeEventListener("keydown", handle_key_press);
}

function handle_mouse_click(event) {
    // allow gameplay via mouse
    if (event.target.matches("[data-key]")) {
        press_key(event.target.dataset.key);
        return;
    }

    if (event.target.matches("[data-enter]")) {
        submit_guess();
        return;
    }

    if (event.target.matches("[data-delete]")) {
        delete_key();
        return;
    }
}

function handle_key_press(event) {
    // allow gameplay via keyboard
    if (event.key === "Enter") {
        submit_guess();
        return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
        delete_key();
        return;
    }

    if (event.key.match(/^[a-z]$/)) {
        press_key(event.key);
        return;
    }
}

function press_key(key) {
    const activeTiles = get_active_tiles();
    if (activeTiles.length >= WORD_LENGTH) return;
    const nextTile = guessGrid.querySelector(":not([data-letter])");
    nextTile.dataset.letter = key.toLowerCase();
    nextTile.textContent = key;
    nextTile.dataset.state = "active";
}

function delete_key() {
    const activeTiles = get_active_tiles();
    const lastTile = activeTiles[activeTiles.length - 1];
    if (lastTile == null) return;
    lastTile.textContent = "";
    delete lastTile.dataset.state;
    delete lastTile.dataset.letter;
}

function submit_guess() {

    const activeTiles = [...get_active_tiles()];

    // check if guess has five letters
    if (activeTiles.length !== WORD_LENGTH) {
        show_alert("Guess has to have five letters.");
        shake_tiles(activeTiles);
        return;
    }

    // read guess from input fields
    const guess = activeTiles.reduce((word, tile) => {
        return word + tile.dataset.letter;
    }, "");

    // check if guess is in allowed word list
    if (!guess_words.includes(guess)) {
        show_alert(`Not in word list`);
        // show_alert(`${guess.toUpperCase()} is not in the word list.`);
        shake_tiles(activeTiles);
        return;
    }
    stop_interaction();

    const state = calculate_best_state(guess)
    // flip tiles according to state
    activeTiles.forEach((...params) => flip_tile(...params, state));
}

function prepare_all_states() {
    // calculate all possible state combinations of length 5
    position_states = ["false", "wrong_position", "correct"]
    states = []
    for (let position1 of position_states) {
        for (let position2 of position_states) {
            for (let position3 of position_states) {
                for (let position4 of position_states) {
                    for (let position5 of position_states) {
                        states.push([position1, position2, position3, position4, position5])
                    }
                }
            }
        }
    }
    return states
}

function is_word_valid(guess, word, state) {
    let how_often_wrong_position_left = {}

    // correct pass
    for (let index = 0; index < WORD_LENGTH; index++) {
        let state_position = state[index]
        let word_character = word[index]

        if (word_character in how_often_wrong_position_left) {
            how_often_wrong_position_left[word_character] += 1
        } else {
            how_often_wrong_position_left[word_character] = 1
        }

        if (state_position == "correct") {
            let guess_character = guess[index]
            if (guess_character == word_character) {
                how_often_wrong_position_left[guess_character] -= 1
                continue
            } else {
                return false
            }
        }
    }

    // wrong position pass
    for (let index = 0; index < WORD_LENGTH; index++) {
        let state_position = state[index]
        if (state_position == "wrong_position") {
            let guess_character = guess[index]
            let word_character = word[index]
            if (guess_character == word_character) {
                // we have a correct guess, but we dont want one at this position
                return false
            } else if (!word.includes(guess_character)) {
                // guessed character is not in the word at at all
                return false
            } else if (how_often_wrong_position_left[guess_character] > 0) {
                // guessed character is in the word, but not at this postion
                // thats what we want, but do we still have "wrong position"
                // answers left for this character?
                how_often_wrong_position_left[guess_character] -= 1
                continue
            } else {
                // no "wrong position" answers left
                return false
            }

        }
    }

    // false pass
    for (let index = 0; index < WORD_LENGTH; index++) {
        let state_position = state[index]
        if (state_position == "false") {
            let guess_character = guess[index]
            let word_character = word[index]
            if (guess_character == word_character) {
                return false
            }
            else if (!word.includes(guess_character)) {
                continue
            } else if (how_often_wrong_position_left[guess_character] > 0) {
                // we had "wrong positions" left, so false would not be ok
                return false
            } else {
                continue
            }
        }

    }
    return true
}
function find_words_under_state(guess, possible_words, state) {
    let words = []
    for (let word of possible_words) {
        if (is_word_valid(guess, word, state)) {
            words.push(word)
        }
    }
    return words
}

function calculate_best_state(guess) {
    let best_states = [];
    let best_state_len_words = 0;

    for (let state of all_states) {
        // find all words of remaining words that would remain 
        // if we answer this state
        const words_under_state = find_words_under_state(guess, remaining_words, state);
        // count them
        const state_len_words = words_under_state.length;
        // did we find a state with more words left than current best?
        // if yes
        if (state_len_words > best_state_len_words) {
            best_states = [];
            best_states.push([state, words_under_state]);
            best_state_len_words = state_len_words;
        } else if (state_len_words == best_state_len_words) {
            // dont add all correct state if we have other states with same number of 
            // words
            if (state.every(element => element == "correct")) {
                continue
            }
            // found equally good state, save it to randomly choose one at the end
            best_states.push([state, words_under_state]);
        }
    }
    // choose state-words pair from best states randomly
    const random_best_entry = best_states[Math.floor(Math.random() * best_states.length)];
    const random_best_state = random_best_entry[0];
    // make words of best state new remaining words
    remaining_words = random_best_entry[1];
    return random_best_state

}

function flip_tile(tile, index, tiles, state) {
    const letter = tile.dataset.letter;
    const key = keyboard.querySelector(`[data-key="${letter}"i]`);
    setTimeout(() => {
        tile.classList.add("flip");
    }, (index * FLIP_ANIMATION_DURATION) / 2);

    tile.addEventListener(
        "transitionend",
        () => {
            tile.classList.remove("flip");
            if (state[index] == "correct") {
                tile.dataset.state = "correct";
                key.classList.add("correct");
            } else if (state[index] == "wrong_position") {
                tile.dataset.state = "wrong-location";
                key.classList.add("wrong-location");
            } else {
                tile.dataset.state = "wrong";
                key.classList.add("wrong");
            }

            if (index === tiles.length - 1) {
                tile.addEventListener(
                    "transitionend",
                    () => {
                        start_interaction();
                        check_win_lose(state, tiles);
                    },
                    { once: true }
                );
            }
        },
        { once: true }
    );
}

function get_active_tiles() {
    return guessGrid.querySelectorAll('[data-state="active"]');
}

function show_alert(message, duration = 1000) {
    const alert = document.createElement("div");
    alert.innerHTML = message;
    alert.classList.add("alert");
    alertContainer.prepend(alert);
    if (duration == null) return;

    setTimeout(() => {
        alert.classList.add("hide");
        alert.addEventListener("transitionend", () => {
            alert.remove();
        });
    }, duration);
}

function shake_tiles(tiles) {
    tiles.forEach((tile) => {
        tile.classList.add("shake");
        tile.addEventListener(
            "animationend",
            () => {
                tile.classList.remove("shake");
            },
            { once: true }
        );
    });
}

function check_win_lose(state, tiles) {
    // if all elements of state are correct
    if (state.every(element => element == "correct")) {
        show_alert("Well done!", null);
        dance_tiles(tiles);
        stop_interaction();
        return;
    }

    // final state is not all correct
    const revealed_word = remaining_words[Math.floor(Math.random() * remaining_words.length)];
    const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
    if (remainingTiles.length === 0) {
        // choose random word from remaining words
        show_alert(`${revealed_word.toUpperCase()}`, null);
        stop_interaction();
    }
}

function dance_tiles(tiles) {
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            tile.classList.add("dance");
            tile.addEventListener(
                "animationend",
                () => {
                    tile.classList.remove("dance");
                },
                { once: true }
            );
        }, (index * DANCE_ANIMATION_DURATION) / 5);
    });
}
