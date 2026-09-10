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
  { id: "gen-giraffe-neck-bones", subject: "general", theme: "creatures", text: "A giraffe has the same number of bones in its neck as you do — just seven." },
  { id: "gen-baby-bones", subject: "general", theme: "body", text: "A baby is born with about 300 bones, but an adult has only 206 — some fuse together." },
  { id: "gen-octopus-hearts", subject: "general", theme: "ocean", text: "An octopus has three hearts and blue blood." },
  { id: "gen-sharks-trees", subject: "general", theme: "ocean", text: "Sharks are older than trees — by tens of millions of years." },
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
  { id: "sci-sunlight-8min", subject: "Science", theme: "space", text: "Sunlight takes about 8 minutes and 20 seconds to reach Earth." },
  { id: "sci-rainbow-circle", subject: "Science", theme: "weather", text: "A rainbow is actually a full circle — the ground hides the bottom half." },
  { id: "sci-moon-footprints", subject: "Science", theme: "space", text: "The footprints on the Moon will stay there for millions of years, because there's no wind." },
  { id: "sci-ice-floats", subject: "Science", theme: "matter", text: "Water is unusual: it expands when it freezes, which is why ice floats." },
  { id: "sci-space-silent", subject: "Science", theme: "space", text: "Space is silent — sound needs air or water to travel through, and space has neither." },
  { id: "sci-sound-water", subject: "Science", theme: "matter", text: "Sound travels about four times faster through water than through air." },
  { id: "sci-moon-drifting", subject: "Science", theme: "space", text: "The Moon drifts about 4 centimetres further from Earth every year." },
  { id: "sci-venus-day", subject: "Science", theme: "space", text: "Venus spins so slowly that it takes longer to turn around once than to travel all the way around the Sun." },
  { id: "sci-lightning-hot", subject: "Science", theme: "weather", text: "A lightning bolt is about five times hotter than the surface of the Sun." },
  { id: "sci-iss-orbits", subject: "Science", theme: "space", text: "The International Space Station circles the Earth about 16 times a day." },
  { id: "sci-red-spot", subject: "Science", theme: "space", text: "Jupiter's Great Red Spot is a storm wider than the whole Earth." },
  { id: "sci-saturn-floats", subject: "Science", theme: "space", text: "Saturn is so light for its size that it would float in a big enough bathtub of water." },
  { id: "sci-carbon-twins", subject: "Science", theme: "matter", text: "Diamond and pencil graphite are both made of pure carbon — only the arrangement differs." },
  { id: "sci-liberty-green", subject: "Science", theme: "matter", text: "The Statue of Liberty was once shiny brown — it turned green as its copper reacted with air." },
  { id: "sci-antarctica-desert", subject: "Science", theme: "earth", text: "Antarctica is a desert — it gets very little precipitation." },
  { id: "sci-magnetic-north", subject: "Science", theme: "earth", text: "The Earth's magnetic north pole moves several kilometres every year." },
  { id: "sci-light-speed", subject: "Science", theme: "matter", text: "Light travels about 300,000 kilometres in one second." },
  { id: "sci-helium-sun", subject: "Science", theme: "matter", text: "Helium was discovered in sunlight in 1868, before anyone found it on Earth." },
  { id: "sci-glass-solid", subject: "Science", theme: "matter", text: "Glass is a solid, not a slow-moving liquid — old wavy windowpanes were simply made unevenly." },
  { id: "sci-femur-longest", subject: "Science", theme: "body", text: "Your thigh bone, the femur, is the longest bone in your body." },
  { id: "sci-neutron-star", subject: "Science", theme: "space", text: "A teaspoon of neutron star material would weigh about as much as a mountain." },
  { id: "sci-diamond-rain", subject: "Science", theme: "space", text: "Scientists think it may rain diamonds inside Neptune and Uranus." },
  { id: "sci-atom-empty", subject: "Science", theme: "matter", text: "Atoms are mostly empty space — if one were a stadium, the nucleus would be a marble at the centre." },
  { id: "sci-stars-sand", subject: "Science", theme: "space", text: "Astronomers estimate there are more stars in the observable universe than grains of sand on Earth." },
  { id: "sci-ocean-gold", subject: "Science", theme: "ocean", text: "The oceans hold millions of tonnes of dissolved gold — far too dilute to be worth extracting." },
  { id: "sci-dna-length", subject: "Science", theme: "body", text: "If you uncoiled the DNA in one of your cells, it would stretch about two metres." },

  // ── Mathematics ───────────────────────────────────────────────────────
  { id: "math-zero-even", subject: "Mathematics", theme: "numbers", text: "Zero is an even number." },
  { id: "math-feathers-iron", subject: "Mathematics", theme: "measure", text: "A kilogram of feathers and a kilogram of iron weigh exactly the same." },
  { id: "math-bee-hexagons", subject: "Mathematics", theme: "geometry", text: "Honeycomb is made of hexagons — the shape that holds the most honey for the least wax." },
  { id: "math-counting-forever", subject: "Mathematics", theme: "infinity", text: "Every number you can think of has a number bigger than it — counting never ends." },
  { id: "math-pizza-half", subject: "Mathematics", theme: "measure", text: "Cutting a pizza into 8 slices and eating 4 is the same as eating half." },
  { id: "math-ten-fingers", subject: "Mathematics", theme: "numbers", text: "We probably count in tens because we have ten fingers." },
  { id: "math-repunit-square", subject: "Mathematics", theme: "numbers", text: "111,111,111 × 111,111,111 = 12,345,678,987,654,321." },
  { id: "math-pi-forever", subject: "Mathematics", theme: "infinity", text: "The digits of pi go on forever and never settle into a repeating pattern." },
  { id: "math-birthday-paradox", subject: "Mathematics", theme: "chance", text: "In a room of just 23 people, there's about a 50% chance two share a birthday." },
  { id: "math-gauss-sum", subject: "Mathematics", theme: "numbers", text: "A schoolboy named Gauss is said to have added 1 to 100 in seconds by pairing the numbers: 50 pairs of 101 = 5,050." },
  { id: "math-chessboard-rice", subject: "Mathematics", theme: "numbers", text: "One grain of rice on square 1 of a chessboard, doubling each square, ends in more rice than the world grows in years." },
  { id: "math-mobius-strip", subject: "Mathematics", theme: "geometry", text: "A Möbius strip has only one side — draw a line along it and you'll return to the start." },
  { id: "math-zero-india", subject: "Mathematics", theme: "numbers", text: "The digit zero as a number, with rules for using it, was first written down in India by Brahmagupta." },
  { id: "math-shuffled-deck", subject: "Mathematics", theme: "chance", text: "Shuffle a deck of cards well, and that exact order has almost certainly never existed before." },
  { id: "math-nine-trick", subject: "Mathematics", theme: "numbers", text: "Multiply any counting number by 9, add its digits together, keep going — you always end at 9." },
  { id: "math-345-triangle", subject: "Mathematics", theme: "geometry", text: "A 3-4-5 triangle always has a perfect right angle — builders used it long before Pythagoras." },
  { id: "math-gamblers-fallacy", subject: "Mathematics", theme: "chance", text: "Flipping a coin ten heads in a row does not make tails more likely on the eleventh." },
  { id: "math-lakh-crore", subject: "Mathematics", theme: "numbers", text: "India groups large numbers as lakh and crore, while most of the world uses thousands and millions." },
  { id: "math-point-nine-recurring", subject: "Mathematics", theme: "infinity", text: "0.999... repeating is not close to 1 — it is exactly equal to 1." },
  { id: "math-uncountable", subject: "Mathematics", theme: "infinity", text: "There are more numbers between 0 and 1 than there are whole numbers in total." },
  { id: "math-fibonacci-nature", subject: "Mathematics", theme: "geometry", text: "The Fibonacci sequence shows up in the spiral counts of sunflower seed heads and pinecones." },
  { id: "math-curved-triangle", subject: "Mathematics", theme: "geometry", text: "On a curved surface like a globe, a triangle's angles can add up to more than 180°." },
  { id: "math-coastline-paradox", subject: "Mathematics", theme: "measure", text: "A coastline has no single true length — measure with a smaller ruler and it gets longer." },
  { id: "math-infinite-primes", subject: "Mathematics", theme: "infinity", text: "A prime number can be any size — Euclid proved over 2,000 years ago that they never run out." },
  { id: "math-honeycomb-proof", subject: "Mathematics", theme: "geometry", text: "The honeycomb pattern was proved in 1999 to be the most efficient way to divide a surface." },

  // ── English & language ────────────────────────────────────────────────
  { id: "eng-pangram-fox", subject: "English", theme: "wordplay", text: "\"The quick brown fox jumps over the lazy dog\" uses every letter of the alphabet." },
  { id: "eng-alphabet-origin", subject: "English", theme: "etymology", text: "The word \"alphabet\" comes from alpha and beta, the first two Greek letters." },
  { id: "eng-goodbye-origin", subject: "English", theme: "etymology", text: "\"Goodbye\" started as the phrase \"God be with ye\"." },
  { id: "eng-animal-sounds", subject: "English", theme: "communication", text: "Dogs say \"woof\" in English but \"bhow bhow\" in Hindi — languages hear animals differently." },
  { id: "eng-shortest-sentence", subject: "English", theme: "wordplay", text: "\"Go!\" is a complete English sentence — the subject \"you\" is understood." },
  { id: "eng-orange-rhyme", subject: "English", theme: "wordplay", text: "No common English word is a perfect rhyme for \"orange\", \"month\" or \"silver\"." },
  { id: "eng-shakespeare-words", subject: "English", theme: "books", text: "Shakespeare is credited with introducing hundreds of words to English, including \"lonely\" and \"eyeball\"." },
  { id: "eng-nerd-seuss", subject: "English", theme: "books", text: "\"Nerd\" first appeared in print in a Dr. Seuss book, If I Ran the Zoo, in 1950." },
  { id: "eng-rhythm-vowels", subject: "English", theme: "wordplay", text: "\"Rhythm\" is one of the longest English words with no A, E, I, O or U." },
  { id: "eng-uncopyrightable", subject: "English", theme: "wordplay", text: "\"Uncopyrightable\" is 15 letters long and doesn't repeat a single letter." },
  { id: "eng-gadsby-no-e", subject: "English", theme: "books", text: "A novel called Gadsby was written in 1939 without ever using the letter E." },
  { id: "eng-set-definitions", subject: "English", theme: "books", text: "The word \"set\" has one of the longest entries in the Oxford English Dictionary." },
  { id: "eng-ampersand-letter", subject: "English", theme: "etymology", text: "The ampersand \"&\" was once taught as the 27th letter of the alphabet." },
  { id: "eng-palindrome", subject: "English", theme: "wordplay", text: "A \"palindrome\" reads the same backwards — like \"racecar\" or \"madam\"." },
  { id: "eng-emoji-origin", subject: "English", theme: "etymology", text: "\"Emoji\" is Japanese for \"picture character\" — the resemblance to \"emotion\" is a coincidence." },
  { id: "eng-dord-ghost-word", subject: "English", theme: "books", text: "A mistake in a 1934 dictionary created the word \"dord\", which meant nothing and went unnoticed for five years." },
  { id: "eng-sign-languages", subject: "English", theme: "communication", text: "Sign language is not universal — Indian, British and American sign languages are all different." },
  { id: "eng-braille-teenager", subject: "English", theme: "communication", text: "Louis Braille invented the Braille alphabet when he was just 15 years old." },
  { id: "eng-longest-word", subject: "English", theme: "wordplay", text: "\"Pneumonoultramicroscopicsilicovolcanoconiosis\" is the longest word in major English dictionaries, at 45 letters." },
  { id: "eng-borrowed-words", subject: "English", theme: "etymology", text: "English has borrowed words from over 350 languages, including \"shampoo\", \"jungle\" and \"bungalow\" from India." },
  { id: "eng-question-mark", subject: "English", theme: "etymology", text: "One theory says the question mark came from abbreviating the Latin word quaestio." },
  { id: "eng-unwritten-languages", subject: "English", theme: "communication", text: "Around 3,000 of the world's roughly 7,000 living languages have no written form at all." },
  { id: "eng-dialect-prestige", subject: "English", theme: "communication", text: "There is no linguistic basis for calling one dialect \"correct\" — prestige, not grammar, decides it." },
  { id: "eng-no-spaces", subject: "English", theme: "etymology", text: "Punctuation is a late invention — early Greek and Latin texts had no spaces between words." },
  { id: "eng-new-words-rate", subject: "English", theme: "books", text: "Roughly one new word enters English every two hours, by some dictionary editors' estimates." },

  // ── Social Science (history & geography) ──────────────────────────────
  { id: "soc-vatican-smallest", subject: "Social Science", theme: "world", text: "Vatican City is the world's smallest country — you can walk across it in about 20 minutes." },
  { id: "soc-russia-timezones", subject: "Social Science", theme: "world", text: "Russia is so wide that it spans 11 time zones." },
  { id: "soc-canada-lakes", subject: "Social Science", theme: "world", text: "Canada has more lakes than any other country — at least 880,000 of them." },
  { id: "soc-dead-sea-float", subject: "Social Science", theme: "world", text: "The Dead Sea is so salty that you float without trying." },
  { id: "soc-india-languages", subject: "Social Science", theme: "world", text: "India's Constitution recognises 22 scheduled languages." },
  { id: "soc-pacific-size", subject: "Social Science", theme: "world", text: "The Pacific Ocean covers more of the Earth than all the land put together." },
  { id: "soc-mawsynram-rain", subject: "Social Science", theme: "weather", text: "Mawsynram and Cherrapunji in Meghalaya are among the wettest places on Earth." },
  { id: "soc-root-bridges", subject: "Social Science", theme: "landmarks", text: "In Meghalaya, people grow bridges from living rubber tree roots — some are centuries old." },
  { id: "soc-hikkim-post", subject: "Social Science", theme: "landmarks", text: "Guinness World Records lists the world's highest post office at Hikkim, Himachal Pradesh — 4,724 metres up." },
  { id: "soc-sundarbans", subject: "Social Science", theme: "world", text: "The Sundarbans, shared by India and Bangladesh, is the largest mangrove forest in the world." },
  { id: "soc-indian-railways", subject: "Social Science", theme: "invention", text: "Indian Railways is one of the largest employers in the world, with over a million staff." },
  { id: "soc-africa-hemispheres", subject: "Social Science", theme: "world", text: "Africa is the only continent in all four hemispheres — north, south, east and west." },
  { id: "soc-sahara-size", subject: "Social Science", theme: "world", text: "The Sahara Desert is roughly the size of the United States." },
  { id: "soc-everest-grows", subject: "Social Science", theme: "earth", text: "Mount Everest grows a few millimetres taller each year as tectonic plates push together." },
  { id: "soc-chess-india", subject: "Social Science", theme: "invention", text: "Chess began in India as a game called chaturanga, around 1,500 years ago." },
  { id: "soc-paper-money", subject: "Social Science", theme: "invention", text: "Paper money was invented in China, centuries before Europe adopted it." },
  { id: "soc-first-olympics", subject: "Social Science", theme: "timeline", text: "The Olympic Games were first recorded in ancient Greece in 776 BCE." },
  { id: "soc-indus-drains", subject: "Social Science", theme: "invention", text: "Cities of the Indus Valley had covered drains and planned streets over 4,000 years ago." },
  { id: "soc-chandrayaan-3", subject: "Social Science", theme: "invention", text: "India's Chandrayaan-3 made the first successful soft landing near the Moon's south pole, in 2023." },
  { id: "soc-cleopatra-timeline", subject: "Social Science", theme: "timeline", text: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid." },
  { id: "soc-oxford-aztec", subject: "Social Science", theme: "timeline", text: "Oxford University was already teaching students before the Aztec Empire was founded." },
  { id: "soc-mammoths-pyramids", subject: "Social Science", theme: "timeline", text: "Woolly mammoths were still alive on Wrangel Island while the Egyptian pyramids stood." },
  { id: "soc-shortest-war", subject: "Social Science", theme: "timeline", text: "The shortest recorded war lasted under 45 minutes — between Britain and Zanzibar in 1896." },
  { id: "soc-great-wall-myth", subject: "Social Science", theme: "landmarks", text: "The Great Wall of China is not one continuous wall, and it is not visible to the naked eye from space." },
] as const;
