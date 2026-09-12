import { cloneDeep, merge } from 'lodash-es';

import { getStorage, setStorage } from '@/utils';
import { getAllImgHistory, replaceAllImgHistory } from '@/utils/bili-img-store';
import {
  BellStyle,
  DarkMode,
  DarkTheme,
  defaultExtensionOptions,
  DialogType,
  EXT_CONFIG_FILENAME_PREFIX,
  EXT_CONFIG_VERSION,
  GzkInfoType,
  ImageHostingPlatform,
  LightTheme,
  LinkElementType,
  NestedReplyDisplay,
  OptionsKey,
  ReplyPreloadMode,
} from '@/constants';

import type { ExtConfig, ExtConfigOptions, StorageSettings } from '@/types';

type ConfigOptionValidator = (value: unknown) => boolean;

const ISO_DATE_TIME_WITH_OFFSET_REGEXP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasOnlyOptionProperty = (value: Record<string, unknown>, property: string) => {
  return Object.keys(value).every((key) => key === property);
};

const hasOptionalBooleanValue = (value: unknown, property: string) => {
  return (
    isRecord(value) &&
    hasOnlyOptionProperty(value, property) &&
    (!(property in value) || typeof value[property] === 'boolean')
  );
};

const hasOptionalStringValue = (value: unknown, property: string) => {
  return (
    isRecord(value) &&
    hasOnlyOptionProperty(value, property) &&
    (!(property in value) || typeof value[property] === 'string')
  );
};

const hasOptionalEnumValue = <T extends string>(value: unknown, property: string, allowedValues: readonly T[]) => {
  if (!isRecord(value) || !hasOnlyOptionProperty(value, property)) {
    return false;
  }

  return !(property in value) || allowedValues.includes(value[property] as T);
};

const hasOptionalEnumArrayValue = <T extends string>(value: unknown, property: string, allowedValues: readonly T[]) => {
  if (!isRecord(value) || !hasOnlyOptionProperty(value, property)) {
    return false;
  }

  if (!(property in value)) {
    return true;
  }

  if (!Array.isArray(value[property])) {
    return false;
  }

  return value[property].every((item) => allowedValues.includes(item as T));
};

const CONFIG_OPTION_VALIDATORS: Record<OptionsKey, ConfigOptionValidator> = {
  [OptionsKey.BlankLink]: (value) => {
    return hasOptionalEnumArrayValue(value, 'checkedLinkTypes', [
      LinkElementType.Topic,
      LinkElementType.User,
      LinkElementType.Node,
    ]);
  },
  [OptionsKey.DarkMode]: (value) => {
    return hasOptionalEnumValue(value, 'mode', [DarkMode.Off, DarkMode.On, DarkMode.System]);
  },
  [OptionsKey.DarkTheme]: (value) => {
    return hasOptionalEnumValue(value, 'theme', [DarkTheme.Default, DarkTheme.Soft]);
  },
  [OptionsKey.LightTheme]: (value) => {
    return hasOptionalEnumValue(value, 'theme', [LightTheme.Default, LightTheme.Solarized, LightTheme.TokyoNight]);
  },
  [OptionsKey.DblclickToTop]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
  [OptionsKey.FloatUserInfo]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
  [OptionsKey.EnhancedMsg]: (value) => {
    return hasOptionalEnumValue(value, 'bellStyle', [
      BellStyle.None,
      BellStyle.Normal,
      BellStyle.BadgeDot,
      BellStyle.BadgeNum,
    ]);
  },
  [OptionsKey.EnhancedSearch]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
  [OptionsKey.EnhancedTopic]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
  [OptionsKey.SmApiKey]: (value) => {
    return hasOptionalStringValue(value, 'apiKey');
  },
  [OptionsKey.CloseDialogOnClickModal]: (value) => {
    return hasOptionalEnumArrayValue(value, 'checkedDialogTypes', [
      DialogType.TopicViewer,
      DialogType.TopicEditor,
      DialogType.ReplyEditor,
    ]);
  },
  [OptionsKey.HideGzkInfo]: (value) => {
    return hasOptionalEnumArrayValue(value, 'checkedGzkInfoTypes', [
      GzkInfoType.GzkLogo,
      GzkInfoType.Profile,
      GzkInfoType.TabIcon,
      GzkInfoType.TabTitle,
    ]);
  },
  [OptionsKey.ImageHosting]: (value) => {
    return hasOptionalEnumValue(value, 'platform', [ImageHostingPlatform.Smms, ImageHostingPlatform.Bili]);
  },
  [OptionsKey.TopicKeywordBlock]: (value) => {
    return hasOptionalStringValue(value, 'keywords');
  },
  [OptionsKey.NestedReplyDisplay]: (value) => {
    return hasOptionalEnumValue(value, 'display', [
      NestedReplyDisplay.Off,
      NestedReplyDisplay.Indent,
      NestedReplyDisplay.Align,
    ]);
  },
  [OptionsKey.ReplyPreload]: (value) => {
    return hasOptionalEnumValue(value, 'mode', [
      ReplyPreloadMode.NoPreload,
      ReplyPreloadMode.OnePage,
      ReplyPreloadMode.TwoPages,
      ReplyPreloadMode.ThreePages,
      ReplyPreloadMode.FourPages,
    ]);
  },
  [OptionsKey.NestedReplyExpansion]: (value) => {
    return hasOptionalBooleanValue(value, 'expanded');
  },
  [OptionsKey.NestedReplyMultipleInsideOne]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
  [OptionsKey.ReverseReplyOrder]: (value) => {
    return hasOptionalBooleanValue(value, 'checked');
  },
};

const isValidOptions = (value: unknown): value is ExtConfigOptions => {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, option]) => {
    const validator = CONFIG_OPTION_VALIDATORS[key as OptionsKey];
    return validator?.(option) === true;
  });
};

const isValidBlockedTopicList = (value: unknown) => {
  return (
    Array.isArray(value) &&
    value.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.title === 'string')
  );
};

const isValidBiliImgHistory = (value: unknown) => {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.url === 'string' &&
        typeof item.width === 'number' &&
        typeof item.height === 'number' &&
        typeof item.size === 'number' &&
        typeof item.date === 'number',
    )
  );
};

const isValidExtConfig = (value: unknown): value is ExtConfig => {
  return (
    isRecord(value) &&
    value.version === EXT_CONFIG_VERSION &&
    typeof value.exportedAt === 'string' &&
    ISO_DATE_TIME_WITH_OFFSET_REGEXP.test(value.exportedAt) &&
    !Number.isNaN(Date.parse(value.exportedAt)) &&
    isValidOptions(value.options) &&
    isValidBlockedTopicList(value.blockedTopicList) &&
    isValidBiliImgHistory(value.biliImgHistory)
  );
};

const padDateTimeValue = (value: number) => {
  return String(value).padStart(2, '0');
};

const formatDateTimeWithOffset = (date: Date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const dateValue = [date.getFullYear(), padDateTimeValue(date.getMonth() + 1), padDateTimeValue(date.getDate())].join(
    '-',
  );
  const timeValue = [
    padDateTimeValue(date.getHours()),
    padDateTimeValue(date.getMinutes()),
    padDateTimeValue(date.getSeconds()),
  ].join(':');
  const offsetValue = `${offsetSign}${padDateTimeValue(Math.floor(absoluteOffsetMinutes / 60))}:${padDateTimeValue(
    absoluteOffsetMinutes % 60,
  )}`;

  return `${dateValue}T${timeValue}${offsetValue}`;
};

const formatFilenameTimestamp = (date: Date) => {
  return [
    date.getFullYear(),
    padDateTimeValue(date.getMonth() + 1),
    padDateTimeValue(date.getDate()),
    padDateTimeValue(date.getHours()),
    padDateTimeValue(date.getMinutes()),
    padDateTimeValue(date.getSeconds()),
  ].join('-');
};

export const createExtConfig = async (): Promise<ExtConfig> => {
  const [settings, biliImgHistory] = await Promise.all([getStorage(), getAllImgHistory()]);

  return {
    version: EXT_CONFIG_VERSION,
    exportedAt: formatDateTimeWithOffset(new Date()),
    options: cloneDeep(settings.options),
    blockedTopicList: cloneDeep(settings.blockedTopicList),
    biliImgHistory,
  };
};

export const downloadExtConfig = (config: ExtConfig): void => {
  const content = JSON.stringify(config, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = `${EXT_CONFIG_FILENAME_PREFIX}-${formatFilenameTimestamp(new Date())}.json`;
  anchor.style.display = 'none';
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
};

export const parseExtConfig = async (file: File): Promise<ExtConfig> => {
  const value = JSON.parse(await file.text()) as unknown;

  if (!isValidExtConfig(value)) {
    throw new Error('Invalid extension configuration');
  }

  return value;
};

export const applyExtConfig = async (config: ExtConfig): Promise<StorageSettings> => {
  const [previousSettings, previousBiliImgHistory] = await Promise.all([getStorage(), getAllImgHistory()]);
  const nextSettings: StorageSettings = {
    ...previousSettings,
    options: merge(cloneDeep(defaultExtensionOptions), cloneDeep(config.options)),
    blockedTopicList: cloneDeep(config.blockedTopicList),
  };

  try {
    await setStorage({
      options: nextSettings.options,
      blockedTopicList: nextSettings.blockedTopicList,
    });
    await replaceAllImgHistory(config.biliImgHistory);
  } catch (error) {
    await Promise.allSettled([
      setStorage({
        options: previousSettings.options,
        blockedTopicList: previousSettings.blockedTopicList,
      }),
      replaceAllImgHistory(previousBiliImgHistory),
    ]);
    throw error;
  }

  return nextSettings;
};

export const resetExtOptions = async (): Promise<StorageSettings> => {
  const settings = await getStorage();
  const nextSettings: StorageSettings = {
    ...settings,
    options: cloneDeep(defaultExtensionOptions),
  };

  await setStorage({
    options: nextSettings.options,
  });

  return nextSettings;
};
