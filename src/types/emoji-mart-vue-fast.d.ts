/* eslint-disable */

declare module 'emoji-mart-vue-fast/src' {
  import type { DefineComponent } from 'vue';

  type EmojiCategory =
    | 'search'
    | 'recent'
    | 'smileys'
    | 'people'
    | 'nature'
    | 'foods'
    | 'activity'
    | 'places'
    | 'objects'
    | 'symbols'
    | 'flags'
    | 'custom';

  interface Emoji {
    name: string;
    added_in: string;
    subcategory: string;
    text: string;
    short_names: string[];
    keywords: string[];
    emoticons?: string[];
    search: string;
    sheet_x: number;
    sheet_y: number;
    unified: string;
    non_qualified?: string;
    has_img_apple: boolean;
    has_img_google: boolean;
    has_img_twitter: boolean;
    has_img_facebook: boolean;
  }

  interface EmojiI18n {
    search?: string;
    notfound?: string;
    categories?: {
      search?: string;
      recent?: string;
      smileys?: string;
      people?: string;
      nature?: string;
      foods?: string;
      activity?: string;
      places?: string;
      objects?: string;
      symbols?: string;
      flags?: string;
      custom?: string;
    };
  }

  export interface EmojiObject {
    id: string;
    name: string;
    short_names: string[];
    colons: string;
    text?: string;
    emoticons?: string[];
    keywords?: string[];
    custom?: boolean;
    skin?: number | null;
    native?: string;
    imageUrl?: string;
  }

  export interface CustomEmoji {
    name: string;
    short_names: string[];
    imageUrl: string;
  }

  export class EmojiIndex {
    constructor(
      data: object,
      options?: {
        include?: EmojiCategory[];
        exclude?: EmojiCategory[];
        custom?: CustomEmoji[];
        recent?: string[];
        recentLength?: number;
        emojisToShowFilter?: (emoji: Emoji) => boolean;
      },
    );

    emoji(emojiId: string): EmojiObject;

    search(value: string, maxResults?: number): EmojiObject[] | null;
  }

  export const Picker: DefineComponent<{
    data: EmojiIndex;
    set?: 'native' | 'apple' | 'google' | 'twitter' | 'facebook';
    native?: boolean;
    perLine?: number;
    color?: string;
    emoji?: string;
    title?: string;
    i18n?: EmojiI18n;
    skin?: 1 | 2 | 3 | 4 | 5 | 6;
    showSkinTones?: boolean;
    showCategories?: boolean;
    showSearch?: boolean;
    showPreview?: boolean;
    onSelect?: (emoji: EmojiObject) => void;
  }>;
}
