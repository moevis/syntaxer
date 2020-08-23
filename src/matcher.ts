import { TokenPeeker } from './peek';
import { Token, TokenType, Position } from './lexer';
import { RuleRange, Rule, RuleToken } from './rule';
import { RuleSet } from './rule-set';
import 'reflect-metadata';

export interface INode {
  Match(ctx: TokenPeeker): Promise<Applyable>;
  Simplify(): INode;
}

type Applyable = (obj: Object) => void;

export class NotMatch extends Error {
  constructor(public level: number, public pos?: Position, msg?: string) {
    super('branch not matched');
  }
}

export class EmptyNode implements INode {
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise((res) => res(Ident));
  }
}

export class Branch implements INode {
  branches: INode[];
  constructor(...node: INode[]) {
    this.branches = node;
  }
  Add(n: INode): void {
    this.branches.push(n);
  }
  Simplify(): INode {
    if (this.branches.length === 1) {
      return this.branches[0].Simplify();
    }
    this.branches = this.branches.map((b) => b.Simplify());
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise(async (res, rej) => {
      const state = ctx.Save();
      for (const b of this.branches) {
        try {
          const applyer = await b.Match(ctx);
          res(applyer);
          return;
        } catch (error) {
          if (error instanceof NotMatch) {
            continue;
          } else {
            rej(error);
            return;
          }
        }
      }
      ctx.Restore(state);
      const curr = ctx.Peek();
      rej(new NotMatch(state, curr ? curr.pos : undefined));
    });
  }
}

export class CaptureText implements INode {
  field: string;
  creator: new (s: string) => any;
  text: string;
  constructor(creator: new (s: string) => any, text: string, field: string) {
    this.creator = creator;
    this.field = field;
    this.text = text;
  }
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise((res, rej) => {
      const state = ctx.Save();
      try {
        const token = ctx.Peek();
        if (!token || this.text !== token.text) {
          rej(new NotMatch(state, token ? token.pos : undefined, token ? token.text : undefined));
          ctx.Restore(state);
          return;
        }
        let value: any;
        if (this.creator === String) {
          value = token.text;
        } else if (this.creator === Number) {
          value = Number(token.text);
        } else if (this.creator === Boolean) {
          value = true;
        } else {
          // TODO: build object for specific type
        }
        ctx.Next();
        // const value = new this.creator(token.text);
        res((obj: Object) => {
          if (obj.hasOwnProperty(this.field)) {
            (obj as any)[this.field] = value;
          }
        });
      } catch (error) {
        rej(error);
        ctx.Restore(state);
      }
    });
  }
}

export class Capture<T = any> implements INode {
  field: string;
  creator: new (s: string) => any;
  token: Token;
  constructor(creator: new (s: string) => T, token: Token, field: string) {
    this.creator = creator;
    this.field = field;
    this.token = token;
  }
  Simplify() {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise((res, rej) => {
      const state = ctx.Save();
      try {
        const token = ctx.Peek();
        if (!token || this.token.IsEqual(token)) {
          rej(new NotMatch(state, token ? token.pos : undefined, token ? token.text : undefined));
          ctx.Restore(state);
          return;
        }
        let value: any;
        if (this.creator === String) {
          value = token.text;
        } else if (this.creator === Number) {
          value = Number(token.text);
        } else if (this.creator === Boolean) {
          value = true;
        } else {
          // TODO: build object for specific type
        }
        ctx.Next();
        res((obj: Object) => {
          if (obj.hasOwnProperty(this.field)) {
            (obj as any)[this.field] = value;
          }
        });
      } catch (error) {
        rej(error);
        ctx.Restore(state);
      }
    });
  }
}

export class CaptureType<T> implements INode {
  field: string;
  creator: new (s: string) => any;
  token_type: TokenType;
  constructor(creator: new (s: string) => T, token_type: TokenType, field: string) {
    this.creator = creator;
    this.field = field;
    this.token_type = token_type;
  }
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise((res, rej) => {
      const state = ctx.Save();
      try {
        const token = ctx.Peek();
        if (!token || this.token_type !== token.type) {
          rej(new NotMatch(state, token ? token.pos : undefined, token ? token.text : undefined));
          ctx.Restore(state);
          return;
        }
        const value = new this.creator(token.text);
        ctx.Next();
        res((obj: Object) => {
          if (obj.hasOwnProperty(this.field)) {
            (obj as any)[this.field] = value;
          }
        });
      } catch (error) {
        rej(error);
        ctx.Restore(state);
      }
    });
  }
}

export class Sequence implements INode {
  seq: INode[];
  constructor(...nodes: INode[]) {
    this.seq = nodes;
  }
  Add(n: INode): void {
    this.seq.push(n);
  }
  Simplify(): INode {
    if (this.seq.length === 1) {
      return this.seq[0].Simplify();
    }
    this.seq = this.seq.map((s) => s.Simplify());
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise(async (res, rej) => {
      const state = ctx.Save();
      const applys: Applyable[] = [];
      for (const n of this.seq) {
        try {
          const applyer = await n.Match(ctx);
          applys.push(applyer);
        } catch (error) {
          if (error instanceof NotMatch) {
            ctx.Restore(state);
          }
          rej(error);
          return;
        }
      }
      res((obj) => applys.forEach((v) => v(obj)));
    });
  }
}

function Ident(_: Object) {}

export class Optional implements INode {
  node: INode;
  constructor(node: INode) {
    this.node = node;
  }
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise(async (res, rej) => {
      const state = ctx.Save();
      try {
        const applyer = await this.node.Match(ctx);
        res(applyer);
      } catch (error) {
        ctx.Restore(state);
        res(Ident);
      }
    });
  }
}

export class Expander implements INode {
  field: string;
  is_array: boolean;
  item_type: new () => any;
  constructor(item_type: new () => any, field: string, is_array: boolean) {
    this.item_type = item_type;
    this.field = field;
    this.is_array = is_array;
  }
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise(async (res, rej) => {
      const state = ctx.Save();
      const rule = Reflect.getMetadata('rule', this.item_type.prototype) as RuleSet;
      try {
        const applyer = await rule.MatchNode(ctx);
        const item = new this.item_type();
        applyer(item);
        if (this.is_array) {
          res((obj) => {
            if (Array.isArray((obj as any)[this.field])) {
              (obj as any)[this.field].push(item);
            } else {
              (obj as any)[this.field] = [item];
            }
          });
        } else {
          res((obj) => ((obj as any)[this.field] = item));
        }
      } catch (error) {
        ctx.Restore(state);
        rej(error);
      }
    });
  }
}

export class Group implements INode {
  node: INode;
  range: RuleRange;
  constructor(node: INode, range: RuleRange) {
    this.node = node;
    this.range = range;
  }
  Simplify(): INode {
    if (this.range === RuleRange.Once) {
      return this.node.Simplify();
    }
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise(async (res, rej) => {
      const applables: Applyable[] = [];
      let state = ctx.Save();
      let min_times = 0;
      let max_times = 0;
      if (this.range === RuleRange.Once || this.range === RuleRange.Optional) {
        max_times = 1;
      } else if (this.range === RuleRange.OnceOrMore || this.range === RuleRange.OptionalOrMore) {
        min_times = 1;
        max_times = Number.MAX_SAFE_INTEGER;
      }

      for (let i = 0; i <= max_times; i++) {
        try {
          state = ctx.Save();
          const applyers = await this.node.Match(ctx);
          applables.push(applyers);
        } catch (error) {
          ctx.Restore(state);
          if (i < min_times) {
            rej(
              new NotMatch(state, ctx.Peek(0)!.pos, `must match at least ${min_times} time, but matched ${i} time(s)`)
            );
          }
          if (i >= min_times && i <= max_times) {
            res((obj) => applables.forEach((v) => v(obj)));
          } else {
            rej(error);
          }
          return;
        }
      }
      res((obj) => applables.forEach((v) => v(obj)));
    });
  }
}

export class LITERAL<T extends Object> implements INode {
  text: string;
  field: keyof T;
  constructor(text: string, field: keyof T) {
    this.text = text;
    this.field = field;
  }
  Simplify(): INode {
    return this;
  }
  Match(ctx: TokenPeeker): Promise<Applyable> {
    return new Promise((res, rej) => {
      const state = ctx.Save();
      const t = ctx.Peek(0);
      if (!t) {
        rej(new NotMatch(state));
        return;
      }
      if (t.text === this.text) {
        ctx.Next();
        res((obj) => {
          if (obj.hasOwnProperty(this.field)) {
            (obj as any)[this.field] = true;
          }
        });
        return;
      }
      ctx.Restore(state);
      rej(new NotMatch(state, t.pos));
    });
  }
}
