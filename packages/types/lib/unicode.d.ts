declare module 'unicode/category' {
  interface Character<Category extends string = string> {
    value: string;
    name: string;
    category: Category;
    class: string;
    bidirectional_category: string;
    mapping: string;
    decimal_digit_value: string;
    digit_value: string;
    numeric_value: string;
    mirrored: string;
    unicode_name: string;
    comment: string;
    uppercase_mapping: string;
    lowercase_mapping: string;
    titlecase_mapping: string;
    symbol: string;
  }

  interface Category<Category extends string> {
    [codePoint: number]: Character<Category>;
  }

  export const Cc: Category<'Cc'>;
  export const Cf: Category<'Cf'>;
  export const Co: Category<'Co'>;
  export const Cs: Category<'Cs'>;
  export const Ll: Category<'Ll'>;
  export const Lm: Category<'Lm'>;
  export const Lo: Category<'Lo'>;
  export const Lt: Category<'Lt'>;
  export const Lu: Category<'Lu'>;
  export const Mc: Category<'Mc'>;
  export const Me: Category<'Me'>;
  export const Mn: Category<'Mn'>;
  export const Nd: Category<'Nd'>;
  export const No: Category<'No'>;
  export const Pc: Category<'Pc'>;
  export const Pd: Category<'Pd'>;
  export const Pe: Category<'Pe'>;
  export const Pf: Category<'Pf'>;
  export const Pi: Category<'Pi'>;
  export const Po: Category<'Po'>;
  export const Ps: Category<'Ps'>;
  export const Sc: Category<'Sc'>;
  export const Sk: Category<'Sk'>;
  export const Sm: Category<'Sm'>;
  export const So: Category<'So'>;
  export const Zl: Category<'Zl'>;
  export const Zp: Category<'Zp'>;
  export const Zs: Category<'Zs'>;
}
