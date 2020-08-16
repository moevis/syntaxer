import { Token, ILexer } from './lexer';

export class TokenPeeker {
  tokens: Token[] = [];
  index: number = 0;
  readonly operators: Set<string>;
  readonly keywords: Set<string>;
  constructor(lexer: ILexer) {
    this.keywords = lexer.keywords;
    this.operators = lexer.operators;
    while (true) {
      const t = lexer.Next();
      this.tokens.push(t);
      if (t.IsEOF()) {
        console.log(this.tokens);
        return;
      }
    }
  }
  Operators(): Set<string> {
    return this.operators;
  }
  Keywords(): Set<string> {
    return this.keywords;
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
