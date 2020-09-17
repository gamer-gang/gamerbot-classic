import { Canvas } from 'canvas';

import { BedwarsStats } from '../../hypixelapi';

// https://hypixel.net/threads/get-bedwars-level-in-hypixel-json-api.1562117/
const getBedwarsLevel = (exp: number) => {
  const BEDWARS_EXP_PER_PRESTIGE = 489000;
  const BEDWARS_LEVELS_PER_PRESTIGE = 100;
  let prestige = Math.floor(exp / BEDWARS_EXP_PER_PRESTIGE);
  exp = exp % BEDWARS_EXP_PER_PRESTIGE;
  if (prestige > 5) {
    const over = prestige % 5;
    exp += over * BEDWARS_EXP_PER_PRESTIGE;
    prestige -= over;
  }

  const prestigeLevel = prestige * BEDWARS_LEVELS_PER_PRESTIGE;

  // first few levels are different
  if (exp < 500) return prestigeLevel;
  if (exp < 1500) return 1 + prestigeLevel;
  if (exp < 3500) return 2 + prestigeLevel;
  if (exp < 5500) return 3 + prestigeLevel;
  if (exp < 9000) return 4 + prestigeLevel;

  exp -= 9000;
  return exp / 5000 + 4 + prestigeLevel;
};

export const makeBedwarsStats = ({
  data,
  playername,
  botUserTag,
}: {
  data: BedwarsStats;
  playername: string;
  botUserTag: string;
}): Buffer => {
  if (!data) throw new Error('no data');

  const stats: Record<string, Record<keyof typeof columns, string | number>> = {};

  const columns = {
    K: 'kills',
    D: 'deaths',
    KDR: '',
    FK: 'final_kills',
    FD: 'final_deaths',
    FKDR: '',
    W: 'wins',
    L: 'losses',
    'W/L': '',
    Beds: 'beds_broken',
  };
  const columnNames = Object.keys(columns);

  const gamemodes: Record<string, string> = {
    Solos: 'eight_one_',
    Doubles: 'eight_two_',
    '3v3v3v3': 'four_three_',
    '4v4v4v4': 'four_four_',
    '4v4': 'two_four_',
    'Rush Solo': 'eight_one_rush_',
    'Rush Doubles': 'eight_two_rush_',
    'Rush 4v4v4v4': 'four_four_rush_',
    'Ultimate Solo': 'eight_one_ultimate_',
    'Ultimate Doubles': 'eight_two_ultimate_',
    'Ultimate 4v4v4v4': 'eight_two_ultimate_',
    'Armed Doubles': 'eight_two_armed_',
    'Armed 4v4v4v4': 'four_four_armed_',
    'Voidless Doubles': 'eight_two_voidless_',
    'Voidless 4v4v4v4': 'four_four_voidless_',
    'Lucky Doubles': 'eight_two_lucky_',
    'Lucky 4v4v4v4': 'four_four_lucky_',
    'Castle 40v40': 'castle_',
    Overall: '',
  };
  const gamemodeNames = Object.keys(gamemodes);

  for (const name of Object.keys(gamemodes)) {
    const apiName = gamemodes[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stats[name] = {} as any;
    for (let i = 0; i < Object.keys(columns).length; i++) {
      const key = `${apiName}${columns[columnNames[i]]}_bedwars`;
      stats[name][columnNames[i]] = parseInt(data[key] ?? '0');
    }
    stats[name].KDR =
      parseFloat(((stats[name].K as number) / (stats[name].D as number)).toFixed(2)) || '-';
    stats[name].FKDR =
      parseFloat(((stats[name].FK as number) / (stats[name].FD as number)).toFixed(2)) || '-';
    stats[name]['W/L'] =
      parseFloat(((stats[name].W as number) / (stats[name].L as number)).toFixed(2)) || '-';

    stats[name].KDR === Infinity && (stats[name].KDR = '-');
    stats[name].FKDR === Infinity && (stats[name].FKDR = '-');
    stats[name]['W/L'] === Infinity && (stats[name]['W/L'] = '-');

    Object.keys(stats[name]).forEach(stat => {
      stats[name][stat] = stats[name][stat].toLocaleString();
    });
  }

  const canvas = new Canvas(1760, 1232);
  const c = canvas.getContext('2d');
  const padding = 16;

  c.fillStyle = '#36393f';
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.fillStyle = '#dddddd';
  c.textDrawingMode = 'path';
  c.textAlign = 'left';
  c.strokeStyle = '#dddddd';
  c.lineWidth = 1;

  c.font = '48px Fira Sans, DejaVu Sans';
  c.fillText('bedwars stats: ' + playername, padding, padding + 48);

  c.textAlign = 'right';
  c.fillText(
    data.coins.toLocaleString() + ' coins   ' + getBedwarsLevel(data.Experience).toFixed(2) + '★',
    canvas.width - padding,
    padding + 48
  );

  c.font = '40px Fira Sans';
  c.textAlign = 'left';
  c.fillText(botUserTag as string, padding, padding + 48 + padding + 40);

  c.save();
  c.transform(1, 0, 0, 1, 0, 48 + 40 + padding * 2);

  gamemodeNames.forEach((mode, i) => {
    c.fillText(mode, padding, i * (40 + padding) + 88);

    c.beginPath();
    c.moveTo(0, (i - 1) * (40 + padding) + 86 + padding);
    c.lineTo(canvas.width, (i - 1) * (40 + padding) + 86 + padding);
    c.stroke();
  });

  c.textAlign = 'right';

  const widths = columnNames.map(col =>
    Math.max(
      c.measureText(col).width,
      ...gamemodeNames.map(mode => c.measureText(stats[mode][col]).width)
    )
  );

  c.transform(1, 0, 0, 1, canvas.width, 0);

  columnNames.reverse().map((col, i) => {
    i = columnNames.length - 1 - i;

    c.fillText(col, -padding, 32);

    c.beginPath();
    c.moveTo(-(widths[i] + padding * 2), 0);
    c.lineTo(-(widths[i] + padding * 2), canvas.height);
    c.stroke();

    gamemodeNames.forEach((mode, j) => {
      const value = stats[mode][col];
      c.fillText(value, -padding, 88 + j * (40 + padding));
    });

    c.transform(1, 0, 0, 1, -(padding * 2 + widths[i]), 0);
  });

  c.setTransform(1, 0, 0, 1, 0, 0);

  return canvas.toBuffer();
};
