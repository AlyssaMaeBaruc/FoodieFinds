import React from 'react';
import Icon from './Icon';

// a recipe photo, or a warm placeholder with the chef hat when a custom recipe has none
function RecipeImage({ src, alt = "", className = "" }) {
  if (src) return <img src={src} alt={alt} className={className} />;
  return (
    <div className={`image-placeholder ${className}`} role={alt ? "img" : undefined} aria-label={alt || undefined}>
      <Icon name="chefHat" size={28} />
    </div>
  );
}

export default RecipeImage;
