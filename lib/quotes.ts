export const musicQuotes = [
  'Without music, life would be a mistake.', // Friedrich Nietzsche
  'Where words fail, music speaks.', // Hans Christian Andersen
  'Music expresses that which cannot be said and on which it is impossible to be silent.', // Victor Hugo
  'One good thing about music, when it hits you, you feel no pain.', // Bob Marley
  'Music is the shorthand of emotion.', // Leo Tolstoy
  'Why do they call it rush hour when nothing moves?', // Robin Williams
  "I haven't understood a bar of music in my life, but I have felt it.", // Igor Stravinsky
  'Music can change the world because it can change people.', // Bono
  'The only truth is music.', // Jack Kerouac
  'A jazz musician is a juggler who uses harmonies instead of oranges.', // Benny Green
  'Information is not knowledge. Knowledge is not wisdom. Wisdom is not truth. Truth is not beauty. Beauty is not love. Love is not music. Music is THE BEST.', // Frank Zappa
  'If I should ever die, God forbid, let this be my epitaph: THE ONLY PROOF HE NEEDED FOR THE EXISTENCE OF GOD WAS MUSIC.', // Kurt Vonnegut
];

export const getRandomQuote = () => {
  return musicQuotes[Math.floor(Math.random() * musicQuotes.length)];
};
