const operator_set = new Set<string>(['|', '+', '(', ')', '?', '*', '@']);

export enum RuleTokenType {
  Branch,
  Operator,
  Ident,
  Keyword,
  String,
}

export enum RuleRange {
  // match [1, 1]
  Once,
  // match [1, max]
  OnceOrMore,
  // match [0, 1]
  Optional,
  // match [0, max]
  OptionalOrMore,
}

export class RuleToken {
  text: string;
  type: RuleTokenType;
  index: number;
  key: string;
  raw_rule: string;
  ctor?: new (s?: string) => any;
  item_type?: new () => any;
  constructor(
    text: string,
    type: RuleTokenType,
    index?: number,
    key?: string,
    raw_rule?: string,
    ctor?: new () => any,
    item_type?: new () => any
  ) {
    this.text = text;
    this.type = type;
    this.index = index || 0;
    this.key = key || '';
    this.ctor = ctor;
    this.item_type = item_type;
    this.raw_rule = raw_rule || '';
  }
  IsEqual(other: RuleToken): boolean {
    return other.type === this.type && other.text === this.text;
  }
  static RightBracket = new RuleToken(')', RuleTokenType.Operator);
  static StartBracket = new RuleToken('*', RuleTokenType.Operator);
  static LeftBracket = new RuleToken('(', RuleTokenType.Operator);
  static PlusBracket = new RuleToken('+', RuleTokenType.Operator);
  static QuestionBracket = new RuleToken('?', RuleTokenType.Operator);
  static Branch = new RuleToken('|', RuleTokenType.Operator);
}

export class Rule {
  raw_rule: string;
  key_field: string;
  ctor?: new () => void;
  item_type_func?: (_: any) => new () => any;
  item_type?: new () => any;
  constructor(raw_rule: string, key_field: string, ctor?: new () => any, item_type_func?: (_: any) => new () => any) {
    this.raw_rule = raw_rule;
    this.key_field = key_field;
    this.ctor = ctor;
    // when this.ctor is Array, this.item_type should be the element type.
    this.item_type_func = item_type_func;
  }
  createToken(text: string, type: RuleTokenType, index: number): RuleToken {
    return new RuleToken(text, type, index, this.key_field, this.raw_rule, this.ctor, this.item_type);
  }
  Parse(): RuleToken[] {
    if (this.item_type_func) {
      this.item_type = this.item_type_func(0);
    }
    const ret: RuleToken[] = [];
    let index = 0;
    while (index < this.raw_rule.length) {
      const c = this.raw_rule[index];
      if (Rule.IsWhite(c)) {
        index++;
        continue;
      }
      if (c === '|') {
        ret.push(this.createToken(c, RuleTokenType.Branch, index));
      } else if (operator_set.has(c)) {
        ret.push(this.createToken(c, RuleTokenType.Operator, index));
      } else if (c === "'" || c === '"') {
        const literal = this.parseString(index + 1, c);
        ret.push(this.createToken(literal, RuleTokenType.String, index));
        index += literal.length + 1;
      } else if (c === '_' || Rule.IsAlpha(c)) {
        const literal = this.parseUntilNot(index + 1, Rule.IsAlphaNumber);
        ret.push(this.createToken(c + literal, RuleTokenType.Ident, index));
        index += literal.length;
      } else {
        throw Error(`invalid character ${c} in rule of field ${this.key_field}, ${this.raw_rule}`);
      }
      index++;
    }
    return ret;
  }
  static IsWhite(c: string) {
    return c === ' ' || c === '\t';
  }
  static IsAlpha(c: string) {
    if ((c <= 'Z' && c >= 'A') || (c <= 'z' && c >= 'a')) {
      return true;
    }
    return false;
  }
  static IsNumber(c: string) {
    if (c <= '9' && c >= '0') {
      return true;
    }
    return false;
  }
  static IsAlphaNumber(c: string) {
    if (c === '_' || Rule.IsAlpha(c) || Rule.IsNumber(c)) {
      return true;
    }
    return false;
  }
  private parseUntilNot(begin: number, predict: (c: string) => boolean) {
    let index = begin;
    let raw_str = '';
    while (index < this.raw_rule.length) {
      const c = this.raw_rule[index++];
      if (!predict(c)) {
        return raw_str;
      }
      raw_str += c;
    }
    return raw_str;
  }
  private parseString(begin: number, stop_char: '"' | "'") {
    let raw_str = '';
    let index = begin;
    let skip_next = false;
    while (index < this.raw_rule.length) {
      const c = this.raw_rule[index];
      if (!skip_next) {
        skip_next = false;
        if (c === stop_char) {
          return raw_str;
        }
        if (c === '\\') {
          skip_next = true;
        }
      }
      raw_str += c;
      index++;
    }
    throw Error(`expect char [${stop_char}] at the end of rule: ${this.raw_rule}`);
  }
}
