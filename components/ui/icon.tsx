import type { SVGProps } from 'react';
import {
  DEFAULT_ICON_PACK,
  iconBody,
  iconViewBox,
  sanitizeIconPack,
  type IconName,
  type IconPackId,
} from '@/lib/icons';
import { useOptionalSkin } from '@/hooks/useSkin';
import { cn } from '@/lib/utils';

export type { IconName, IconPackId };

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  pack?: IconPackId;
};

export function Icon({
  name,
  pack,
  className,
  width = 16,
  height = 16,
  ...props
}: IconProps) {
  const skin = useOptionalSkin()?.skin;
  const resolved = sanitizeIconPack(pack ?? skin?.iconPack ?? DEFAULT_ICON_PACK);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={iconViewBox(resolved)}
      width={width}
      height={height}
      fill="currentColor"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      {...props}
      dangerouslySetInnerHTML={{ __html: iconBody(resolved, name) }}
    />
  );
}
