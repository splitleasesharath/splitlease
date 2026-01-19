/**
 * RatingCategory Component
 *
 * Displays a single rating dimension with title, question, and star input.
 * Shows scale labels ("Very poor" to "Excellent") based on current value.
 */

import StarRating from './StarRating.jsx';
import { RATING_SCALE_LABELS } from '../../../logic/constants/reviewCategories.js';

const RatingCategory = ({
  category,  // { title, question }
  value = 0,
  onChange,
  disabled = false
}) => {
  const scaleLabel = value > 0 ? RATING_SCALE_LABELS[value] : '';

  return (
    <div className={`hrg-rating-category ${disabled ? 'hrg-rating-category--disabled' : ''}`}>
      <div className="hrg-rating-category__header">
        <h4 className="hrg-rating-category__title">{category.title}</h4>
        {scaleLabel && (
          <span className="hrg-rating-category__scale-label">{scaleLabel}</span>
        )}
      </div>

      <p className="hrg-rating-category__question">{category.question}</p>

      <div className="hrg-rating-category__input">
        <StarRating
          value={value}
          onChange={onChange}
          disabled={disabled}
          size="medium"
        />
      </div>
    </div>
  );
};

export default RatingCategory;
