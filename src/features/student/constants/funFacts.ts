/**
 * Curated fun facts shown on loading screens.
 *
 * Authoring rules — please follow these when adding facts:
 *  - One sentence, readable in under ~6 seconds (keep `text` under 160 chars).
 *  - Verifiably true. Where a claim is an estimate or a live theory, say so in
 *    the wording ("scientists think", "astronomers estimate"). Do not strip
 *    that hedging out.
 *  - Nothing frightening, violent, medical, or political.
 *  - Grade bands: 1-4 concrete/sensory, 5-8 mechanism/numbers,
 *    9-12 abstract or syllabus-adjacent.
 *  - `id` must be stable and unique — it is persisted in sessionStorage to
 *    avoid repeats, so renaming an id just costs one possible repeat.
 *
 * This is bundled static content rather than an API call on purpose: a loading
 * screen must never wait on a network request, and every fact here has been
 * checked by a human before it can reach a child.
 */

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
  /** Inclusive lower bound of the school grades this suits. */
  minGrade: number;
  /** Inclusive upper bound of the school grades this suits. */
  maxGrade: number;
  /** Small visual anchor rendered decoratively (aria-hidden). */
  emoji: string;
}

export const FUN_FACTS: readonly FunFact[] = [
  // ── General / curiosity ────────────────────────────────────────────────
  { id: "gen-honey-keeps", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🍯", text: "Honey never spoils — jars found in ancient Egyptian tombs were still edible." },
  { id: "gen-banana-berry", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🍌", text: "A banana is a berry, but a strawberry is not." },
  { id: "gen-elephant-jump", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🐘", text: "Elephants are the only mammals that can't jump." },
  { id: "gen-flamingo-pink", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🦩", text: "Flamingos are born grey — they turn pink from the food they eat." },
  { id: "gen-butterfly-feet", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🦋", text: "Butterflies taste with their feet." },
  { id: "gen-otters-hands", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🦦", text: "Sea otters hold hands while they sleep so they don't drift apart." },
  { id: "gen-penguin-pebble", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🐧", text: "A male Gentoo penguin gives his mate a smooth pebble as a gift." },
  { id: "gen-cow-friends", subject: "general", minGrade: 1, maxGrade: 4, emoji: "🐄", text: "Studies suggest cows have best friends and get stressed when separated." },
  { id: "gen-nose-ears-grow", subject: "general", minGrade: 1, maxGrade: 4, emoji: "👃", text: "Your nose and ears keep growing your whole life." },
  { id: "gen-baby-bones", subject: "general", minGrade: 1, maxGrade: 4, emoji: "👶", text: "A baby is born with about 300 bones, but an adult has only 206 — some fuse together." },
  { id: "gen-octopus-hearts", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🐙", text: "An octopus has three hearts and blue blood." },
  { id: "gen-sharks-trees", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🦈", text: "Sharks are older than trees — sharks by about 100 million years." },
  { id: "gen-wombat-cubes", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🐻", text: "Wombats produce cube-shaped droppings, which don't roll away." },
  { id: "gen-ants-no-lungs", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🐜", text: "Ants have no lungs — air reaches their body through tiny holes in their sides." },
  { id: "gen-crow-faces", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🐦", text: "Crows can recognise individual human faces and remember them for years." },
  { id: "gen-taste-buds", subject: "general", minGrade: 5, maxGrade: 8, emoji: "👅", text: "Your taste buds are replaced roughly every ten days." },
  { id: "gen-bamboo-growth", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🎋", text: "Some bamboo species grow almost a metre in a single day." },
  { id: "gen-cashew-outside", subject: "general", minGrade: 5, maxGrade: 8, emoji: "🥜", text: "A cashew grows on the outside of its fruit, not inside it." },
  { id: "gen-body-water", subject: "general", minGrade: 5, maxGrade: 8, emoji: "💧", text: "About 60% of your body is water." },
  { id: "gen-eyes-flip", subject: "general", minGrade: 5, maxGrade: 8, emoji: "👁️", text: "Your eyes send the image upside down — your brain flips it the right way up." },
  { id: "gen-axolotl-regrow", subject: "general", minGrade: 9, maxGrade: 12, emoji: "🦎", text: "An axolotl can regrow a whole limb, and even parts of its heart and brain." },
  { id: "gen-tardigrade-space", subject: "general", minGrade: 9, maxGrade: 12, emoji: "🐻‍❄️", text: "Tardigrades have survived being exposed to the vacuum of space." },
  { id: "gen-immortal-jellyfish", subject: "general", minGrade: 9, maxGrade: 12, emoji: "🎐", text: "The jellyfish Turritopsis dohrnii can revert to its juvenile stage, so it may never die of old age." },
  { id: "gen-stomach-lining", subject: "general", minGrade: 9, maxGrade: 12, emoji: "🧱", text: "Your stomach's lining renews itself every few days — otherwise its own acid would damage it." },

  // ── Science ───────────────────────────────────────────────────────────
  { id: "sci-sunlight-8min", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "☀️", text: "Sunlight takes about 8 minutes and 20 seconds to reach Earth." },
  { id: "sci-rainbow-circle", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🌈", text: "A rainbow is actually a full circle — the ground hides the bottom half." },
  { id: "sci-moon-footprints", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🌙", text: "The footprints on the Moon will stay there for millions of years, because there's no wind." },
  { id: "sci-ice-floats", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🧊", text: "Water is unusual: it expands when it freezes, which is why ice floats." },
  { id: "sci-space-silent", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🔇", text: "Space is silent — sound needs air or water to travel through, and space has neither." },
  { id: "sci-sound-water", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🌊", text: "Sound travels about four times faster through water than through air." },
  { id: "sci-snail-sleep", subject: "Science", minGrade: 1, maxGrade: 4, emoji: "🐌", text: "A snail can sleep for up to three years when conditions are dry." },
  { id: "sci-venus-day", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🪐", text: "A day on Venus is longer than its year — it spins slower than it orbits the Sun." },
  { id: "sci-lightning-hot", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "⚡", text: "A lightning bolt is about five times hotter than the surface of the Sun." },
  { id: "sci-iss-orbits", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🛰️", text: "The International Space Station circles the Earth about 16 times a day." },
  { id: "sci-red-spot", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🔴", text: "Jupiter's Great Red Spot is a storm wider than the whole Earth." },
  { id: "sci-saturn-floats", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🎈", text: "Saturn is so light for its size that it would float in a big enough bathtub of water." },
  { id: "sci-carbon-twins", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "✏️", text: "Diamond and pencil graphite are both made of pure carbon — only the arrangement differs." },
  { id: "sci-liberty-green", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🗽", text: "The Statue of Liberty was once shiny brown — it turned green as its copper reacted with air." },
  { id: "sci-antarctica-desert", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🌵", text: "Antarctica is a desert — it gets very little precipitation." },
  { id: "sci-magnetic-north", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🧲", text: "The Earth's magnetic north pole moves several kilometres every year." },
  { id: "sci-light-speed", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🔆", text: "Light travels about 300,000 kilometres in one second." },
  { id: "sci-helium-sun", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🌡️", text: "Helium was discovered in sunlight in 1868, before anyone found it on Earth." },
  { id: "sci-glass-solid", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🪟", text: "Glass is a solid, not a slow-moving liquid — old wavy windowpanes were simply made unevenly." },
  { id: "sci-femur-longest", subject: "Science", minGrade: 5, maxGrade: 8, emoji: "🦴", text: "Your thigh bone, the femur, is the longest bone in your body." },
  { id: "sci-neutron-star", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "🌟", text: "A teaspoon of neutron star material would weigh about as much as a mountain." },
  { id: "sci-diamond-rain", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "💎", text: "Scientists think it may rain diamonds inside Neptune and Uranus." },
  { id: "sci-atom-empty", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "⚛️", text: "Atoms are mostly empty space — if one were a stadium, the nucleus would be a marble at the centre." },
  { id: "sci-stars-sand", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "🌌", text: "Astronomers estimate there are more stars in the observable universe than grains of sand on Earth." },
  { id: "sci-ocean-gold", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "🌊", text: "The oceans hold millions of tonnes of dissolved gold — far too dilute to be worth extracting." },
  { id: "sci-dna-length", subject: "Science", minGrade: 9, maxGrade: 12, emoji: "🧬", text: "If you uncoiled the DNA in one of your cells, it would stretch about two metres." },

  // ── Mathematics ───────────────────────────────────────────────────────
  { id: "math-zero-even", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "0️⃣", text: "Zero is an even number." },
  { id: "math-feathers-iron", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "⚖️", text: "A kilogram of feathers and a kilogram of iron weigh exactly the same." },
  { id: "math-bee-hexagons", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "🐝", text: "Bees build hexagons because that shape stores the most honey using the least wax." },
  { id: "math-counting-forever", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "🔢", text: "Every number you can think of has a number bigger than it — counting never ends." },
  { id: "math-pizza-half", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "🍕", text: "Cutting a pizza into 8 slices and eating 4 is the same as eating half." },
  { id: "math-ten-fingers", subject: "Mathematics", minGrade: 1, maxGrade: 4, emoji: "✋", text: "We probably count in tens because we have ten fingers." },
  { id: "math-repunit-square", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🧮", text: "111,111,111 × 111,111,111 = 12,345,678,987,654,321." },
  { id: "math-pi-forever", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🥧", text: "The digits of pi go on forever and never settle into a repeating pattern." },
  { id: "math-birthday-paradox", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🎂", text: "In a room of just 23 people, there's about a 50% chance two share a birthday." },
  { id: "math-gauss-sum", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "➕", text: "A schoolboy named Gauss is said to have added 1 to 100 in seconds by pairing the numbers: 50 pairs of 101 = 5,050." },
  { id: "math-chessboard-rice", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "♟️", text: "One grain of rice on square 1 of a chessboard, doubling each square, ends in more rice than the world grows in years." },
  { id: "math-mobius-strip", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🔁", text: "A Möbius strip has only one side — draw a line along it and you'll return to the start." },
  { id: "math-zero-india", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🇮🇳", text: "The digit zero as a number, with rules for using it, was first written down in India by Brahmagupta." },
  { id: "math-shuffled-deck", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🃏", text: "Shuffle a deck of cards well, and that exact order has almost certainly never existed before." },
  { id: "math-nine-trick", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "9️⃣", text: "Multiply any number by 9, add its digits together, keep going — you always end at 9." },
  { id: "math-345-triangle", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "📏", text: "A 3-4-5 triangle always has a perfect right angle — builders used it long before Pythagoras." },
  { id: "math-gamblers-fallacy", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🪙", text: "Flipping a coin ten heads in a row does not make tails more likely on the eleventh." },
  { id: "math-lakh-crore", subject: "Mathematics", minGrade: 5, maxGrade: 8, emoji: "🔟", text: "India groups large numbers as lakh and crore, while most of the world uses thousands and millions." },
  { id: "math-point-nine-recurring", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🟰", text: "0.999... repeating is not close to 1 — it is exactly equal to 1." },
  { id: "math-uncountable", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "♾️", text: "There are more numbers between 0 and 1 than there are whole numbers in total." },
  { id: "math-fibonacci-nature", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🐚", text: "The Fibonacci sequence shows up in sunflower seeds, pinecones and shell spirals." },
  { id: "math-curved-triangle", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🔺", text: "On a curved surface like a globe, a triangle's angles can add up to more than 180°." },
  { id: "math-coastline-paradox", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🌀", text: "A coastline has no single true length — measure with a smaller ruler and it gets longer." },
  { id: "math-infinite-primes", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🎲", text: "A prime number can be any size — Euclid proved over 2,000 years ago that they never run out." },
  { id: "math-honeycomb-proof", subject: "Mathematics", minGrade: 9, maxGrade: 12, emoji: "🧊", text: "The honeycomb pattern was proved in 1999 to be the most efficient way to divide a surface." },

  // ── English & language ────────────────────────────────────────────────
  { id: "eng-pangram-fox", subject: "English", minGrade: 1, maxGrade: 4, emoji: "🦊", text: "\"The quick brown fox jumps over the lazy dog\" uses every letter of the alphabet." },
  { id: "eng-alphabet-origin", subject: "English", minGrade: 1, maxGrade: 4, emoji: "🔤", text: "The word \"alphabet\" comes from alpha and beta, the first two Greek letters." },
  { id: "eng-goodbye-origin", subject: "English", minGrade: 1, maxGrade: 4, emoji: "👋", text: "\"Goodbye\" started as the phrase \"God be with ye\"." },
  { id: "eng-animal-sounds", subject: "English", minGrade: 1, maxGrade: 4, emoji: "🐕", text: "Dogs say \"woof\" in English but \"bhow bhow\" in Hindi — languages hear animals differently." },
  { id: "eng-shortest-sentence", subject: "English", minGrade: 1, maxGrade: 4, emoji: "➡️", text: "\"Go!\" is a complete English sentence — the subject \"you\" is understood." },
  { id: "eng-orange-rhyme", subject: "English", minGrade: 1, maxGrade: 4, emoji: "🍊", text: "No common English word is a perfect rhyme for \"orange\", \"month\" or \"silver\"." },
  { id: "eng-shakespeare-words", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🎭", text: "Shakespeare is credited with introducing hundreds of words to English, including \"lonely\" and \"eyeball\"." },
  { id: "eng-nerd-seuss", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🧠", text: "\"Nerd\" first appeared in print in a Dr. Seuss book, If I Ran the Zoo, in 1950." },
  { id: "eng-rhythm-vowels", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🎵", text: "\"Rhythm\" is one of the longest English words with no A, E, I, O or U." },
  { id: "eng-uncopyrightable", subject: "English", minGrade: 5, maxGrade: 8, emoji: "✍️", text: "\"Uncopyrightable\" is 15 letters long and doesn't repeat a single letter." },
  { id: "eng-gadsby-no-e", subject: "English", minGrade: 5, maxGrade: 8, emoji: "📖", text: "A novel called Gadsby was written in 1939 without ever using the letter E." },
  { id: "eng-set-definitions", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🔡", text: "The word \"set\" has one of the longest entries in the Oxford English Dictionary." },
  { id: "eng-ampersand-letter", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🔣", text: "The ampersand \"&\" was once taught as the 27th letter of the alphabet." },
  { id: "eng-palindrome", subject: "English", minGrade: 5, maxGrade: 8, emoji: "👀", text: "A \"palindrome\" reads the same backwards — like \"racecar\" or \"madam\"." },
  { id: "eng-emoji-origin", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🇯🇵", text: "\"Emoji\" is Japanese for \"picture character\" — the resemblance to \"emotion\" is a coincidence." },
  { id: "eng-dord-ghost-word", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🫥", text: "A typo in a 1934 dictionary created the word \"dord\", which meant nothing and stayed for five years." },
  { id: "eng-sign-languages", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🤟", text: "Sign language is not universal — Indian, British and American sign languages are all different." },
  { id: "eng-braille-teenager", subject: "English", minGrade: 5, maxGrade: 8, emoji: "🅰️", text: "Louis Braille invented the Braille alphabet when he was just 15 years old." },
  { id: "eng-longest-word", subject: "English", minGrade: 9, maxGrade: 12, emoji: "🫁", text: "\"Pneumonoultramicroscopicsilicovolcanoconiosis\" is the longest word in major English dictionaries, at 45 letters." },
  { id: "eng-borrowed-words", subject: "English", minGrade: 9, maxGrade: 12, emoji: "🌍", text: "English has borrowed words from over 350 languages, including \"shampoo\", \"jungle\" and \"bungalow\" from India." },
  { id: "eng-question-mark", subject: "English", minGrade: 9, maxGrade: 12, emoji: "❓", text: "One theory says the question mark came from abbreviating the Latin word quaestio." },
  { id: "eng-unwritten-languages", subject: "English", minGrade: 9, maxGrade: 12, emoji: "📜", text: "Fewer than half the world's roughly 7,000 languages have a written form." },
  { id: "eng-dialect-prestige", subject: "English", minGrade: 9, maxGrade: 12, emoji: "🗣️", text: "There is no linguistic basis for calling one dialect \"correct\" — prestige, not grammar, decides it." },
  { id: "eng-no-spaces", subject: "English", minGrade: 9, maxGrade: 12, emoji: "🔠", text: "Punctuation is a late invention — early Greek and Latin texts had no spaces between words." },
  { id: "eng-new-words-rate", subject: "English", minGrade: 9, maxGrade: 12, emoji: "📚", text: "Roughly one new word enters English every two hours, by some dictionary editors' estimates." },

  // ── Social Science (history & geography) ──────────────────────────────
  { id: "soc-vatican-smallest", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🏰", text: "Vatican City is the world's smallest country — you can walk across it in about 20 minutes." },
  { id: "soc-russia-timezones", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🕰️", text: "Russia is so wide that it spans 11 time zones." },
  { id: "soc-canada-lakes", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🍁", text: "Canada has more lakes than the rest of the world's countries combined." },
  { id: "soc-dead-sea-float", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🏊", text: "The Dead Sea is so salty that you float without trying." },
  { id: "soc-india-languages", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🗣️", text: "India's Constitution recognises 22 scheduled languages." },
  { id: "soc-pacific-size", subject: "Social Science", minGrade: 1, maxGrade: 4, emoji: "🌊", text: "The Pacific Ocean covers more of the Earth than all the land put together." },
  { id: "soc-mawsynram-rain", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "☔", text: "Mawsynram and Cherrapunji in Meghalaya are among the wettest places on Earth." },
  { id: "soc-root-bridges", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🌉", text: "In Meghalaya, people grow bridges from living rubber tree roots — some are centuries old." },
  { id: "soc-hikkim-post", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "📮", text: "The world's highest post office is at Hikkim in Himachal Pradesh, over 4,400 metres up." },
  { id: "soc-sundarbans", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🌳", text: "The Sundarbans, shared by India and Bangladesh, is the largest mangrove forest in the world." },
  { id: "soc-indian-railways", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🚂", text: "Indian Railways is one of the largest employers in the world, with over a million staff." },
  { id: "soc-africa-hemispheres", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🌍", text: "Africa is the only continent in all four hemispheres — north, south, east and west." },
  { id: "soc-sahara-size", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🏜️", text: "The Sahara Desert is roughly the size of the United States." },
  { id: "soc-everest-grows", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "⛰️", text: "Mount Everest grows a few millimetres taller each year as tectonic plates push together." },
  { id: "soc-chess-india", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "♟️", text: "Chess began in India as a game called chaturanga, around 1,500 years ago." },
  { id: "soc-paper-money", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "💵", text: "Paper money was invented in China, centuries before Europe adopted it." },
  { id: "soc-first-olympics", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🏛️", text: "The Olympic Games were first recorded in ancient Greece in 776 BCE." },
  { id: "soc-indus-drains", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🚿", text: "Cities of the Indus Valley had covered drains and planned streets over 4,000 years ago." },
  { id: "soc-chandrayaan-3", subject: "Social Science", minGrade: 5, maxGrade: 8, emoji: "🌑", text: "India's Chandrayaan-3 made the first successful soft landing near the Moon's south pole, in 2023." },
  { id: "soc-cleopatra-timeline", subject: "Social Science", minGrade: 9, maxGrade: 12, emoji: "⏳", text: "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid." },
  { id: "soc-oxford-aztec", subject: "Social Science", minGrade: 9, maxGrade: 12, emoji: "🎓", text: "Oxford University was already teaching students before the Aztec Empire was founded." },
  { id: "soc-mammoths-pyramids", subject: "Social Science", minGrade: 9, maxGrade: 12, emoji: "🦣", text: "Woolly mammoths were still alive on Wrangel Island while the Egyptian pyramids stood." },
  { id: "soc-shortest-war", subject: "Social Science", minGrade: 9, maxGrade: 12, emoji: "⏱️", text: "The shortest recorded war lasted under 45 minutes — between Britain and Zanzibar in 1896." },
  { id: "soc-great-wall-myth", subject: "Social Science", minGrade: 9, maxGrade: 12, emoji: "🧱", text: "The Great Wall of China is not one continuous wall, and it is not visible to the naked eye from space." },
] as const;
