import { DiceObject } from '../types';

export class Dice {
  value!: number;

  constructor(public sides: number = 6) {
    this.roll();
  }

  setSides(n: number): Dice {
    this.sides = n;

    return this;
  }

  roll(): number {
    this.value = Math.floor(Math.random() * this.sides) + 1;
    return this.value;
  }

  static array(amount: number, sides: number): Dice[] {
    const output: Dice[] = [];

    for (let i = 0; i < amount; i++) {
      output.push(new Dice(sides));
    }

    return output;
  }

  static fromObject({ sides, value }: DiceObject): Dice {
    const output = new Dice(sides);
    output.value = value;
    return output;
  }

  toObject(): DiceObject {
    return { sides: this.sides, value: this.value };
  }
}
