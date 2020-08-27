import { Token, ILexer, TokenType } from './lexer/lexer';

export class TokenPeeker {
  tokens: Token[] = [];
  index: number = 0;
  readonly token_type_mapping: Map<string, TokenType>;
  constructor(lexer: ILexer) {
    this.token_type_mapping = lexer.token_type_mapping;
    while (true) {
      const t = lexer.Next();
      this.tokens.push(t);
      if (t.IsEOF()) {
        return;
      }
    }
  }
  Save(): number {
    return this.index;
  }
  Restore(index: number) {
    this.index = index;
  }
  Peek(n = 0): Token | null {
    if (this.index + n >= this.tokens.length) {
      return null;
    } else {
      return this.tokens[this.index + n];
    }
  }
  Next(): Token | null {
    if (++this.index >= this.tokens.length) {
      return null;
    } else {
      return this.tokens[this.index];
    }
  }
}
