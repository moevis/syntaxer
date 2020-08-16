import { TokenPeeker } from './peek';

export interface ILexer {
  operators: Set<string>;
  keywords: Set<string>;
  Next(): Token;
}

interface IRegexRule {
  regex: RegExp;
  type: TokenType;
}

function isNumber(c: string) {
  return c >= '0' && c <= '9';
}

function isAlpha(c: string) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

function isNewLine(c: string) {
  return c === '\n' || c === '\r';
}

function isAlphaNumber(c: string) {
  return isNumber(c) || isAlpha(c);
}

function isQuote(c: string) {
  return c === "'" || c === '"';
}

const default_operator = new Set<string>([
  '+',
  '-',
  '*',
  '.',
  '\\',
  ':',
  '%',
  '|',
  '!',
  '?',
  '#',
  '&',
  ';',
  ',',
  '(',
  ')',
  '<',
  '>',
  '{',
  '}',
  '[',
  ']',
  '=',
]);

const default_keyowrd = new Set([
  'if',
  'function',
  'const',
  'for',
  'switch',
  'break',
  'instanceof',
  'with',
  'yield',
  'void',
  'this',
  'in',
  'goto',
  'import',
  'default',
  'debugger',
  'continue',
  'async',
  'await',
  'delete',
  'let',
  'else',
  'while',
  'class',
  'export',
  'private',
  'public',
  'var',
  'new',
  'return',
  'try',
  'catch',
  'typeof',
]);

interface ISimpleLexerOption {
  operator_set?: Set<string>;
  keywords?: Set<string>;
}

export class SimpleLexer implements ILexer {
  private source: string;
  private index: number;
  private length: number;
  private line: number;
  private column: number;
  readonly keywords: Set<string>;
  readonly operators: Set<string>;
  constructor(source: string, opt?: ISimpleLexerOption) {
    if (source[source.length - 1] !== '\n') {
      source += '\n';
    }
    this.keywords = (opt && opt.keywords) || default_keyowrd;
    this.operators = (opt && opt.operator_set) || default_operator;
    this.source = source;
    this.index = 0;
    this.length = source.length;
    this.line = 0;
    this.column = 0;
  }
  Peek(index: number): string {
    if (index <= this.length) {
      return this.source[index];
    }
    return '';
  }
  Upgrade(): TokenPeeker {
    return new TokenPeeker(this);
  }
  ParseUntilNotSatisfy(index: number, con: (c: string) => boolean): string {
    const start = index;
    while (index < this.length) {
      if (!con(this.source[index])) {
        return this.source.substring(start, index);
      }
      index++;
    }
    return this.source.substring(start);
  }
  ParseLineComment(index: number) {
    const start = index;
    while (index < this.length) {
      const n = this.Peek(index);
      if (isNewLine(n) || n === '') {
        return this.source.substring(start, index);
      }
      index++;
    }
    return this.source.substring(start);
  }
  ParseUntilWord(index: number, word: string, break_when_eol: boolean): string {
    const start = index;
    let word_index = 0;
    while (index + word_index < this.length) {
      const curr = this.source[index + word_index];
      if (break_when_eol && isNewLine(curr)) {
        return this.source.substring(start, this.index);
      } else if (curr === word[word_index]) {
        word_index++;
        if (word_index === word.length) {
          return this.source.substring(start, index + word_index);
        }
        continue;
      } else {
        word_index = 0;
      }
      index++;
    }
    throw Error(`expect ${word} at line ${this.line++}:${this.column}`);
  }
  Next(): Token {
    if (this.length === this.index) {
      return new Token(TokenType.EOF, new Position(this.line, this.column, this.index));
    }
    for (let i = this.index; i < this.length; i++) {
      const c = this.source[i];
      if (isNewLine(c)) {
        this.line++;
        this.column = 0;
        continue;
      }
      if (c === '/') {
        const n = this.Peek(i + 1);
        if (n === '/') {
          // parse line comment
          const pos = new Position(this.line++, this.column, this.index);
          const comment = '//' + this.ParseLineComment(i + 2);
          this.column = 0;
          this.index = i + comment.length;
          return new Token(TokenType.COMMENT, pos, comment);
        } else if (n === '*') {
          // parse block comment
          const block_comment = this.ParseUntilWord(i, '*/', false);
          const pos = new Position(this.line, this.column, this.index);
          const eof = block_comment.lastIndexOf('\n');
          if (eof === -1) {
            this.column = i + block_comment.length;
          } else {
            this.column = block_comment.length - eof;
          }
          this.line += block_comment.split('\n').length - 1;
          this.index = i + block_comment.length;
          return new Token(TokenType.COMMENT, pos, block_comment);
        }
      }
      if (this.operators.has(c)) {
        const t = new Token(TokenType.OPERATOR, new Position(this.line, this.column, this.index), c);
        this.column++;
        this.index = i + 1;
        return t;
      }
      if (isNumber(c)) {
        const literal = this.ParseUntilNotSatisfy(i, isNumber);
        const t = new Token(TokenType.FLOAT, new Position(this.line, this.column, this.index), literal);
        this.column += literal.length;
        this.index = i + literal.length;
        return t;
      }
      if (isAlpha(c)) {
        const literal = this.ParseUntilNotSatisfy(i, isAlphaNumber);
        let t: Token;
        if (this.keywords.has(literal)) {
          t = new Token(TokenType.KEYWORD, new Position(this.line, this.column, this.index), literal);
        } else {
          t = new Token(TokenType.IDENT, new Position(this.line, this.column, this.index), literal);
        }
        this.column += literal.length;
        this.index = i + literal.length;
        return t;
      }
      if (isQuote(c)) {
        const literal = c + this.ParseUntilWord(i + 1, c, true);
        if (literal.length === 1 || literal.charAt(literal.length - 1) !== c) {
          throw Error(`expect ${c} at the end of line ${this.line}`);
        }
        const t = new Token(
          TokenType.STRING,
          new Position(this.line, this.column, this.index),
          literal.substring(1, literal.length - 1)
        );
        this.column += literal.length;
        this.index = i + literal.length;
        return t;
      }
    }
    return new Token(TokenType.EOF, new Position(this.line, this.column, this.index));
  }
}

class RegexLexer implements ILexer {
  rules: IRegexRule[] = [];
  constructor() {}
  operators: Set<string> = new Set();
  keywords: Set<string> = new Set();
  Next(): Token {
    throw new Error('Method not implemented.');
  }
}

export enum TokenType {
  EOF,
  IDENT,
  COMMENT,
  STRING,
  FLOAT,
  KEYWORD,
  WHITE,
  OPERATOR,
}

export class Position {
  line: number;
  column: number;
  index: number;
  constructor(line: number, column: number, index: number) {
    this.line = line;
    this.column = column;
    this.index = index;
  }
}

export class Token {
  pos: Position;
  text: string = '';
  type: TokenType;
  constructor(type: TokenType, pos: Position, text?: string) {
    this.type = type;
    this.pos = pos;
    if (text) {
      this.text = text;
    }
  }
  IsEOF() {
    return this.type === TokenType.EOF;
  }
  IsEqual(token: Token): boolean {
    return this.type === token.type && this.text === token.text;
  }
  public static Create(text: string, type: TokenType): Token {
    return new Token(type, new Position(0, 0, 0), text);
  }
}
