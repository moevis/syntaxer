# A new way to writer a parser for TypeScript [POC]

This project is inspired from a go library ![participle](https://github.com/alecthomas/participle), which creates a parser from struct tag.

With the reflection provided by TypeScript, we can do it in the same way as participle's.

## Annotation syntax example

```typescript
@SyntaxerBuilder()
class Expression {
  @Syntax('@Number')
  num1: number = 0;
  @Syntax('@')
  op?: Operator;
  @Syntax('@Number')
  num2: number = 0;
}

const rule = Reflect.getMetadata('rule', Express.prototype) as RuleSet;

rule
  .Match(peeker)
  .then((applyable) => {
    const e = new Expression();
    applyable(e);
    console.log(e);
  })
  .catch((err) => {
    console.log('err', err);
  });

```


## How to run

Currently no npm package available. You can clone the project and run by yourself.

```bash
git clone https://github.com/moevis/syntaxer.git
cd syntaxer && yarn
ts-node tests/test-simple-expression.ts
```