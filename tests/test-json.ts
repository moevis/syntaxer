import { Parse } from '../src/api';
import { Syntax, SyntaxerBuilder } from '../src/decorator';
import { TokenType } from '../src/lexer/lexer';
import { RegexLexer } from '../src/lexer/regex-lexer';

const lexer = new RegexLexer({ omit: ['White', 'Comment'] });

lexer.AddRule('Number', /\d+(?:\.\d+)?/, TokenType.NUMBER);
lexer.AddRule('String', /"(?:\\.|[^"])*"/, TokenType.IDENT);
lexer.AddRule('Operator', /[:{}\"\[\]\,]/, TokenType.OPERATOR);
lexer.AddRule('Comment', /\/\/.*/, TokenType.COMMENT);
lexer.AddRule('White', /\s+/);

const TypeMap = {
  KeyPair: (undefined as any) as new () => any,
  JSONObject: (undefined as any) as new () => any,
  JSONValue: (undefined as any) as new () => any,
};

@SyntaxerBuilder(lexer)
class JSONObject {
  @Syntax('"{" @@ ("," @@)* "}" | "{" "}"', (type) => TypeMap.KeyPair)
  KeyPairs: KeyPair[] = [];
}

TypeMap.JSONObject = JSONObject;

@SyntaxerBuilder(lexer)
class JSONValue {
  @Syntax('@String')
  StrValue?: string;
  @Syntax('| @Number')
  NumValue?: number;
  @Syntax('| "[" @@ ("," @@)* "]" | "[" "]"', (type) => TypeMap.JSONValue)
  Arr?: JSONObject[];
  @Syntax('| @("true"|"false")')
  BoolValue?: string;
  @Syntax('| "null"')
  NullValue?: boolean;
  @Syntax('| @@')
  Object?: JSONObject;
}

TypeMap.JSONValue = JSONValue;

@SyntaxerBuilder(lexer)
class KeyPair {
  @Syntax('@String ":"')
  Key: string = '';
  @Syntax('@@')
  Value: JSONValue = new JSONValue();
}

TypeMap.KeyPair = KeyPair;

Parse(
  JSONObject,
  `{
    "key": "value",
    "arr": [1, 2, 3],
    "nested": { "k": "v" }
  }
`
)
  .then((ini) => {
    console.log(JSON.stringify(ini));
  })
  .catch(console.error);
