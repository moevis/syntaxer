import { SyntaxAnnotationErr } from '../matcher';
import { BasicLexer, ILexer, isAlpha, Token, TokenType } from './lexer';

interface IRuleContext {
  index: number;
  text: string;
}

interface IMatcher {
  Match(source: string, start: number): boolean;
}

class Rule {
  raw_rule: string;
  name: string;
  constructor(name: string, raw_rule: string) {
    this.name = name;
    this.raw_rule = raw_rule;
  }
  Build() {
    const tokens = [];
    for (let i = 0; i < this.raw_rule.length; i++) {
      const c = this.raw_rule[i];
      if (c === '"' || c === "'") {
        const ret = this.ParseUntilChar(i, c);
        i = ret.index;
      } else if (c === '(') {
        this.ParseGroup(i);
      } else if (isAlpha(c)) {
        this.ParseRef(i);
      } else if (c === '[') {
        this.ParseOptionGroup(i);
      } else if (c === '{') {
      }
    }
  }
  ParseOptionGroup(start: number) {
    return this.ParseUntilChar(start, ']');
  }
  ParseUntilChar(start: number, quote: string): IRuleContext {
    return this.ParseUntil(start, (s) => s !== quote, quote);
  }
  ParseRepetition(start: number) {}
  ParseGroup(start: number) {}
  ParseUntil(start: number, condition: (s: string) => boolean, look_for: string) {
    let text = '';
    for (let i = start; i < this.raw_rule.length; i++) {
      const c = this.raw_rule;
      if (!condition(c)) {
        return { index: i, text: text };
      } else {
        text += c;
      }
    }
    throw new SyntaxAnnotationErr(`expect corresponse [${look_for}] in rule: ${this.raw_rule} after index: ${start}`);
  }
  ParseOptional(start: number) {}
  ParseRef(start: number) {}
  Match(source: string, start: number) {}
}

class RuleMatcher {}

class CharSet {
  char_set = new Set<string>();
  range_set: [string, string][] = [];
  Match(c: string) {
    if (this.char_set.has(c)) {
      return true;
    }
    for (const range of this.range_set) {
      if (range[0] >= c && range[1] <= c) {
        return true;
      }
    }
    return false;
  }
}

export class EBNF extends BasicLexer implements ILexer {
  token_type_mapping: Map<string, TokenType> = new Map();
  raw_rules: Rule[] = [];
  terminals: Rule[] = [];

  Next(): Token {
    throw new Error('Method not implemented.');
  }
  AddRule(name: string, rule: string, token_type?: TokenType) {
    if (name.length == 0) {
      return;
    }
    this.terminals.push(new Rule(name, rule));
    if (token_type) {
      this.token_type_mapping.set(name, token_type);
    }
  }
  Build() {}
}
