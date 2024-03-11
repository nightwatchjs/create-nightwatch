import didYouMean from 'didyoumean3';
import colors from 'ansi-colors';

export default function suggestSimilarOption(word: string, default_flags: string[]) {
  const checkFlags = didYouMean(word, default_flags);
  const rt  = `Flag ${colors.red('--' +word)} is not a valid flag, did you mean ${colors.green('--' + checkFlags['winner'])}`;

  return rt;
}
