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
  @Syntax('(@Number | @String)')
  value: string | number = '';
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
  `[yoyo]
# comment
input = out
hello = 2333
`
)
  .then((ini) => {
    console.log(JSON.stringify(ini));
  })
  .catch(console.error);
