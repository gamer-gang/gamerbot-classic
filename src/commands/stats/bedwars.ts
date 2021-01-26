import { Canvas } from 'canvas';
import { Player } from 'hypixel-types';
import { client } from '../../providers';
import { byteSize } from '../../util';
import { StatsReturn } from './stats';
import { drawPrestige, drawRank, getExpForLevel, getLevelForExp } from './util/bwprestige';
import {
  bg,
  colorCode,
  drawColoredText,
  fg,
  font,
  headerHeight,
  getCharWidth,
  mainHeight,
  margin,
  padding,
  round,
} from './util/style';

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

const rows = {
  Solos: 'eight_one_',
  Doubles: 'eight_two_',
  '3v3v3v3': 'four_three_',
  '4v4v4v4': 'four_four_',
  '4v4': 'two_four_',
  // 'Rush Solo': 'eight_one_rush_',
  // 'Rush Doubles': 'eight_two_rush_',
  // 'Rush 4v4v4v4': 'four_four_rush_',
  // 'Ultimate Solo': 'eight_one_ultimate_',
  // 'Ultimate Doubles': 'eight_two_ultimate_',
  // 'Ultimate 4v4v4v4': 'eight_two_ultimate_',
  // 'Armed Doubles': 'eight_two_armed_',
  // 'Armed 4v4v4v4': 'four_four_armed_',
  // 'Voidless Doubles': 'eight_two_voidless_',
  // 'Voidless 4v4v4v4': 'four_four_voidless_',
  // 'Lucky Doubles': 'eight_two_lucky_',
  // 'Lucky 4v4v4v4': 'four_four_lucky_',
  // 'Castle 40v40': 'castle_',
  Overall: '',
};

export const makeBedwarsStats = ({
  data,
  quality,
}: {
  data?: Player;
  quality: boolean;
}): StatsReturn => {
  if (!data?.stats?.Bedwars) throw new Error('no data');

  const stats: Record<keyof typeof rows, Record<keyof typeof columns, string>> = {} as any;

  Object.keys(rows).forEach(game => {
    const raw: Record<keyof typeof columns, number> = {} as any;

    Object.keys(columns).forEach(col => {
      const key = `${rows[game]}${columns[col]}_bedwars`;
      raw[col] = parseInt(data.stats.Bedwars[key]?.toString() ?? '0');
    });

    const obj = {
      ...raw,
      KDR: round(raw.K / raw.D),
      FKDR: round(raw.FK / raw.FD),
      'W/L': round(raw.W / raw.L),
    };

    stats[game] = {} as any;
    (Object.entries(obj) as [keyof typeof columns, number][]).map(([stat, value]) => {
      let stringVal = '';
      if (['KDR', 'FKDR', 'W/L'].includes(stat)) {
        if (value === 0) stringVal = ':(';
      }
      stats[game][stat] = stringVal || (isFinite(value) ? value.toLocaleString() : '-');
    });
  });

  const canvas = new Canvas(
    getCharWidth(mainHeight) * 85 + margin * 2,
    (Object.keys(rows).length + 3) * (mainHeight + 2 * padding) +
      headerHeight +
      padding +
      margin * 2
  );

  const c = canvas.getContext('2d');

  c.textAlign = 'left';
  c.font = font(headerHeight);
  const categoryWidth = Math.max(...Object.keys(rows).map(row => c.measureText(row).width));

  c.font = font(mainHeight);
  const columnWidths = Object.keys(columns).map(
    col =>
      Math.max(
        c.measureText(col).width,
        ...Object.keys(rows).map(mode => c.measureText(stats[mode][col].toString()).width)
      ) + padding
  );

  canvas.width =
    categoryWidth + padding * 6 + columnWidths.map(c => c + padding * 2).reduce((a, b) => a + b, 0);

  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.save();

  c.translate(margin, margin);

  c.fillStyle = fg;
  c.textAlign = 'left';
  c.strokeStyle = fg;
  c.lineWidth = 0.5;

  if (quality) {
    c.quality = 'bilinear';
    c.patternQuality = 'bilinear';
    c.imageSmoothingQuality = 'high';
    c.antialias = 'subpixel';
  }
  // else {
  // c.textDrawingMode = 'glyph';
  // }

  c.font = font(headerHeight);

  const width = canvas.width - margin * 2;
  const height = canvas.height - margin * 2;

  c.save();
  const [offset, color] = drawRank(c, data);
  c.fillStyle = color('hex');
  c.fillText(data.displayname, offset, padding + headerHeight);
  c.restore();

  c.textAlign = 'right';
  c.fillText(
    [
      `${data.stats.Bedwars.winstreak!.toLocaleString()} ws`,
      `${data.stats.Bedwars.coins!.toLocaleString()} coins  `,
    ].join('  '),
    drawPrestige(c, data),
    padding + headerHeight
  );

  c.textAlign = 'left';

  c.save();
  c.font = font(32);
  c.fillStyle = colorCode(0x7)('hex');
  c.fillText(`bedwars stats by ${client.user.tag}`, padding, headerHeight + 32 + 2 * padding);
  c.fillText(
    `generated ${new Date().toISOString()}`,
    padding,
    headerHeight + 64 + (3 * padding) / 1.1
  );

  const level = getLevelForExp(data.stats.Bedwars.Experience!);
  const levelExp = getExpForLevel(level);
  c.textAlign = 'right';
  drawColoredText(
    c,
    `§b${Math.floor(((level % 1) * levelExp) / 10) * 10}§r/§a${levelExp}§r to next level`,
    width - padding,
    headerHeight + 32 + 2 * padding,
    'right'
  );

  c.fillText(
    [
      `Games Played: ${data.stats.Bedwars.games_played_bedwars}`,
      `BBLR: ${round(
        (data.stats.Bedwars.beds_broken_bedwars ?? 0) / (data.stats.Bedwars.beds_lost_bedwars ?? 0)
      )}`,
    ].join('  '),
    width - padding,
    headerHeight + 64 + (3 * padding) / 1.1
  );
  c.restore();

  c.font = font(mainHeight);

  c.save();
  c.translate(0, headerHeight + mainHeight + mainHeight + 5 * padding);

  Object.keys(rows).forEach((mode, i) => {
    const lineY = i * (mainHeight + padding * 2) + mainHeight + 2 * padding;

    c.beginPath();
    c.moveTo(0, lineY);
    c.lineTo(width, lineY);
    c.stroke();

    c.fillText(mode, padding, i * (mainHeight + padding * 2) + 2.5 * padding + 2 * mainHeight);
  });

  c.textAlign = 'right';

  c.translate(width, 0);

  Object.keys(columns)
    .reverse()
    .map((col, i) => {
      i = Object.keys(columns).length - 1 - i;

      c.fillText(col, -padding, mainHeight + padding);

      const lineX = -(columnWidths[i] + padding * 2);

      c.beginPath();
      c.moveTo(lineX, padding);
      c.lineTo(lineX, height - c.currentTransform.f);
      c.stroke();

      Object.keys(rows).forEach((mode, j) => {
        const value = stats[mode][col];
        c.fillText(
          value.toString(),
          -padding,
          j * (mainHeight + padding * 2) + 2.5 * padding + 2 * mainHeight
        );
      });

      c.transform(1, 0, 0, 1, -(padding * 2 + columnWidths[i]), 0);
    });

  c.restore();

  const image = quality
    ? canvas.toBuffer('image/png')
    : canvas.toBuffer('image/jpeg', { quality: 1 });

  return [image, [`${width}x${height}`, byteSize(image.byteLength), quality ? 'png' : 'jpeg']];
};
