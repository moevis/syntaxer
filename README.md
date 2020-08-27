# A new way to writer a parser in TypeScript [POC]

This project is inspired from a go library [participle](https://github.com/alecthomas/participle), which creates a parser from struct tag.

With the reflection library provided by TypeScript, we can do it in the same way as participle does.

## Annotation syntax example

```typescript
import 'reflect-metadata';
import { SyntaxerBuilder, Syntax } from '../src/decorator';
import { Parse } from '../src/api';

// default using a simple lexer
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

// default using a simple lexer
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
  num1: [Number: 1],
  num2: [Number: 1],
  op: Operator { plus: true, minus: false, times: false, divide: false }
}
```

## Tutorial

### Regex Lexer

#### INI parser

```typescript
import { Parse } from '../src/api';
import { Syntax, SyntaxerBuilder } from '../src/decorator';
import { TokenType } from '../src/lexer/lexer';
import { RegexLexer } from '../src/lexer/regex-lexer';

const lexer = new RegexLexer({ omit: ['White', 'Comment'] });

lexer.AddRule('Ident', /[a-zA-Z_\d]*/, TokenType.IDENT);
lexer.AddRule('Number', /\d+(?:\.\d+)?/, TokenType.NUMBER);
lexer.AddRule('String', /"(?:\\.|[^"])*"/, TokenType.IDENT);
lexer.AddRule('Operator', /[\]\[\=]/, TokenType.NUMBER);
lexer.AddRule('Comment', /#.*/, TokenType.COMMENT);
lexer.AddRule('White', /\s+/);

@SyntaxerBuilder(lexer)
class KeyValue {
  @Syntax('@String "="')
  key: string = '';
  @Syntax('@(@String | @Number)')
  Value: any;
}

@SyntaxerBuilder(lexer)
class Section {
  @Syntax('"["@String"]"')
  title: string = '';

  @Syntax('(@@)*', (type) => KeyValue)
  key_values: KeyValue[] = [];
}

@SyntaxerBuilder(lexer)
class INI {
  @Syntax('(@@)*', (type) => Section)
  sections: Section[] = [];
}

Parse(
  INI,
  `
[foo]
# comment
foo = bar
hello = 2333
`
)
  .then((ini) => {
    console.log(JSON.stringify(ini));
  })
  .catch(console.error);
```

Output is:

```json
{
  "sections": [
    {
      "title": "yoyo",
      "key_values": [
        { "key": "input", "Value": "out" },
        { "key": "hello", "Value": "2333" }
      ]
    }
  ]
}
```

### ENBF Lexer

## How to run

Currently no npm package is available. You can clone the project and run by yourself.

```bash
git clone https://github.com/moevis/syntaxer.git
cd syntaxer && yarn
ts-node tests/test-simple-expression.ts
```
