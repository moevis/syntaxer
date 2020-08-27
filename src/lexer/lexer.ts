export interface ILexer {
  token_type_mapping: Map<string, TokenType>;
  Next(): Token;
  SetSource(source: string): void;
}

export enum TokenType {
  EOF,
  IDENT,
  COMMENT,
  STRING,
  NUMBER,
  KEYWORD,
  WHITE,
  OPERATOR,
}

export const default_token_type_mapping = new Map<string, TokenType>([
  ['String', TokenType.STRING],
  ['Number', TokenType.NUMBER],
]);

export function isNumber(c: string) {
  return c >= '0' && c <= '9';
}

export function isAlpha(c: string) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

export function isNewLine(c: string) {
  return c === '\n' || c === '\r';
}

export function isAlphaNumber(c: string) {
  return isNumber(c) || isAlpha(c);
}

export function isQuote(c: string) {
  return c === "'" || c === '"';
}

export const default_operator = new Set<string>([
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

export const default_keyword = new Set([
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

export interface ISimpleLexerOption {
  operator_set?: Set<string>;
  keywords?: Set<string>;
  token_type_mapping?: Map<string, TokenType>;
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
