import axios from 'axios';
import { GuildEmoji, Message } from 'discord.js';
import { DateTime } from 'luxon';
import { Command } from '..';
import { client } from '../../providers';
import { Context } from '../../types';
import { Embed } from '../../util';

let metadata: CoinMarketCap.Metadata;
let cachedData: CoinMarketCap.QuoteResponse | undefined = undefined;

const SANDBOX_API_KEY = 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c';

let upArrow: GuildEmoji | string;
let downArrow: GuildEmoji | string;

client.on('ready', async () => {
  if (!process.env.CMC_API_KEY) return;

  const response = await axios.get('/v1/cryptocurrency/info', {
    baseURL: `https://${client.devMode ? 'sandbox' : 'pro'}-api.coinmarketcap.com`,
    headers: {
      'X-CMC_PRO_API_KEY': client.devMode ? SANDBOX_API_KEY : process.env.CMC_API_KEY,
    },
    params: {
      symbol: 'BAT',
      aux: 'urls,logo,description,tags,platform,date_added,notice,status',
    },
  });

  metadata = (response.data as CoinMarketCap.MetadataResponse).data.BAT;
});

export class CommandBat implements Command {
  cmd = ['bat', 'basicattentiontoken'];
  docs = {
    usage: 'bat',
    description: 'get current info about BAT',
  };
  async execute(context: Context): Promise<void | Message> {
    const { msg } = context;

    if (!process.env.CMC_API_KEY)
      return msg.channel.send(
        Embed.error('Crypto support disabled', 'No credentials provided in environment')
      );

    if (!cachedData) {
      msg.channel.startTyping();
      const response = await axios.get('/v1/cryptocurrency/quotes/latest', {
        baseURL: `https://${client.devMode ? 'sandbox' : 'pro'}-api.coinmarketcap.com`,
        headers: {
          'X-CMC_PRO_API_KEY': client.devMode ? SANDBOX_API_KEY : process.env.CMC_API_KEY,
        },
        params: {
          symbol: 'BAT',
          aux: 'cmc_rank,max_supply,circulating_supply,total_supply,volume_24h_reported,volume_7d,volume_7d_reported',
        },
      });

      cachedData = response.data;

      setTimeout(() => (cachedData = undefined), 1000 * 60 * 5);
    }

    if (!cachedData) throw new Error('cachedData is unexpectedly undefined');

    // get custom emojis
    upArrow ??= client.getCustomEmoji('up_arrow') ?? '📈';
    downArrow ??= client.getCustomEmoji('down_arrow') ?? '📉';

    const data = cachedData.data.BAT;
    const quote = data.quote.USD;

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
        `**Price:** $${quote.price.toPrecision(4)} ` +
          `**(${changeEmoji} ${quote.percent_change_24h.toFixed(2)}%)**`,
        '',
        `**Market Cap:** $${Math.round(quote.market_cap).toLocaleString()}`,
        `**Volume (24h):** $${Math.round(quote.volume_24h).toLocaleString()} ` +
          `(${(quote.volume_24h / quote.market_cap).toPrecision(4)} of market cap)`,
        '',
        `**Max Supply:** ${data.max_supply.toLocaleString()} ${data.symbol}`,
        `**Circulating Supply:** ${Math.floor(data.circulating_supply).toLocaleString()} ${
          data.symbol
        } ` + `(${Math.round((data.circulating_supply / data.max_supply) * 100)}%)`,
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
