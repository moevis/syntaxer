import { SimpleLexer } from './lexer/simple-lexer';
import { TokenPeeker } from './peek';
import { RuleSet } from './rule-set';

type Constructor<T> = new () => T;

export async function Parse<T>(ctor: Constructor<T>, text: string) {
  // const lexer = new SimpleLexer(text);
  // const peeker = new TokenPeeker(lexer);
  const rule = Reflect.getMetadata('rule', ctor.prototype) as RuleSet;
  try {
    const applyable = await rule.MatchSource(text);
    const e = new ctor();
    applyable(e);
    return e;
  } catch (err) {
    console.log(err);
    console.log(JSON.stringify(rule));
  }
}
