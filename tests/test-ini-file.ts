class INI {
  sections?: Section[];
  properties?: Property[];
}

class Section {
  //@ [ title ]
  title?: string;
  //@ xx=aa
  properties?: Property[];
}

class Property {
  key?: string;
  value?: string;
}
