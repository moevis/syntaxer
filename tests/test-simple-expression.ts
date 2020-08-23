import { SyntaxerBuilder, Syntax } from '../src/decorator';
import { Parse } from '../src/api';
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
class Expression {
  @Syntax("(@'(')?")
  left: boolean = false;
  @Syntax('@Number')
  num1: number = 0;
  // @Syntax("@( '+' | '-' | '*' | '/' )")
  // op: string = '';
  @Syntax('(@@)', (type) => Operator)
  // @Syntax('@@')
  op?: Operator[];
  @Syntax('@Number')
  num2: number = 0;
  @Syntax("(@')')?")
  right: boolean = false;
}

Parse(Expression, ` ( 1.1 + 2 ) `)
  .then((e) => console.log(e))
  .catch((err) => console.log('err', err));
