import React, { useEffect, useState } from "react";

export default function ManagerAvatar({
  src,
  alt = "",
  className = "",
  discordId = null,
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    // If the stored Discord avatar fails, use the Discord default avatar.
    if (discordId && !hasError) {
      const defaultAvatarIndex =
        Number((BigInt(String(discordId)) >> 22n) % 6n);

      setImageSrc(
        `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
      );

      setHasError(true);
    }
  };

  return (
    <img
      src={imageSrc || undefined}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}