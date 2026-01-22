/**
 * LoadingOverlay Component
 *
 * Full-screen loading indicator with Lottie animation.
 * Uses lottie-react (already installed in Split Lease) instead of @lottiefiles/react-lottie-player.
 */

import Lottie from 'lottie-react';
import clsx from 'clsx';

/**
 * Inline Lottie animation JSON for loading spinner
 * This eliminates the need for an external animation file
 */
const loadingAnimation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Loading',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
            { t: 60, s: [360] },
          ],
        },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              d: 1,
              ty: 'el',
              s: { a: 0, k: [120, 120] },
              p: { a: 0, k: [0, 0] },
              nm: 'Ellipse Path 1',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.31, 0.275, 0.898, 1] }, // Indigo color
              o: { a: 0, k: 100 },
              w: { a: 0, k: 8 },
              lc: 2,
              lj: 1,
              ml: 4,
              d: [
                { n: 'd', nm: 'dash', v: { a: 0, k: 80 } },
                { n: 'g', nm: 'gap', v: { a: 0, k: 200 } },
              ],
              nm: 'Stroke 1',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
            },
          ],
          nm: 'Ellipse 1',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

/**
 * @typedef {Object} LoadingOverlayProps
 * @property {boolean} isVisible - Whether overlay is visible
 * @property {string} [message='Generating your redesign...'] - Loading message
 */

/**
 * Full-screen loading overlay with animation
 * @param {LoadingOverlayProps} props
 */
export const LoadingOverlay = ({
  isVisible,
  message = 'Generating your redesign...',
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm',
        'animate-fade-in'
      )}
    >
      <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4 max-w-sm mx-4">
        <Lottie
          animationData={loadingAnimation}
          loop
          autoplay
          style={{ height: '120px', width: '120px' }}
        />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800">{message}</p>
          <p className="text-sm text-gray-500 mt-1">
            This may take a moment...
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};
