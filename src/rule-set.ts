import { INode, EmptyNode, Sequence, LITERAL, Branch, Group, CaptureValue, CaptureText, Expander } from './matcher';
import { Rule, RuleToken, RuleTokenType, RuleRange } from './rule';
import { TokenType } from './lexer';
import { TokenPeeker } from './peek';

interface IRuleContext {
  node: INode;
  index: number;
  branch: boolean;
}

export class RuleSet<T = any, E = any> {
  private rules: Rule[];
  private tokens: RuleToken[];
  private node: INode;
  private ready: boolean;
  constructor() {
    this.rules = [];
    this.tokens = [];
    this.node = new Sequence();
    this.ready = false;
  }
  AddRule(raw_rule: string, key_field: keyof T, ctor: new () => T, item_type?: new () => E) {
    console.log('key', key_field, 'adding rule', raw_rule, 'itemtype', item_type);
    this.rules.push(new Rule(raw_rule, key_field as string, ctor, item_type));
  }
  Match(lexer: TokenPeeker) {
    if (!this.ready) {
      this.Build();
      this.ready = true;
    }
    return this.node.Match(lexer);
  }
  Build() {
    const tokens: RuleToken[] = [];
    for (const rule of this.rules) {
      tokens.push(...rule.Parse());
    }
    this.tokens = tokens;
    this.node = this.parseNode();
  }
  private parseNode(): INode {
    if (this.tokens.length === 0) {
      return new EmptyNode();
    }
    return this.parseSeqAndBranch(0).node.Simplify();
  }
  private parseSequence(start: number, terminators: RuleToken[] = []): IRuleContext {
    const root = new Sequence();
    for (let index = start; index < this.tokens.length; index++) {
      const t = this.tokens[index];
      // check if should return
      for (const term of terminators) {
        if (term.IsEqual(t)) {
          return { branch: false, index: index + 1, node: root };
        }
      }
      if (t.type === RuleTokenType.String) {
        const matcher = new LITERAL<T>(t.text, <keyof T>t.key);
        root.Add(matcher);
      } else if (t.type === RuleTokenType.Branch) {
        return { branch: true, index: index + 1, node: root };
      } else if (t.type === RuleTokenType.Operator) {
        if (t.text === '@') {
          const ret = this.parseCapture(index + 1);
          root.Add(ret.node);
          index = ret.index - 1;
        } else if (t.text === '(') {
          const ret = this.parseGroup(index + 1, [RuleToken.RightBracket]);
          root.Add(ret.node);
          index = ret.index - 1;
        } else {
          throw Error(`Invalid charater '${t.text}', rule: ${t.raw_rule}, offset: ${t.index}`);
        }
      }
    }
    // if terminators has been set but not found, should panic.
    if (terminators.length > 0) {
      console.log(terminators);
      throw Error('looking for token: ' + terminators);
    }
    return { branch: false, index: this.tokens.length, node: root };
  }
  // (<expr>) +|?|*
  private parseGroup(start: number, terminators: RuleToken[]): IRuleContext {
    const { node, index } = this.parseSeqAndBranch(start, terminators);
    if (this.isRangeDescriptor(index)) {
      const range_type = this.parseRangeDescriptor(index);
      const group = new Group(node, range_type);
      // consume the range token: index + 1
      return { branch: false, index: index + 1, node: group };
    } else {
      const group = new Group(node, RuleRange.Once);
      console.log(group);
      return { branch: false, index: index, node: group };
    }
  }
  private parseCapture(start: number): IRuleContext {
    if (this.tokens.length <= start) {
      throw Error('invalid capture syntax');
    }
    const t = this.tokens[start];
    if (t.IsEqual(RuleToken.LeftBracket)) {
      return this.parseGroup(start + 1, [RuleToken.RightBracket]);
    } else if (t.type === RuleTokenType.Ident) {
      if (t.text === 'String') {
        return { node: new CaptureValue(t.ctor!, TokenType.STRING, t.key), index: start + 1, branch: false };
      } else if (t.text === 'Number') {
        return { node: new CaptureValue(t.ctor!, TokenType.FLOAT, t.key), index: start + 1, branch: false };
      } else {
        // TODO: capure other type
        throw Error('not support for capture token: ' + t.text);
      }
    } else if (t.type === RuleTokenType.String) {
      return {
        node: new CaptureText(String, t.text, t.key),
        index: start + 1,
        branch: false,
      };
    } else if (t.type === RuleTokenType.Operator && t.text === '@') {
      return {
        node: new Expander((t.item_type || t.ctor)!, t.key, t.ctor === Array),
        branch: false,
        index: start + 1,
      };
    } else {
      throw Error(`expect token ) at rule: [${t.raw_rule}] offset: ${t.index} of key ${t.key}, got ${t.text}`);
    }
  }
  private parseRangeDescriptor(index: number): RuleRange {
    const t = this.tokens[index];
    if (t.text === '+') {
      return RuleRange.OnceOrMore;
    }
    if (t.text === '?') {
      return RuleRange.Optional;
    }
    if (t.text === '*') {
      return RuleRange.OptionalOrMore;
    }
    return RuleRange.Once;
  }
  private isRangeDescriptor(index: number): boolean {
    if (index >= this.tokens.length) {
      return false;
    }
    const t = this.tokens[index];
    if (t.type === RuleTokenType.Operator) {
      if (t.text === '+' || t.text === '?' || t.text === '*') {
        return true;
      }
    }
    return false;
  }
  private parseSeqAndBranch(start: number, terminators: RuleToken[] = []): IRuleContext {
    const ret = this.parseSequence(start, terminators);
    console.log('index', start, 'get', ret);
    if (!ret.branch) {
      return ret;
    }
    const branch = new Branch(ret.node);
    console.log('got a Branch', branch);
    return this.parseBranch(branch, ret.index, terminators);
  }
  private parseBranch(root: Branch, start: number, terminators: RuleToken[]): IRuleContext {
    while (true) {
      const ret = this.parseSequence(start, terminators);
      root.Add(ret.node);
      if (!ret.branch) {
        ret.node = root;
        return ret;
      }
      start = ret.index;
    }
  }
}
