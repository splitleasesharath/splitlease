/**
 * Adaptive photo gallery that adjusts layout based on number of photos
 */
export function PhotoGallery({ photos, listingName, onPhotoClick, isMobile }) {
  const photoCount = photos.length;

  // On mobile: hero image on left, two stacked smaller images on right
  if (isMobile) {
    const hasMorePhotos = photoCount > 3;

    const mobileImageStyle = {
      cursor: 'pointer',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    };

    const mobileImgStyle = {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    };

    // Single photo: full width
    if (photoCount === 1) {
      return (
        <div className="vsl-gallery" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
          <div onClick={() => onPhotoClick(0)} style={{ ...mobileImageStyle, height: '280px' }}>
            <img
              src={photos[0].Photo}
              alt={`${listingName} - main`}
              style={mobileImgStyle}
            />
          </div>
        </div>
      );
    }

    // Two photos: side by side
    if (photoCount === 2) {
      return (
        <div className="vsl-gallery" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          {photos.map((photo, idx) => (
            <div key={photo._id || idx} onClick={() => onPhotoClick(idx)} style={{ ...mobileImageStyle, height: '200px' }}>
              <img
                src={photo['Photo (thumbnail)'] || photo.Photo}
                alt={`${listingName} - ${idx + 1}`}
                style={mobileImgStyle}
              />
            </div>
          ))}
        </div>
      );
    }

    // 3+ photos: Hero + 2 Side (Zillow Style) - CSS Grid with aspect-ratio
    // Grid spans hero across both rows, side images fill remaining cells
    return (
      <div
        className="vsl-gallery"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '2px',
          aspectRatio: '3 / 2',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {/* Hero image - spans both rows */}
        <div
          onClick={() => onPhotoClick(0)}
          style={{ ...mobileImageStyle, gridRow: '1 / -1', borderRadius: 0 }}
        >
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={mobileImgStyle}
          />
        </div>

        {/* Top right image */}
        <div onClick={() => onPhotoClick(1)} style={{ ...mobileImageStyle, borderRadius: 0 }}>
          <img
            src={photos[1]['Photo (thumbnail)'] || photos[1].Photo}
            alt={`${listingName} - 2`}
            style={mobileImgStyle}
          />
        </div>

        {/* Bottom right image with "Show all" overlay if more photos */}
        <div onClick={() => onPhotoClick(2)} style={{ ...mobileImageStyle, borderRadius: 0 }}>
          <img
            src={photos[2]['Photo (thumbnail)'] || photos[2].Photo}
            alt={`${listingName} - 3`}
            style={mobileImgStyle}
          />
          {hasMorePhotos && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(0);
              }}
              className="vsl-gallery-show-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              +{photoCount - 3} more
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Determine grid style based on photo count
  const getGridStyle = () => {
    if (photoCount === 1) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '400px',
        gap: '10px'
      };
    } else if (photoCount === 2) {
      return {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '400px',
        gap: '10px'
      };
    } else if (photoCount === 3) {
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '200px 200px',
        gap: '10px'
      };
    } else if (photoCount === 4) {
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '133px 133px 133px',
        gap: '10px'
      };
    } else {
      // 5+ photos
      return {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '200px 200px',
        gap: '10px'
      };
    }
  };

  // Desktop only styles
  const imageStyle = {
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    position: 'relative'
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  };

  // Render based on photo count
  if (photoCount === 1) {
    return (
      <div className="vsl-gallery" style={getGridStyle()}>
        <div onClick={() => onPhotoClick(0)} style={imageStyle}>
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
      </div>
    );
  }

  if (photoCount === 2) {
    return (
      <div className="vsl-gallery" style={getGridStyle()}>
        {photos.map((photo, idx) => (
          <div key={photo._id || idx} onClick={() => onPhotoClick(idx)} style={imageStyle}>
            <img
              src={photo.Photo}
              alt={`${listingName} - ${idx + 1}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 3) {
    return (
      <div className="vsl-gallery" style={getGridStyle()}>
        <div
          onClick={() => onPhotoClick(0)}
          style={{ ...imageStyle, gridRow: '1 / 3' }}
        >
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
        {photos.slice(1, 3).map((photo, idx) => (
          <div key={photo._id || idx} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 4) {
    return (
      <div className="vsl-gallery" style={getGridStyle()}>
        <div
          onClick={() => onPhotoClick(0)}
          style={{ ...imageStyle, gridRow: '1 / 4' }}
        >
          <img
            src={photos[0].Photo}
            alt={`${listingName} - main`}
            style={imgStyle}
          />
        </div>
        {photos.slice(1, 4).map((photo, idx) => (
          <div key={photo._id || idx} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
            <img
              src={photo['Photo (thumbnail)'] || photo.Photo}
              alt={`${listingName} - ${idx + 2}`}
              style={imgStyle}
            />
          </div>
        ))}
      </div>
    );
  }

  // 5+ photos - Classic Pinterest layout
  const photosToShow = photos.slice(1, 5);

  return (
    <div className="vsl-gallery" style={getGridStyle()}>
      <div
        onClick={() => onPhotoClick(0)}
        style={{ ...imageStyle, gridRow: '1 / 3' }}
      >
        <img
          src={photos[0].Photo}
          alt={`${listingName} - main`}
          style={imgStyle}
        />
      </div>
      {photosToShow.map((photo, idx) => (
        <div key={photo._id || idx} onClick={() => onPhotoClick(idx + 1)} style={imageStyle}>
          <img
            src={photo['Photo (thumbnail)'] || photo.Photo}
            alt={`${listingName} - ${idx + 2}`}
            style={imgStyle}
          />
          {idx === 3 && photoCount > 5 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPhotoClick(0);
              }}
              className="vsl-gallery-show-all"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Show All Photos</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
