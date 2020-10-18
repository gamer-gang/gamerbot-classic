namespace Discohook {
  export interface Message {
    content?: string;
    embeds?: Embed[];
    username?: string;
    avatar_url?: string;
  }

  export interface Embed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: Field[];
    author?: Author;
    footer?: Footer;
    image?: Image;
    thumbnail?: Image;
  }

  export interface Author {
    name?: string;
    url?: string;
    icon_url?: string;
  }

  export interface Field {
    name: string;
    value: string;
    inline?: boolean;
  }

  export interface Footer {
    text: string;
    icon_url?: string;
  }

  export interface Image {
    url: string;
  }
}
