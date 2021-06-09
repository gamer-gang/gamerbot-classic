import { Canvas, Image } from 'canvas';
import { Player } from 'hypixel-types';
import hash from 'object-hash';
import { client } from '../../providers';
import { byteSize, insertUuidDashes } from '../../util';
import { StatsData } from './stats';
import {
  drawPrestige,
  drawRank,
  getExpForLevel,
  getLevelForExp,
  getPrestigePlaintext,
} from './util/bwprestige';
import { getRankPlaintext } from './util/rank';
import {
  bg,
  colorCode,
  drawFormattedText,
  fg,
  font,
  getCharWidth,
  headerHeight,
  mainHeight,
  margin,
  padding,
  round,
  stripFormatting,
} from './util/style';

const imageCache = new Map<string, { playername: string; statsData: StatsData }>();

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

const subheaderHeight = 28;

export const makeBedwarsStats = (data?: Player, avatar?: Image, quality = true): StatsData => {
  if (!data?.stats?.Bedwars) throw new Error('no data');

  const argHash = hash(
    { data: data.stats.Bedwars, avatar: avatar?.src, quality },
    { algorithm: 'passthrough' }
  );
  if (imageCache.has(argHash)) return imageCache.get(argHash)!.statsData;
  else {
    imageCache.forEach((v, k) => {
      if (v.playername === data.playername) imageCache.delete(k);
    });
  }

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

  const level = getLevelForExp(data.stats.Bedwars.Experience!);
  const levelExp = getExpForLevel(level);

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
      ) +
      padding * 0.75
  );

  const leftHeader = data.displayname;

  const rightHeader = [
    `${(data.stats.Bedwars.winstreak ?? 0).toLocaleString()} ws`,
    `${(data.stats.Bedwars.coins ?? 0).toLocaleString()} coins  `,
  ].join('  ');

  const leftSubheaders = [
    insertUuidDashes(data.uuid),
    `bedwars stats by ${client.user.tag}`,
    `generated ${new Date().toISOString()}`,
  ];

  const rightSubheaders = [
    `§b${Math.floor(((level % 1) * levelExp) / 10) * 10}§r/§a${levelExp}§r to next level`,
    [
      `Games Played: ${data.stats.Bedwars.games_played_bedwars}`,
      `BBLR: ${round(
        (data.stats.Bedwars.beds_broken_bedwars ?? 0) / (data.stats.Bedwars.beds_lost_bedwars ?? 0)
      )}`,
    ].join('  '),
  ];

  // very ugly and complicated but it works
  canvas.width = Math.max(
    (avatar?.width ?? 0) +
      getCharWidth(headerHeight) *
        (getRankPlaintext(data).length +
          leftHeader.length +
          rightHeader.length +
          getPrestigePlaintext(data).length +
          8),
    ...new Array(Math.max(leftSubheaders.length, rightSubheaders.length))
      .fill(0)
      .map(
        (__, i) =>
          (avatar?.width ?? 0) +
          getCharWidth(subheaderHeight) *
            (stripFormatting(leftSubheaders[i] ?? '').length +
              stripFormatting(rightSubheaders[i] ?? '').length +
              8)
      ),
    categoryWidth + padding * 3 + columnWidths.map(c => c + padding * 2).reduce((a, b) => a + b, 0)
  );

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

  c.font = font(headerHeight);

  const width = canvas.width - margin * 2;
  const height = canvas.height - margin * 2;

  avatar && c.drawImage(avatar, padding, padding);

  c.save();
  const [nameOffset, nameColor] = drawRank(
    c,
    data,
    (avatar?.width ?? 0) + (avatar ? 2 : 1) * padding
  );
  c.fillStyle = nameColor('hex');
  c.fillText(leftHeader, nameOffset, padding + headerHeight);
  c.restore();

  c.textAlign = 'right';
  c.fillText(rightHeader, drawPrestige(c, data), padding + headerHeight);

  c.textAlign = 'left';
  c.save();
  c.font = font(subheaderHeight);
  c.fillStyle = colorCode(0x7)('hex');

  leftSubheaders.forEach((line, index) => {
    drawFormattedText(
      c,
      line,
      (avatar?.width ?? 0) + (avatar ? 2 : 1) * padding,
      headerHeight + (index + 1) * subheaderHeight + (2 + index * 0.5) * padding
    );
  });

  rightSubheaders.forEach((line, index) => {
    drawFormattedText(
      c,
      line,
      width - padding,
      headerHeight + (index + 1) * subheaderHeight + (2 + index * 0.5) * padding,
      'right'
    );
  });

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

      c.translate(-(padding * 2 + columnWidths[i]), 0);
    });

  c.restore();

  const image = quality
    ? canvas.toBuffer('image/png', { compressionLevel: 6 })
    : canvas.toBuffer('image/jpeg', { quality: 1 });

  const statsData: StatsData = [
    image,
    [`${width}x${height}`, byteSize(image.byteLength), quality ? 'png' : 'jpeg'],
  ];

  imageCache.set(argHash, { playername: data.playername, statsData });

  return statsData;
};
