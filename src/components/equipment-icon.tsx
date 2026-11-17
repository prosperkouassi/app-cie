import { Image } from 'expo-image';
import type { ApplianceId } from '@/utils/setup-params';

const sources = {
  fridge: require('../../assets/icons/refrigerateur.svg'),
  freezer: require('../../assets/icons/congelateur.svg'),
  'air-conditioner': require('../../assets/icons/climatiseur.svg'),
  fan: require('../../assets/icons/ventilateur.svg'),
  tv: require('../../assets/icons/television.svg'),
  'washing-machine': require('../../assets/icons/lave-linge.svg'),
  'water-heater': require('../../assets/icons/chauffe-eau.svg'),
  iron: require('../../assets/icons/fer-a-repasser.svg'),
  lighting: require('../../assets/icons/lighting.svg'),
  other: require('../../assets/icons/ordinateur.svg'),
};
export const otherIcons = {
  computer: { label: 'Ordinateur', source: require('../../assets/icons/ordinateur.svg') },
  kettle: { label: 'Bouilloire', source: require('../../assets/icons/bouilloire.svg') },
  oven: { label: 'Four', source: require('../../assets/icons/four.svg') },
  microwave: { label: 'Micro-ondes', source: require('../../assets/icons/micro-ondes.svg') },
  vacuum: { label: 'Aspirateur', source: require('../../assets/icons/aspirateur.svg') },
  cooker: { label: 'Cuiseur à riz', source: require('../../assets/icons/cuiseur-riz.svg') },
} as const;
export function EquipmentIcon({ type, size = 52, iconKey }: { type: ApplianceId; size?: number; iconKey?: string }) {
  const choice = type === 'other' && iconKey && Object.hasOwn(otherIcons, iconKey) ? otherIcons[iconKey as keyof typeof otherIcons].source : sources[type];
  return <Image source={choice} contentFit="contain" style={{ width: size, height: size }} accessible={false} />;
}
