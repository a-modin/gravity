import { gameConfig, type PlatformTypeConfigInterface } from './config';

export function getDefaultPlatformType(): PlatformTypeConfigInterface {
  const type = gameConfig.platformTypes.find((entry) => entry.isDefault);
  if (!type) {
    throw new Error('platformTypes must include one entry with isDefault: true');
  }
  return type;
}

export function getDefaultPlatformTypeId(): string {
  return getDefaultPlatformType().id;
}

export function getPlatformType(typeId?: string): PlatformTypeConfigInterface {
  if (!typeId) return getDefaultPlatformType();
  return gameConfig.platformTypes.find((entry) => entry.id === typeId) ?? getDefaultPlatformType();
}

export function rollPlatformTypeId(): string {
  const variants = gameConfig.platformTypes.filter((entry) => !entry.isDefault);

  for (const variant of variants) {
    if ((variant.spawnChance ?? 0) > Math.random()) {
      return variant.id;
    }
  }

  return getDefaultPlatformTypeId();
}

export function platformTypeSkipsSettle(typeId?: string): boolean {
  return getPlatformType(typeId).skipSettle ?? false;
}
