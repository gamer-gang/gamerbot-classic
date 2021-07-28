import { Embed } from '@gamerbot/util';
import { GuildEmoji, Message } from 'discord.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import { Command, CommandDocs, CommandOptions } from '..';
import { CommandEvent } from '../../models/CommandEvent';
import { client } from '../../providers';

let upArrow: GuildEmoji | string;
let downArrow: GuildEmoji | string;
const randomSymbol = () => client.crypto.symbols[_.random(client.crypto.symbols.length)];

export class CommandCrypto extends Command {
  cmd = ['crypto'];
  docs: CommandDocs = [
    {
      usage: 'crypto get <symbol>',
      description: 'get data for a specific crypto',
    },
    {
      usage: 'crypto list',
      description: 'list available cryptocurrencies',
    },
  ];
  commandOptions: CommandOptions = {
    description: 'Cryptocurrency stuff',
    options: [
      {
        name: 'get',
        description: 'Get info about a specific currency',
        type: 'SUB_COMMAND',
        options: [
          {
            name: 'symbol',
            description: 'Symbol of currency',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'list',
        description: 'List available currencies',
        type: 'SUB_COMMAND',
      },
    ],
  };
  async execute(event: CommandEvent): Promise<void | Message> {
    const { crypto } = client;

    if (!client.crypto.available)
      return event.reply(
        Embed.error('Crypto support disabled', 'No credentials provided in environment').ephemeral()
      );

    const subcommand = event.isInteraction() ? event.options.getSubCommand() : event.argv[0];

    if (subcommand !== 'get' && subcommand !== 'list')
      return event.reply(
        Embed.error('Invalid subcommand', 'Valid commands: get, list').ephemeral()
      );

    if (subcommand === 'list')
      return event.reply(Embed.info('Available currencies', crypto.symbols.join(', ')).ephemeral());

    const symbol = event.isInteraction() ? event.options.getString('symbol', true) : event.argv[1];

    if (!symbol) {
      return event.reply(
        Embed.error(
          'No symbol provided',
          `Try ${randomSymbol()}, ${randomSymbol()}, or see \`${
            event.guildConfig.prefix
          }crypto list\` for all available currencies`
        ).ephemeral()
      );
    }

    const metadata = crypto.getMetadata(symbol.toUpperCase());
    const data = await crypto.getQuote(symbol.toUpperCase());
    if (!data || !metadata)
      return event.reply(
        Embed.error(
          'Invalid/unavailable symbol',
          `See \`${event.guildConfig.prefix}crypto list\` for available currencies`
        ).ephemeral()
      );
    const quote = data.quote.USD;

    await event.defer();

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

    event.editReply(embed);
  }
}
