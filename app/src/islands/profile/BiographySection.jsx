/**
 * Biography Section Component
 *
 * Displays and allows editing of biography fields
 * Based on Bubble.io workflows:
 * - MI: Fill out your Bio to's value is changed (Workflow 29)
 * - MI: need for space's value is changed (Workflow 30)
 * - MI: special needs's value is changed (Workflow 32)
 *
 * Fields from validated schema:
 * - About Me / Bio
 * - need for Space
 * - special needs
 */

import { useState, useEffect } from 'react';

export default function BiographySection({ userData, onUpdate, onProfileCompletenessUpdate }) {
  const [bio, setBio] = useState('');
  const [needForSpace, setNeedForSpace] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

  useEffect(() => {
    if (userData) {
      setBio(userData['About Me / Bio'] || '');
      setNeedForSpace(userData['need for Space'] || '');
      setSpecialNeeds(userData['special needs'] || '');
    }
  }, [userData]);

  const handleBioChange = (e) => {
    const value = e.target.value;
    setBio(value);
  };

  const handleBioBlur = async () => {
    if (bio !== (userData?.['About Me / Bio'] || '')) {
      await onUpdate('About Me / Bio', bio);
      if (bio && !userData?.['About Me / Bio']) {
        // Award profile completeness if first time filling bio
        await onProfileCompletenessUpdate('bio-filled', 5);
      }
    }
  };

  const handleNeedForSpaceChange = (e) => {
    const value = e.target.value;
    setNeedForSpace(value);
  };

  const handleNeedForSpaceBlur = async () => {
    if (needForSpace !== (userData?.['need for Space'] || '')) {
      await onUpdate('need for Space', needForSpace);
      if (needForSpace && !userData?.['need for Space']) {
        await onProfileCompletenessUpdate('need-for-space-filled', 3);
      }
    }
  };

  const handleSpecialNeedsChange = (e) => {
    const value = e.target.value;
    setSpecialNeeds(value);
  };

  const handleSpecialNeedsBlur = async () => {
    if (specialNeeds !== (userData?.['special needs'] || '')) {
      await onUpdate('special needs', specialNeeds);
      if (specialNeeds && !userData?.['special needs']) {
        await onProfileCompletenessUpdate('special-needs-filled', 3);
      }
    }
  };

  return (
    <div className="biography-section">
      <h2 className="section-title">About You</h2>

      {/* Bio Field */}
      <div className="form-group">
        <label htmlFor="bio" className="form-label">
          Tell us about yourself
          <span className="label-hint">(This helps hosts get to know you)</span>
        </label>
        <textarea
          id="bio"
          className="form-textarea"
          value={bio}
          onChange={handleBioChange}
          onBlur={handleBioBlur}
          placeholder="Share a bit about yourself, your interests, and what you're looking for..."
          rows={5}
          maxLength={1000}
        />
        <div className="char-count">{bio.length} / 1000</div>
      </div>

      {/* Need for Space Field */}
      <div className="form-group">
        <label htmlFor="need-for-space" className="form-label">
          Why do you need a split lease?
          <span className="label-hint">(Help hosts understand your situation)</span>
        </label>
        <textarea
          id="need-for-space"
          className="form-textarea"
          value={needForSpace}
          onChange={handleNeedForSpaceChange}
          onBlur={handleNeedForSpaceBlur}
          placeholder="e.g., I travel for work frequently and need flexibility..."
          rows={4}
          maxLength={500}
        />
        <div className="char-count">{needForSpace.length} / 500</div>
      </div>

      {/* Special Needs Field */}
      <div className="form-group">
        <label htmlFor="special-needs" className="form-label">
          Do you have any special requirements?
          <span className="label-hint">(Accessibility, allergies, etc.)</span>
        </label>
        <textarea
          id="special-needs"
          className="form-textarea"
          value={specialNeeds}
          onChange={handleSpecialNeedsChange}
          onBlur={handleSpecialNeedsBlur}
          placeholder="e.g., I have a wheelchair accessible requirement, I'm allergic to pets..."
          rows={3}
          maxLength={300}
        />
        <div className="char-count">{specialNeeds.length} / 300</div>
      </div>
    </div>
  );
}
