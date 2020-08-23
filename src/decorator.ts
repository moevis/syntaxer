import { ILexer } from './lexer';
import { RuleSet } from './rule-set';

export function SyntaxerBuilder(lexer?: new (opt?: any) => ILexer, lexer_opt?: any): ClassDecorator {
  return (target: any) => {
    const rule_set: RuleSet = Reflect.getMetadata('rule', target.prototype) || new RuleSet();
    if (rule_set) {
      rule_set.Build();
    }
  };
}

export function Syntax(rule: string, item_type?: (_: any) => new () => any): PropertyDecorator {
  return (target, key) => {
    const ctor = Reflect.getMetadata('design:type', target, key);
    if (!ctor) {
      throw Error('should add SyntaxerBuilder decorator to:' + target);
    }
    if (ctor === Array) {
    }

    const rule_set: RuleSet = Reflect.getMetadata('rule', target) || new RuleSet();
    if (item_type) {
      rule_set.AddRule(rule, key.toString(), ctor, item_type(0));
    } else {
      rule_set.AddRule(rule, key.toString(), ctor);
    }
    Reflect.defineMetadata('rule', rule_set, target);
  };
}
