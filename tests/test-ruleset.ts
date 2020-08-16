import { Rule } from '../src/rule';

const r = new Rule("hello 'mike' | im jame", 'word');
console.log(r.Parse());
