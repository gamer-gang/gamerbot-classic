declare namespace CoinMarketCap {
  export interface MetadataResponse {
    status: Status;
    data: {
      [symbol: string]: Metadata;
    };
  }
  export interface Metadata {
    urls: MetadataUrls;
    logo: string;
    id: number;
    name: string;
    symbol: string;
    slug: string;
    description: string;
    date_added: string;
    tags: string[];
    platform: null;
    category: string;
  }

  export interface MetadataUrls {
    website: string[];
    technical_doc: string[];
    twitter: any[];
    reddit: string[];
    message_board: string[];
    announcement: any[];
    chat: any[];
    explorer: string[];
    source_code: string[];
  }

  export interface QuoteResponse {
    status: Status;
    data: {
      [symbol: string]: Quote;
    };
  }

  export interface Quote {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    max_supply: number;
    circulating_supply: number;
    total_supply: number;
    cmc_rank: number;
    last_updated: string;
    quote: {
      [currency: string]: QuoteData;
    };
  }

  export interface QuoteData {
    price: number;
    volume_24h: number;
    percent_change_1h: number;
    percent_change_24h: number;
    percent_change_7d: number;
    percent_change_30d: number;
    percent_change_60d: number;
    percent_change_90d: number;
    market_cap: number;
    last_updated: string;
  }

  export interface Status {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
  }
}
