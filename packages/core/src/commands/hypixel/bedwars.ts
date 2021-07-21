import { canvasStyle as s } from '@gamerbot/config';
import { byteSize, insertUuidDashes } from '@gamerbot/util';
import { Canvas, Image } from 'canvas';
import { Player } from 'hypixel-types';
import hash from 'object-hash';
import { client } from '../../providers';
import { StatsData } from './stats';
import {
  drawPrestige,
  drawRank,
  getExpForLevel,
  getLevelForExp,
  getPrestigePlaintext,
} from './util/bwprestige';
import { getRankPlaintext } from './util/rank';
import { colorCode, drawFormattedText, stripFormatting } from './util/style';

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
      KDR: s.round(raw.K / raw.D),
      FKDR: s.round(raw.FK / raw.FD),
      'W/L': s.round(raw.W / raw.L),
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
    s.getCharWidth(s.mainHeight) * 85 + s.margin * 2,
    (Object.keys(rows).length + 3) * (s.mainHeight + 2 * s.padding) +
      s.headerHeight +
      s.padding +
      s.margin * 2
  );

  const c = canvas.getContext('2d');

  c.textAlign = 'left';
  c.font = s.font(s.headerHeight);
  const categoryWidth = Math.max(...Object.keys(rows).map(row => c.measureText(row).width));

  c.font = s.font(s.mainHeight);
  const columnWidths = Object.keys(columns).map(
    col =>
      Math.max(
        c.measureText(col).width,
        ...Object.keys(rows).map(mode => c.measureText(stats[mode][col].toString()).width)
      ) +
      s.padding * 0.75
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
      `BBLR: ${s.round(
        (data.stats.Bedwars.beds_broken_bedwars ?? 0) / (data.stats.Bedwars.beds_lost_bedwars ?? 0)
      )}`,
    ].join('  '),
  ];

  // very ugly and complicated but it works
  canvas.width = Math.max(
    (avatar?.width ?? 0) +
      s.getCharWidth(s.headerHeight) *
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
          s.getCharWidth(s.subheaderHeight) *
            (stripFormatting(leftSubheaders[i] ?? '').length +
              stripFormatting(rightSubheaders[i] ?? '').length +
              8)
      ),
    categoryWidth +
      s.padding * 3 +
      columnWidths.map(c => c + s.padding * 2).reduce((a, b) => a + b, 0)
  );

  c.fillStyle = s.bgColor;
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.save();

  c.translate(s.margin, s.margin);

  c.fillStyle = s.fgColor;
  c.textAlign = 'left';
  c.strokeStyle = s.fgColor;
  c.lineWidth = 0.5;

  if (quality) {
    c.quality = 'bilinear';
    c.patternQuality = 'bilinear';
    c.imageSmoothingQuality = 'high';
    c.antialias = 'subpixel';
  }

  c.font = s.font(s.headerHeight);

  const width = canvas.width - s.margin * 2;
  const height = canvas.height - s.margin * 2;

  avatar && c.drawImage(avatar, s.padding, s.padding);

  c.save();
  const [nameOffset, nameColor] = drawRank(
    c,
    data,
    (avatar?.width ?? 0) + (avatar ? 2 : 1) * s.padding
  );
  c.fillStyle = nameColor.hex;
  c.fillText(leftHeader, nameOffset, s.padding + s.headerHeight);
  c.restore();

  c.textAlign = 'right';
  c.fillText(rightHeader, drawPrestige(c, data), s.padding + s.headerHeight);

  c.textAlign = 'left';
  c.save();
  c.font = s.font(s.subheaderHeight);
  c.fillStyle = colorCode(0x7).hex;

  leftSubheaders.forEach((line, index) => {
    drawFormattedText(
      c,
      line,
      (avatar?.width ?? 0) + (avatar ? 2 : 1) * s.padding,
      s.headerHeight + (index + 1) * s.subheaderHeight + (2 + index * 0.5) * s.padding
    );
  });

  rightSubheaders.forEach((line, index) => {
    drawFormattedText(
      c,
      line,
      width - s.padding,
      s.headerHeight + (index + 1) * s.subheaderHeight + (2 + index * 0.5) * s.padding,
      'right'
    );
  });

  c.restore();

  c.font = s.font(s.mainHeight);

  c.save();
  c.translate(0, s.headerHeight + s.mainHeight + s.mainHeight + 5 * s.padding);

  Object.keys(rows).forEach((mode, i) => {
    const lineY = i * (s.mainHeight + s.padding * 2) + s.mainHeight + 2 * s.padding;

    c.beginPath();
    c.moveTo(0, lineY);
    c.lineTo(width, lineY);
    c.stroke();

    c.fillText(
      mode,
      s.padding,
      i * (s.mainHeight + s.padding * 2) + 2.5 * s.padding + 2 * s.mainHeight
    );
  });

  c.textAlign = 'right';

  c.translate(width, 0);

  Object.keys(columns)
    .reverse()
    .map((col, i) => {
      i = Object.keys(columns).length - 1 - i;

      c.fillText(col, -s.padding, s.mainHeight + s.padding);

      const lineX = -(columnWidths[i] + s.padding * 2);

      c.beginPath();
      c.moveTo(lineX, s.padding);
      c.lineTo(lineX, height - c.currentTransform.f);
      c.stroke();

      Object.keys(rows).forEach((mode, j) => {
        const value = stats[mode][col];
        c.fillText(
          value.toString(),
          -s.padding,
          j * (s.mainHeight + s.padding * 2) + 2.5 * s.padding + 2 * s.mainHeight
        );
      });

      c.translate(-(s.padding * 2 + columnWidths[i]), 0);
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
