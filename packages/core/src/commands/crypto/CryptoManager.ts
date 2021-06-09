import axios from 'axios';
import { client, getLogger } from '../../providers';

const SANDBOX_API_KEY = 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c';

export class CryptoManager {
  #metadata = new Map<string, CoinMarketCap.Metadata>();
  #quotes = new Map<string, CoinMarketCap.Quote>();
  #quoteFetchTime = 0;
  symbols!: string[];
  #logger = getLogger('CryptoManager');

  available = true;

  constructor() {
    if (!process.env.CMC_API_KEY) {
      this.available = false;
      return;
    }

    this.updateAll();
  }

  async updateAll(): Promise<void> {
    await this.fetchListings();
    await this.fetchMetadata();

    // 72 hours
    setTimeout(this.updateAll.bind(this), 1000 * 60 * 60 * 24 * 3);
  }

  async fetchListings(): Promise<void> {
    this.#logger.debug('fetching listings');

    const { data } = await axios.get('/v1/cryptocurrency/listings/latest', {
      baseURL: `https://${client.devMode ? 'sandbox' : 'pro'}-api.coinmarketcap.com`,
      headers: {
        'X-CMC_PRO_API_KEY': client.devMode ? SANDBOX_API_KEY : process.env.CMC_API_KEY,
      },
      params: {},
    });

    const listings = (data as CoinMarketCap.ListingResponse).data;

    this.symbols = listings.map(listing => listing.symbol);
  }

  async fetchMetadata(): Promise<void> {
    const { data } = await axios.get('/v1/cryptocurrency/info', {
      baseURL: `https://${client.devMode ? 'sandbox' : 'pro'}-api.coinmarketcap.com`,
      headers: {
        'X-CMC_PRO_API_KEY': client.devMode ? SANDBOX_API_KEY : process.env.CMC_API_KEY,
      },
      params: {
        symbol: this.symbols.join(','),
        aux: 'urls,logo,description,tags,platform,date_added,notice,status',
      },
    });

    const metadata = (data as CoinMarketCap.MetadataResponse).data;
    Object.keys(metadata).forEach(symbol => this.#metadata.set(symbol as string, metadata[symbol]));
  }

  async fetchQuotes(): Promise<void> {
    const { data } = await axios.get('/v1/cryptocurrency/quotes/latest', {
      baseURL: `https://${client.devMode ? 'sandbox' : 'pro'}-api.coinmarketcap.com`,
      headers: {
        'X-CMC_PRO_API_KEY': client.devMode ? SANDBOX_API_KEY : process.env.CMC_API_KEY,
      },
      params: {
        symbol: this.symbols.join(','),
        aux: 'cmc_rank,max_supply,circulating_supply,total_supply,volume_24h_reported,volume_7d,volume_7d_reported',
      },
    });

    const quotes = (data as CoinMarketCap.QuoteResponse).data;

    this.#quotes.clear();
    Object.keys(quotes).forEach(symbol => this.#quotes.set(symbol as string, quotes[symbol]));

    this.#quoteFetchTime = Date.now();
  }

  getMetadata(symbol: string): CoinMarketCap.Metadata | undefined {
    return this.#metadata.get(symbol);
  }

  async getQuote(symbol: string): Promise<CoinMarketCap.Quote | undefined> {
    if (Date.now() - this.#quoteFetchTime > 1000 * 60 * 5) await this.fetchQuotes();

    return this.#quotes.get(symbol);
  }
}
