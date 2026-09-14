/**
 * Curated fun facts shown on loading screens.
 *
 * Authoring rules — please follow these when adding facts:
 *  - One sentence, readable in under ~6 seconds (keep `text` under 160 chars).
 *  - Verifiably true. Where a claim is an estimate or a live theory, say so in
 *    the wording ("scientists think", "astronomers estimate"). Do not strip
 *    that hedging out.
 *  - Nothing frightening, violent, medical, or political.
 *  - Facts are NOT filtered by grade — every fact can reach a six-year-old and
 *    a sixteen-year-old alike. Write for the youngest reader: concrete over
 *    abstract, no assumed prior knowledge, no notation. A fact only an older
 *    student can parse does not belong here.
 *  - Give a fact a `question` only if its answer is worth guessing at. The
 *    revealed fact must actually answer it — they are shown one after the
 *    other, never together.
 *  - Tag each fact with the `theme` that describes what it is *about*. The
 *    theme picks the icon; it is not meant to name the noun in the sentence.
 *  - `id` must be stable and unique — it is persisted in sessionStorage to
 *    avoid repeats, so renaming an id just costs one possible repeat.
 *
 * This is bundled static content rather than an API call on purpose: a loading
 * screen must never wait on a network request, and every fact here has been
 * checked by a human before it can reach a child.
 */

import type { FactTheme } from "./factThemes";

/** Broad subject buckets facts are tagged with. `general` fits any session. */
export type FactSubject =
  | "Mathematics"
  | "Science"
  | "English"
  | "Social Science"
  | "general";

export interface FunFact {
  /** Stable unique id, e.g. "sci-octopus-hearts". */
  id: string;
  /** One sentence, <= 160 characters. */
  text: string;
  subject: FactSubject;
  /** What the fact is about — selects the icon shown alongside it. */
  theme: FactTheme;
  /**
   * Optional teaser shown before the answer on interactive loaders. Add one
   * only where the answer is genuinely guessable — a number, a superlative, a
   * counterintuitive outcome. A fact whose interest is in the telling rather
   * than the answer should stay plain. Must end in a question mark.
   */
  question?: string;
}

export const FUN_FACTS: readonly FunFact[] = [
  // ── General / curiosity ────────────────────────────────────────────────
  { id: "gen-honey-keeps", subject: "general", theme: "matter", text: "Honey never spoils — it holds so little water that bacteria cannot grow in it." },
  { id: "gen-banana-berry", subject: "general", theme: "plants", text: "A banana is a berry, but a strawberry is not." },
  { id: "gen-elephant-jump", subject: "general", theme: "creatures", text: "Elephants are the only mammals that can't jump." },
  { id: "gen-flamingo-pink", subject: "general", theme: "birds", text: "Flamingos are born grey — they turn pink from the food they eat." },
  { id: "gen-butterfly-feet", subject: "general", theme: "tiny-life", text: "Butterflies taste with their feet." },
  { id: "gen-otters-hands", subject: "general", theme: "ocean", text: "Sea otters hold hands while they sleep so they don't drift apart." },
  { id: "gen-penguin-pebble", subject: "general", theme: "birds", text: "A male Gentoo penguin gives his mate a smooth pebble as a gift." },
  { id: "gen-cow-friends", subject: "general", theme: "creatures", text: "Studies suggest cows have best friends and get stressed when separated." },
  { id: "gen-giraffe-neck-bones", subject: "general", theme: "creatures", question: "How many bones are in a giraffe's neck?", text: "A giraffe has the same number of bones in its neck as you do — just seven." },
  { id: "gen-baby-bones", subject: "general", theme: "body", question: "Do you have more bones now, or when you were born?", text: "A baby is born with about 300 bones, but an adult has only 206 — some fuse together." },
  { id: "gen-octopus-hearts", subject: "general", theme: "ocean", question: "How many hearts does an octopus have?", text: "An octopus has three hearts and blue blood." },
  { id: "gen-sharks-trees", subject: "general", theme: "ocean", question: "Which came first on Earth — sharks, or trees?", text: "Sharks are older than trees — by tens of millions of years." },
  { id: "gen-wombat-cubes", subject: "general", theme: "creatures", text: "Wombats produce cube-shaped droppings, which don't roll away." },
  { id: "gen-ants-no-lungs", subject: "general", theme: "tiny-life", text: "Ants have no lungs — air reaches their body through tiny holes in their sides." },
  { id: "gen-crow-faces", subject: "general", theme: "birds", text: "Crows can recognise individual human faces and remember them for years." },
  { id: "gen-taste-buds", subject: "general", theme: "body", text: "The cells inside your taste buds wear out fast — most of them live only about ten days." },
  { id: "gen-bamboo-growth", subject: "general", theme: "plants", text: "Some bamboo species grow almost a metre in a single day." },
  { id: "gen-cashew-outside", subject: "general", theme: "plants", text: "A cashew grows on the outside of its fruit, not inside it." },
  { id: "gen-body-water", subject: "general", theme: "body", text: "About 60% of your body is water." },
  { id: "gen-eyes-flip", subject: "general", theme: "body", text: "Your eyes send the image upside down — your brain flips it the right way up." },
  { id: "gen-axolotl-regrow", subject: "general", theme: "creatures", text: "An axolotl can regrow a whole limb, and even parts of its heart and brain." },
  { id: "gen-tardigrade-space", subject: "general", theme: "tiny-life", text: "Tardigrades have survived being exposed to the vacuum of space." },
  { id: "gen-immortal-jellyfish", subject: "general", theme: "ocean", text: "The jellyfish Turritopsis dohrnii can revert to its juvenile stage, so it may never die of old age." },
  { id: "gen-stomach-lining", subject: "general", theme: "body", text: "Your stomach's lining renews itself every few days — otherwise its own acid would damage it." },

  // ── Science ───────────────────────────────────────────────────────────
  { id: "sci-sunlight-8min", subject: "Science", theme: "space", question: "How long does sunlight take to reach the Earth?", text: "Sunlight takes about 8 minutes and 20 seconds to reach Earth." },
  { id: "sci-rainbow-circle", subject: "Science", theme: "weather", text: "A rainbow is actually a full circle — the ground hides the bottom half." },
  { id: "sci-moon-footprints", subject: "Science", theme: "space", text: "The footprints on the Moon will stay there for millions of years, because there's no wind." },
  { id: "sci-ice-floats", subject: "Science", theme: "matter", text: "Water is unusual: it expands when it freezes, which is why ice floats." },
  { id: "sci-space-silent", subject: "Science", theme: "space", text: "Space is silent — sound needs air or water to travel through, and space has neither." },
  { id: "sci-sound-water", subject: "Science", theme: "matter", text: "Sound travels about four times faster through water than through air." },
  { id: "sci-moon-drifting", subject: "Science", theme: "space", text: "The Moon drifts about 4 centimetres further from Earth every year." },
  { id: "sci-venus-day", subject: "Science", theme: "space", question: "On Venus, which is longer — a single spin, or a whole year?", text: "Venus spins so slowly that it takes longer to turn around once than to travel all the way around the Sun." },
  { id: "sci-lightning-hot", subject: "Science", theme: "weather", question: "Which is hotter — a lightning bolt, or the surface of the Sun?", text: "A lightning bolt is about five times hotter than the surface of the Sun." },
  { id: "sci-iss-orbits", subject: "Science", theme: "space", question: "How many times does the Space Station circle the Earth in a day?", text: "The International Space Station circles the Earth about 16 times a day." },
  { id: "sci-red-spot", subject: "Science", theme: "space", text: "Jupiter's Great Red Spot is a storm wider than the whole Earth." },
  { id: "sci-saturn-floats", subject: "Science", theme: "space", question: "If you had a bathtub big enough, would Saturn sink or float?", text: "Saturn is so light for its size that it would float in a big enough bathtub of water." },
  { id: "sci-carbon-twins", subject: "Science", theme: "matter", text: "Diamond and pencil graphite are both made of pure carbon — only the arrangement differs." },
  { id: "sci-liberty-green", subject: "Science", theme: "matter", text: "The Statue of Liberty was once shiny brown — it turned green as its copper reacted with air." },
  { id: "sci-antarctica-desert", subject: "Science", theme: "earth", question: "Which of these is a desert: the Sahara, Antarctica, or both?", text: "Antarctica is a desert — it gets very little precipitation." },
  { id: "sci-magnetic-north", subject: "Science", theme: "earth", text: "The Earth's magnetic north pole moves several kilometres every year." },
  { id: "sci-light-speed", subject: "Science", theme: "matter", text: "Light travels about 300,000 kilometres in one second." },
  { id: "sci-helium-sun", subject: "Science", theme: "matter", text: "Helium was discovered in sunlight in 1868, before anyone found it on Earth." },
  { id: "sci-glass-solid", subject: "Science", theme: "matter", text: "Glass is a solid, not a slow-moving liquid — old wavy windowpanes were simply made unevenly." },
  { id: "sci-femur-longest", subject: "Science", theme: "body", text: "Your thigh bone, the femur, is the longest bone in your body." },
  { id: "sci-neutron-star", subject: "Science", theme: "space", question: "How much would one teaspoon of a neutron star weigh?", text: "A teaspoon of neutron star material would weigh about as much as a mountain." },
  { id: "sci-diamond-rain", subject: "Science", theme: "space", text: "Scientists think it may rain diamonds inside Neptune and Uranus." },
  { id: "sci-atom-empty", subject: "Science", theme: "matter", text: "Atoms are mostly empty space — if one were a stadium, the nucleus would be a marble at the centre." },
  { id: "sci-stars-sand", subject: "Science", theme: "space", text: "Astronomers estimate there are more stars in the observable universe than grains of sand on Earth." },
  { id: "sci-ocean-gold", subject: "Science", theme: "ocean", text: "The oceans hold millions of tonnes of dissolved gold — far too dilute to be worth extracting." },
  { id: "sci-dna-length", subject: "Science", theme: "body", question: "If you uncoiled the DNA from a single one of your cells, how long would it be?", text: "If you uncoiled the DNA in one of your cells, it would stretch about two metres." },

  // ── Mathematics ───────────────────────────────────────────────────────
  { id: "math-brahmagupta-zero", subject: "Mathematics", theme: "numbers", text: "In 628 CE, an Indian mathematician named Brahmagupta wrote the world's first rules for doing sums with zero." },
  { id: "math-ramanujan-1729", subject: "Mathematics", theme: "numbers", question: "What is interesting about the number 1729?", text: "Ramanujan was told 1729 was a dull taxi number — he replied it is the smallest number that is two cubes added together in two different ways." },
  { id: "math-shakuntala-devi", subject: "Mathematics", theme: "numbers", text: "In 1980, Shakuntala Devi multiplied two 13-digit numbers in her head and gave the right answer in 28 seconds." },
  { id: "math-lakh-crore", subject: "Mathematics", theme: "numbers", text: "Most of the world has no word for lakh or crore — those languages jump straight from thousand to million." },
  { id: "math-gauss-sum", subject: "Mathematics", theme: "numbers", question: "What do you get if you add every number from 1 to 100?", text: "Asked to add every number from 1 to 100, a schoolboy named Gauss paired them into 50 pairs of 101 and answered 5,050 in seconds." },
  { id: "math-repunit-square", subject: "Mathematics", theme: "numbers", question: "What do you get when you multiply 111,111,111 by itself?", text: "111,111,111 multiplied by itself gives 12,345,678,987,654,321 — the digits climb up to nine and back down again." },
  { id: "math-nine-trick", subject: "Mathematics", theme: "numbers", text: "Multiply any counting number by 9, add its digits, and repeat — you always end up at 9. Try it with 7, then with 4,829." },
  { id: "math-1089-trick", subject: "Mathematics", theme: "numbers", text: "Pick a three-digit number whose first and last digits differ, reverse it, subtract, then add that answer to its own reverse — always 1089." },
  { id: "math-thirty-seven", subject: "Mathematics", theme: "numbers", question: "Divide 111 by 3, or 222 by 6, or 999 by 27. What do they all give?", text: "111, 222, 333 — divide any of them by the sum of its own digits and the answer is always 37." },
  { id: "math-chessboard-rice", subject: "Mathematics", theme: "numbers", text: "In an old Indian tale a king promised one grain of rice on the first chess square, doubling each square — it would have buried his kingdom." },
  { id: "math-googol", subject: "Mathematics", theme: "numbers", question: "Which is bigger — a googol, or the number of atoms in the universe?", text: "A googol is 1 followed by a hundred zeros — bigger than the number of atoms in the whole observable universe." },
  { id: "math-same-hair-count", subject: "Mathematics", theme: "numbers", text: "In any city of more than 200,000 people, at least two must have exactly the same number of hairs on their head." },
  { id: "math-sulba-sutras", subject: "Mathematics", theme: "geometry", text: "The rule we call Pythagoras' theorem was written down in India's Sulba Sutras centuries before Pythagoras was born." },
  { id: "math-mobius-strip", subject: "Mathematics", theme: "geometry", text: "A Mobius strip has only one side — tape a twisted paper loop and draw along it until you arrive back where you started." },
  { id: "math-bee-hexagons", subject: "Mathematics", theme: "geometry", text: "Bees store honey in hexagons — the shape that holds the most honey for the least wax." },
  { id: "math-fibonacci-nature", subject: "Mathematics", theme: "geometry", text: "Count the spirals in a sunflower head and you almost always land on a Fibonacci number, like 34 or 55." },
  { id: "math-circle-ratio", subject: "Mathematics", theme: "geometry", text: "Every circle in the universe, big or small, gives the same answer when you divide the distance around it by the distance across." },
  { id: "math-triangle-corners", subject: "Mathematics", theme: "geometry", text: "Tear the three corners off a paper triangle and fit them together — they always make a perfectly straight line." },
  { id: "math-birthday-paradox", subject: "Mathematics", theme: "chance", question: "How many people need to be in a room for a 50-50 chance two share a birthday?", text: "In a room of just 23 people, there is about a 50% chance that two of them share a birthday." },
  { id: "math-shuffled-deck", subject: "Mathematics", theme: "chance", text: "Shuffle a deck of cards properly and that exact order has almost certainly never happened before in history." },
  { id: "math-coin-no-memory", subject: "Mathematics", theme: "chance", text: "A coin that has landed heads ten times in a row is still exactly 50-50 on the next flip. Coins have no memory." },
  { id: "math-rope-round-earth", subject: "Mathematics", theme: "measure", question: "Add one metre to a rope around the Earth. How far off the ground does it lift?", text: "Add just one metre to a rope wrapped around the Earth's equator and it lifts about 16 cm off the ground, all the way round." },
  { id: "math-paper-to-moon", subject: "Mathematics", theme: "measure", question: "How many times would you fold a sheet of paper to reach the Moon?", text: "A sheet of paper folded in half 42 times would be thick enough to reach the Moon." },
  { id: "math-infinite-primes", subject: "Mathematics", theme: "infinity", text: "However many prime numbers you find, there is always another. Euclid proved it more than 2,000 years ago." },
  { id: "math-kerala-pi", subject: "Mathematics", theme: "infinity", text: "Mathematicians in Kerala worked out how to reach pi by adding an endless list of fractions, about 250 years before Europe did." },

  // ── English & language ────────────────────────────────────────────────
  { id: "eng-pangram-fox", subject: "English", theme: "wordplay", text: "\"The quick brown fox jumps over the lazy dog\" uses every letter of the alphabet." },
  { id: "eng-alphabet-origin", subject: "English", theme: "etymology", text: "The word \"alphabet\" comes from alpha and beta, the first two Greek letters." },
  { id: "eng-goodbye-origin", subject: "English", theme: "etymology", text: "\"Goodbye\" started as the phrase \"God be with ye\"." },
  { id: "eng-animal-sounds", subject: "English", theme: "communication", text: "Dogs say \"woof\" in English but \"bhow bhow\" in Hindi — languages hear animals differently." },
  { id: "eng-shortest-sentence", subject: "English", theme: "wordplay", text: "\"Go!\" is a complete English sentence — the subject \"you\" is understood." },
  { id: "eng-orange-rhyme", subject: "English", theme: "wordplay", question: "Which common English word has no perfect rhyme: orange, month, or silver?", text: "No common English word is a perfect rhyme for \"orange\", \"month\" or \"silver\"." },
  { id: "eng-shakespeare-words", subject: "English", theme: "books", text: "Shakespeare is credited with introducing hundreds of words to English, including \"lonely\" and \"eyeball\"." },
  { id: "eng-nerd-seuss", subject: "English", theme: "books", question: "Where did the word \"nerd\" first appear in print?", text: "\"Nerd\" first appeared in print in a Dr. Seuss book, If I Ran the Zoo, in 1950." },
  { id: "eng-rhythm-vowels", subject: "English", theme: "wordplay", text: "\"Rhythm\" is one of the longest English words with no A, E, I, O or U." },
  { id: "eng-uncopyrightable", subject: "English", theme: "wordplay", question: "What is the longest English word that never repeats a letter?", text: "\"Uncopyrightable\" is 15 letters long and doesn't repeat a single letter." },
  { id: "eng-gadsby-no-e", subject: "English", theme: "books", question: "One 1939 novel never uses a single letter of the alphabet. Which letter?", text: "A novel called Gadsby was written in 1939 without ever using the letter E." },
  { id: "eng-set-definitions", subject: "English", theme: "books", text: "The word \"set\" has one of the longest entries in the Oxford English Dictionary." },
  { id: "eng-ampersand-letter", subject: "English", theme: "etymology", question: "Which symbol was once taught as the 27th letter of the alphabet?", text: "The ampersand \"&\" was once taught as the 27th letter of the alphabet." },
  { id: "eng-palindrome", subject: "English", theme: "wordplay", text: "A \"palindrome\" reads the same backwards — like \"racecar\" or \"madam\"." },
  { id: "eng-emoji-origin", subject: "English", theme: "etymology", question: "Does the word \"emoji\" have anything to do with emotion?", text: "\"Emoji\" is Japanese for \"picture character\" — the resemblance to \"emotion\" is a coincidence." },
  { id: "eng-dord-ghost-word", subject: "English", theme: "books", text: "A mistake in a 1934 dictionary created the word \"dord\", which meant nothing and went unnoticed for five years." },
  { id: "eng-sign-languages", subject: "English", theme: "communication", text: "Sign language is not universal — Indian, British and American sign languages are all different." },
  { id: "eng-braille-teenager", subject: "English", theme: "communication", question: "How old was Louis Braille when he invented the Braille alphabet?", text: "Louis Braille invented the Braille alphabet when he was just 15 years old." },
  { id: "eng-longest-word", subject: "English", theme: "wordplay", question: "How many letters are in the longest word in an English dictionary?", text: "\"Pneumonoultramicroscopicsilicovolcanoconiosis\" is the longest word in major English dictionaries, at 45 letters." },
  { id: "eng-borrowed-words", subject: "English", theme: "etymology", text: "English has borrowed words from over 350 languages, including \"shampoo\", \"jungle\" and \"bungalow\" from India." },
  { id: "eng-question-mark", subject: "English", theme: "etymology", text: "One theory says the question mark came from abbreviating the Latin word quaestio." },
  { id: "eng-unwritten-languages", subject: "English", theme: "communication", text: "Around 3,000 of the world's roughly 7,000 living languages have no written form at all." },
  { id: "eng-dialect-prestige", subject: "English", theme: "communication", text: "There is no linguistic basis for calling one dialect \"correct\" — prestige, not grammar, decides it." },
  { id: "eng-no-spaces", subject: "English", theme: "etymology", text: "Punctuation is a late invention — early Greek and Latin texts had no spaces between words." },
  { id: "eng-new-words-rate", subject: "English", theme: "books", text: "Roughly one new word enters English every two hours, by some dictionary editors' estimates." },

  // ── Social Science (history & geography) ──────────────────────────────
  { id: "soc-vatican-smallest", subject: "Social Science", theme: "world", question: "What is the smallest country in the world?", text: "Vatican City is the world's smallest country — you can walk across it in about 20 minutes." },
  { id: "soc-russia-timezones", subject: "Social Science", theme: "world", question: "How many time zones does Russia stretch across?", text: "Russia is so wide that it spans 11 time zones." },
  { id: "soc-canada-lakes", subject: "Social Science", theme: "world", text: "Canada has more lakes than any other country — at least 880,000 of them." },
  { id: "soc-dead-sea-float", subject: "Social Science", theme: "world", text: "The Dead Sea is so salty that you float without trying." },
  { id: "soc-india-languages", subject: "Social Science", theme: "world", question: "How many languages does India's Constitution recognise?", text: "India's Constitution recognises 22 scheduled languages." },
  { id: "soc-pacific-size", subject: "Social Science", theme: "world", question: "Which is bigger — the Pacific Ocean, or all the land on Earth?", text: "The Pacific Ocean covers more of the Earth than all the land put together." },
  { id: "soc-mawsynram-rain", subject: "Social Science", theme: "weather", text: "Mawsynram and Cherrapunji in Meghalaya are among the wettest places on Earth." },
  { id: "soc-root-bridges", subject: "Social Science", theme: "landmarks", text: "In Meghalaya, people grow bridges from living rubber tree roots — some are centuries old." },
  { id: "soc-hikkim-post", subject: "Social Science", theme: "landmarks", text: "Guinness World Records lists the world's highest post office at Hikkim, Himachal Pradesh — 4,724 metres up." },
  { id: "soc-sundarbans", subject: "Social Science", theme: "world", text: "The Sundarbans, shared by India and Bangladesh, is the largest mangrove forest in the world." },
  { id: "soc-indian-railways", subject: "Social Science", theme: "invention", text: "Indian Railways is one of the largest employers in the world, with over a million staff." },
  { id: "soc-africa-hemispheres", subject: "Social Science", theme: "world", text: "Africa is the only continent in all four hemispheres — north, south, east and west." },
  { id: "soc-sahara-size", subject: "Social Science", theme: "world", text: "The Sahara Desert is roughly the size of the United States." },
  { id: "soc-everest-grows", subject: "Social Science", theme: "earth", question: "Is Mount Everest still getting taller?", text: "Mount Everest grows a few millimetres taller each year as tectonic plates push together." },
  { id: "soc-chess-india", subject: "Social Science", theme: "invention", text: "Chess began in India as a game called chaturanga, around 1,500 years ago." },
  { id: "soc-paper-money", subject: "Social Science", theme: "invention", text: "Paper money was invented in China, centuries before Europe adopted it." },
  { id: "soc-first-olympics", subject: "Social Science", theme: "timeline", text: "The Olympic Games were first recorded in ancient Greece in 776 BCE." },
  { id: "soc-indus-drains", subject: "Social Science", theme: "invention", text: "Cities of the Indus Valley had covered drains and planned streets over 4,000 years ago." },
  { id: "soc-chandrayaan-3", subject: "Social Science", theme: "invention", text: "India's Chandrayaan-3 made the first successful soft landing near the Moon's south pole, in 2023." },
  { id: "soc-cleopatra-timeline", subject: "Social Science", theme: "timeline", question: "Did Cleopatra live closer to the building of the pyramids, or to the Moon landing?", text: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid." },
  { id: "soc-oxford-aztec", subject: "Social Science", theme: "timeline", text: "Oxford University was already teaching students before the Aztec Empire was founded." },
  { id: "soc-mammoths-pyramids", subject: "Social Science", theme: "timeline", text: "Woolly mammoths were still alive on Wrangel Island while the Egyptian pyramids stood." },
  { id: "soc-shortest-war", subject: "Social Science", theme: "timeline", question: "How long was the shortest war ever recorded?", text: "The shortest recorded war lasted under 45 minutes — between Britain and Zanzibar in 1896." },
  { id: "soc-great-wall-myth", subject: "Social Science", theme: "landmarks", question: "Can you really see the Great Wall of China from space?", text: "The Great Wall of China is not one continuous wall, and it is not visible to the naked eye from space." },
] as const;
