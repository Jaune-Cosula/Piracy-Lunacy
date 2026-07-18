import React from 'react';
import { 
  Skull, 
  Anchor, 
  Waves, 
  Crown, 
  Sword, 
  Compass, 
  Coins, 
  Gem, 
  Flame, 
  Moon, 
  Ship, 
  Wind,
  Shield,
  Star,
  Zap,
  Target
} from 'lucide-react';

interface FlagProps {
  flagId: number;
  color: string; // Hex color or Tailwind name
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const FLAG_COLORS = [
  '#e11d48', '#2563eb', '#16a34a', '#ca8a04', '#9333ea', 
  '#ea580c', '#0d9488', '#4b5563', '#111827', '#db2777',
  '#06b6d4', '#84cc16', '#a855f7', '#64748b', '#dc2626'
];

export const getFlagConfig = (id: number) => {
  const patterns = [
    { bg: 'solid', style: 'bg-current' },
    { bg: 'horizontal-stripes', style: 'bg-current' }, // Custom rendering in component
    { bg: 'vertical-stripes', style: 'bg-current' },
    { bg: 'checkered', style: 'bg-current' },
    { bg: 'saltire', style: 'bg-current' },
    { bg: 'border', style: 'bg-current' },
    { bg: 'cross', style: 'bg-current' },
    { bg: 'diagonal', style: 'bg-current' },
  ];

  const icons = [
    Skull, Anchor, Waves, Crown, Sword, Compass, Coins, Gem, 
    Flame, Moon, Ship, Wind, Shield, Star, Zap, Target
  ];

  const patternIndex = (id - 1) % patterns.length;
  const iconIndex = Math.floor((id - 1) / patterns.length) % icons.length;

  return {
    pattern: patterns[patternIndex],
    Icon: icons[iconIndex] || Skull,
    patternId: patternIndex,
    iconId: iconIndex
  };
};

export const FlagSymbol: React.FC<FlagProps> = ({ flagId, color, size = 'md', className = '' }) => {
  const { patternId, Icon } = getFlagConfig(flagId);

  const sizeClasses = {
    sm: 'w-8 h-6 text-xs',
    md: 'w-12 h-9 text-sm',
    lg: 'w-20 h-14 text-lg',
    xl: 'w-32 h-22 text-2xl'
  };

  // Base background style (we can mix dark charcoal/black backgrounds with the selected accent colors!)
  const getPatternBackgroundStyle = () => {
    switch (patternId) {
      case 0: // Solid color
        return { 
          backgroundColor: color,
          backgroundImage: 'none',
          backgroundSize: 'auto'
        };
      case 1: // Stripes horizontal
        return {
          backgroundColor: 'transparent',
          backgroundImage: `repeating-linear-gradient(0deg, ${color}, ${color} 8px, #1a1a1a 8px, #1a1a1a 16px)`,
          backgroundSize: 'auto'
        };
      case 2: // Stripes vertical
        return {
          backgroundColor: 'transparent',
          backgroundImage: `repeating-linear-gradient(90deg, ${color}, ${color} 8px, #111111 8px, #111111 16px)`,
          backgroundSize: 'auto'
        };
      case 3: // Checkered
        return {
          backgroundColor: 'transparent',
          backgroundImage: `conic-gradient(#111111 90deg, ${color} 90deg 180deg, #111111 180deg 270deg, ${color} 270deg)`,
          backgroundSize: 'auto'
        };
      case 4: // Saltire
        return {
          backgroundColor: 'transparent',
          backgroundImage: `radial-gradient(circle, #222222 20%, transparent 20%), linear-gradient(45deg, ${color} 25%, #111111 25% 75%, ${color} 75%), linear-gradient(-45deg, ${color} 25%, #111111 25% 75%, ${color} 75%)`,
          backgroundSize: '100% 100%'
        };
      case 5: // Border
        return {
          backgroundColor: '#111111',
          backgroundImage: 'none',
          backgroundSize: 'auto',
          border: `3px solid ${color}`
        };
      case 6: // Cross
        return {
          backgroundColor: '#1a1a1a',
          backgroundImage: `linear-gradient(to right, transparent 40%, ${color} 40% 60%, transparent 60%), linear-gradient(to bottom, transparent 40%, ${color} 40% 60%, transparent 60%)`,
          backgroundSize: 'auto'
        };
      case 7: // Diagonal
        return {
          backgroundColor: 'transparent',
          backgroundImage: `linear-gradient(135deg, ${color} 50%, #111111 50%)`,
          backgroundSize: 'auto'
        };
      default:
        return { 
          backgroundColor: color,
          backgroundImage: 'none',
          backgroundSize: 'auto'
        };
    }
  };

  const isDarkColor = color === '#111111' || color === '#1f2937' || color === '#4b5563';
  const iconColor = isDarkColor && patternId === 0 ? '#ffffff' : '#ffffff';

  return (
    <div 
      className={`relative inline-flex items-center justify-center rounded border border-neutral-700 shadow-md overflow-hidden transition-all duration-300 ${sizeClasses[size]} ${className}`}
      style={getPatternBackgroundStyle()}
    >
      {/* Central circular backplate to keep icon extremely readable */}
      <div className="absolute inset-0 m-auto w-1/2 h-1/2 max-w-[24px] max-h-[24px] rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <Icon 
          style={{ color: iconColor }} 
          size={size === 'xl' ? 24 : size === 'lg' ? 18 : size === 'md' ? 14 : 10} 
          className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        />
      </div>
      
      {/* Little tattered flag outline effect */}
      <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-black/25" />
    </div>
  );
};
