// src/components/Icon.tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

// نضيف كل الأيقونات مرة واحدة
library.add(fas, far);

interface IconProps {
  icon: IconProp;
  size?: 'xs' | 'sm' | 'lg' | '2x' | '3x';
  color?: string;
  className?: string;
  style?: React.CSSProperties | undefined;
}

const Icon: React.FC<IconProps> = ({ icon, size, color, className, style }) => {
  return (
    <FontAwesomeIcon
      icon={icon}
      size={size}
      color={color}
      className={className}
      style={style as any} 
    />
  );
};

export default Icon;