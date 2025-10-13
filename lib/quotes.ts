
export interface Quote {
  quote: string;
  author: string;
}

export const musicQuotes: Quote[] = [
  { quote: 'Without music, life would be a mistake.', author: 'Friedrich Nietzsche' },
  { quote: 'Where words fail, music speaks.', author: 'Hans Christian Andersen' },
  { quote: 'Music expresses that which cannot be said and on which it is impossible to be silent.', author: 'Victor Hugo' },
  { quote: 'One good thing about music, when it hits you, you feel no pain.', author: 'Bob Marley' },
  { quote: 'Music is the shorthand of emotion.', author: 'Leo Tolstoy' },
  { quote: "I haven't understood a bar of music in my life, but I have felt it.", author: 'Igor Stravinsky' },
  { quote: 'Music can change the world because it can change people.', author: 'Bono' },
  { quote: 'The only truth is music.', author: 'Jack Kerouac' },
  { quote: 'A jazz musician is a juggler who uses harmonies instead of oranges.', author: 'Benny Green' },
  { quote: 'Information is not knowledge. Knowledge is not wisdom. Wisdom is not truth. Truth is not beauty. Beauty is not love. Love is not music. Music is THE BEST.', author: 'Frank Zappa' },
  { quote: 'If I should ever die, God forbid, let this be my epitaph: THE ONLY PROOF HE NEEDED FOR THE EXISTENCE OF GOD WAS MUSIC.', author: 'Kurt Vonnegut' },
  { quote: 'Music is the strongest form of magic.', author: 'Marilyn Manson' },
  { quote: 'Music gives a soul to the universe, wings to the mind, flight to the imagination and life to everything.', author: 'Plato' },
  { quote: 'After silence, that which comes nearest to expressing the inexpressible is music.', author: 'Aldous Huxley' },
  { quote: 'My heart, which is so full to overflowing, has often been solaced and refreshed by music when sick and weary.', author: 'Martin Luther' },
];


export const getRandomQuote = (): Quote => {
  return musicQuotes[Math.floor(Math.random() * musicQuotes.length)];
};
