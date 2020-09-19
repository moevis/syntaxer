import { BasicLexer, ILexer, Position, Token, TokenType } from './lexer';

interface IRule {
  name: string;
  re: RegExp;
}

function Count(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) {
      count++;
    }
  }
  return count;
}

export interface IRegexLexerOption {
  omit?: string[];
}

export class RegexLexer extends BasicLexer implements ILexer {
  token_type_mapping: Map<string, TokenType> = new Map();
  rules: IRule[] = [];
  source: string = '';
  omit: Set<string>;
  constructor(option?: IRegexLexerOption) {
    super();
    this.omit = new Set((option && option.omit) || []);
  }
  AddRule(name: string, re: RegExp, token_type?: TokenType) {
    this.rules.push({ name, re });
    if (token_type) {
      this.token_type_mapping.set(name, token_type);
    }
  }
  Next(): Token {
    const source = this.source.substr(this.index);
    for (const r of this.rules) {
      const result = r.re.exec(source);
      if (!result) continue;
      if (result[0].length === 0) continue;
      if (result.index === 0) {
        const text = result[0];
        const t = new Token(
          this.token_type_mapping.get(r.name)!,
          new Position(this.line, this.column, this.index),
          text
        );
        this.index += text.length;
        const line_num = Count(text, '\n');
        if (line_num > 0) {
          this.line += line_num;
          this.column = text.length - text.lastIndexOf('\n');
        } else {
          this.column += text.length;
        }
        // skip some token
        if (this.omit.has(r.name)) {
          return this.Next();
        }
        return t;
      }
    }
    if (this.index !== this.length) {
      throw Error('no match at:' + new Position(this.line, this.column, this.index));
    }
    return new Token(TokenType.EOF, new Position(this.line, this.column, this.index));
  }
}
