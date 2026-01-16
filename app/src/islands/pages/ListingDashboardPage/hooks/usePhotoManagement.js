import { useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

/**
 * Hook for managing listing photos
 * Handles cover photo selection, reordering, and deletion
 */
export function usePhotoManagement(listing, setListing, fetchListing, listingId) {
  const handleSetCoverPhoto = useCallback(async (photoId) => {
    if (!listing || !photoId) return;

    logger.debug('⭐ Setting cover photo:', photoId);

    const photoIndex = listing.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1 || photoIndex === 0) {
      logger.debug('Photo not found or already first');
      return;
    }

    const newPhotos = [...listing.photos];
    const [selectedPhoto] = newPhotos.splice(photoIndex, 1);
    selectedPhoto.isCover = true;

    newPhotos.forEach(p => { p.isCover = false; });
    newPhotos.unshift(selectedPhoto);

    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    try {
      await supabase
        .from('listing_photo')
        .update({ toggleMainPhoto: false })
        .eq('Listing', listingId);

      await supabase
        .from('listing_photo')
        .update({ toggleMainPhoto: true, SortOrder: 0 })
        .eq('_id', photoId);

      for (let i = 0; i < newPhotos.length; i++) {
        if (newPhotos[i].id !== photoId) {
          await supabase
            .from('listing_photo')
            .update({ SortOrder: i })
            .eq('_id', newPhotos[i].id);
        }
      }

      logger.debug('✅ Cover photo updated in listing_photo table');
    } catch (err) {
      logger.error('❌ Error updating cover photo:', err);
      fetchListing(true);
    }
  }, [listing, setListing, fetchListing, listingId]);

  const handleReorderPhotos = useCallback(async (fromIndex, toIndex) => {
    if (!listing || fromIndex === toIndex) return;

    logger.debug('🔀 Reordering photos:', fromIndex, '→', toIndex);

    const newPhotos = [...listing.photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    newPhotos.forEach((p, idx) => {
      p.isCover = idx === 0;
    });

    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    try {
      for (let i = 0; i < newPhotos.length; i++) {
        await supabase
          .from('listing_photo')
          .update({
            SortOrder: i,
            toggleMainPhoto: i === 0,
          })
          .eq('_id', newPhotos[i].id);
      }

      logger.debug('✅ Photos reordered in listing_photo table');
    } catch (err) {
      logger.error('❌ Error reordering photos:', err);
      fetchListing(true);
    }
  }, [listing, setListing, fetchListing]);

  const handleDeletePhoto = useCallback(async (photoId) => {
    if (!listing || !photoId) return;

    logger.debug('🗑️ Deleting photo:', photoId);

    const photoIndex = listing.photos.findIndex(p => p.id === photoId);
    if (photoIndex === -1) {
      logger.debug('Photo not found');
      return;
    }

    const newPhotos = listing.photos.filter(p => p.id !== photoId);

    if (newPhotos.length > 0 && listing.photos[photoIndex].isCover) {
      newPhotos[0].isCover = true;
    }

    setListing(prev => ({
      ...prev,
      photos: newPhotos,
    }));

    try {
      await supabase
        .from('listing_photo')
        .update({ Active: false })
        .eq('_id', photoId);

      if (newPhotos.length > 0 && listing.photos[photoIndex].isCover) {
        await supabase
          .from('listing_photo')
          .update({ toggleMainPhoto: true })
          .eq('_id', newPhotos[0].id);
      }

      logger.debug('✅ Photo deleted from listing_photo table');
    } catch (err) {
      logger.error('❌ Error deleting photo:', err);
      fetchListing(true);
    }
  }, [listing, setListing, fetchListing]);

  return {
    handleSetCoverPhoto,
    handleReorderPhotos,
    handleDeletePhoto
  };
}
