import { GuildEmoji, Message } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import yargsParser from 'yargs-parser';
import { Command, CommandDocs } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

let upArrow: GuildEmoji | string;
let downArrow: GuildEmoji | string;
const randomSymbol = () => client.crypto.symbols[_.random(client.crypto.symbols.length)];

export class CommandCrypto implements Command {
  cmd = ['crypto', 'bat', 'btc', 'eth', 'doge'];
  yargs: yargsParser.Options = {
    alias: { list: 'l' },
    boolean: ['list'],
  };
  docs: CommandDocs = [
    {
      usage: 'crypto <symbol>',
      description: 'get data for a specific crypto',
    },
    {
      usage: 'bat, etc, eth, doge',
      description: 'get data for a specific crypto',
    },
    {
      usage: 'crypto --list, -l',
      description: 'list available cryptocurrencies',
    },
  ];
  async execute(context: Context): Promise<void | Message> {
    const { msg, args, cmd, config } = context;
    const { crypto } = client;

    if (!client.crypto.available)
      return msg.channel.send(
        Embed.error('Crypto support disabled', 'No credentials provided in environment')
      );

    if (args.list)
      return msg.channel.send(Embed.info('Available currencies', crypto.symbols.join(', ')));

    const symbol = cmd === 'crypto' ? args._[0] : cmd;

    if (!symbol) {
      return msg.channel.send(
        Embed.error(
          'No symbol provided',
          `Try ${randomSymbol()} or ${randomSymbol()}, or see \`${
            config.prefix
          }crypto --list\` for all available currencies`
        )
      );
    }

    const metadata = crypto.getMetadata(symbol.toUpperCase());
    const data = await crypto.getQuote(symbol.toUpperCase());
    if (!data || !metadata)
      return msg.channel.send(
        Embed.error(
          'Invalid/unavailable symbol',
          `See \`${config.prefix}crypto --list\` for available currencies`
        )
      );
    const quote = data.quote.USD;

    // get custom emojis
    upArrow ??= client.getCustomEmoji('up_arrow') ?? '📈';
    downArrow ??= client.getCustomEmoji('down_arrow') ?? '📉';

    const changeEmoji =
      quote.percent_change_24h > 0
        ? upArrow.toString() + ' '
        : quote.percent_change_24h < 0
        ? downArrow.toString() + ' '
        : '';

    const embed = new Embed({
      author: {
        iconURL: `https://s2.coinmarketcap.com/static/img/coins/32x32/${metadata.id}.png`,
        name: 'CoinMarketCap',
        url: `https://coinmarketcap.com/currencies/${metadata.slug}`,
      },
      title: `${data.name} (${data.symbol})`,
      description: [
        `**Price:** $${parseFloat(
          quote.price.toFixed(quote.price > 5 ? 2 : 4)
        ).toLocaleString()} ` + `**(${changeEmoji} ${quote.percent_change_24h.toFixed(2)}%)**`,
        '',
        `**Market Cap:** $${Math.round(quote.market_cap).toLocaleString()}`,
        `**Volume (24h):** $${Math.round(quote.volume_24h).toLocaleString()} ` +
          `(${(quote.volume_24h / quote.market_cap).toPrecision(4)} of market cap)`,
        '',
        `**Max Supply:** ${
          data.max_supply ? data.max_supply.toLocaleString() + data.symbol : '-'
        } `,
        `**Circulating Supply:** ${
          data.circulating_supply
            ? `${Math.floor(data.circulating_supply).toLocaleString()} ${data.symbol} (${Math.round(
                (data.circulating_supply / data.max_supply) * 100
              )}%)`
            : '-'
        }`,
        '',
        `**Rank #${data.cmc_rank.toLocaleString()}**`,
        '',
        metadata.urls.website[0] && `[Website](${metadata.urls.website[0]})`,
        metadata.urls.technical_doc[0] && `[Whitepaper](${metadata.urls.technical_doc[0]})`,
        metadata.urls.chat[0] && `[Chat](${metadata.urls.chat[0]})`,
      ]
        .filter(text => text !== undefined)
        .join('\n'),
      color: 0xff5000,
      thumbnail: {
        url: `https://s2.coinmarketcap.com/static/img/coins/64x64/${metadata.id}.png`,
      },
      footer: {
        text: `CMC ID: ${metadata.id} • Last Updated at ${DateTime.fromISO(
          data.last_updated
        ).toLocaleString(DateTime.DATETIME_FULL)}`,
      },
    });

    msg.channel.send(embed);
    msg.channel.stopTyping(true);
  }
}
