import { SyntaxerBuilder, Syntax } from '../src/decorator';
import { SimpleLexer } from '../src/lexer';
import { TokenPeeker } from '../src/peek';
import { RuleSet } from '../src/rule-set';
import 'reflect-metadata';

@SyntaxerBuilder()
class Operator {
  @Syntax('@("+"')
  plus: boolean = false;
  @Syntax(' | "="')
  minus: boolean = false;
  @Syntax(' | "*"')
  times: boolean = false;
  @Syntax(' | "/")')
  divide: boolean = false;
}

@SyntaxerBuilder()
class Express {
  @Syntax("(@'(')?")
  left: boolean = false;
  @Syntax('@Number')
  num1: number = 0;
  // @Syntax("@( '+' | '-' | '*' | '/' )")
  // op: string = '';
  @Syntax('(@@)*', (type) => Operator)
  // @Syntax('@@')
  op?: Operator[];
  @Syntax('@Number')
  num2: number = 0;
  @Syntax("(@')')?")
  right: boolean = false;
}

const lexer = new SimpleLexer(`
( 1 + 2 )
`);

const peeker = new TokenPeeker(lexer);

const rule = Reflect.getMetadata('rule', Express.prototype) as RuleSet;

rule
  .Match(peeker)
  .then((applyable) => {
    const e = new Express();
    applyable(e);
    console.log(e);
  })
  .catch((err) => {
    console.log('err', err);
  });
