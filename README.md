# A new way to writer a parser in TypeScript [POC]

This project is inspired from a go library [participle](https://github.com/alecthomas/participle), which creates a parser from struct tag.

With the reflection library provided by TypeScript, we can do it in the same way as participle does.

## Annotation syntax example

```typescript
import { SyntaxerBuilder, Syntax } from '../src/decorator';
import { Parse } from '../src/api';

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
  @Syntax('@Number')
  num1: number = 0;
  @Syntax('@')
  op?: Operator;
  @Syntax('@Number')
  num2: number = 0;
}

Parse(Expression, `1 + 1`).then(console.log);
```

The output is:

```js
Expression {
  left: true,
  num1: [Number: 1],
  num2: [Number: 1],
  right: true,
  op: Operator { plus: true, minus: false, times: false, divide: false }
}
```

## How to run

Currently no npm package is available. You can clone the project and run by yourself.

```bash
git clone https://github.com/moevis/syntaxer.git
cd syntaxer && yarn
ts-node tests/test-simple-expression.ts
```
