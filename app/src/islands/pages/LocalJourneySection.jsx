import { useRef, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function LocalJourneySection({ onExploreRentals }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const headerRef = useRef(null);
  const progressRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const header = headerRef.current;
    const progress = progressRef.current;
    const cards = cardRefs.current.filter(Boolean);

    if (!section || !track) return;

    const getScrollAmount = () => {
      const trackWidth = track.scrollWidth;
      return -(trackWidth - window.innerWidth + 100);
    };

    const ctx = gsap.context(() => {
      // Create the main horizontal scroll timeline
      const scrollTween = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Update progress bar
            if (progress) {
              gsap.to(progress, {
                scaleX: self.progress,
                duration: 0.1,
                ease: "none"
              });
            }
            // Calculate and set active card based on scroll progress
            const cardCount = cards.length;
            const newActiveIndex = Math.min(
              Math.floor(self.progress * cardCount),
              cardCount - 1
            );
            setActiveCardIndex(newActiveIndex);
          }
        }
      });

      // Animate the track position
      scrollTween.to(track, {
        x: getScrollAmount,
        ease: "none"
      });

      // Header parallax effect - moves up and fades slightly as user scrolls
      gsap.to(header, {
        y: -50,
        opacity: 0.3,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${(track.scrollWidth - window.innerWidth) * 0.3}`,
          scrub: true
        }
      });

      // Individual card animations - scale and opacity based on position
      cards.forEach((card, index) => {
        // Initial state for cards (will animate in as they enter viewport center)
        gsap.set(card, {
          scale: 0.85,
          opacity: 0.5,
          rotateY: -5
        });

        // Animate each card as it enters the "active zone" (center of screen)
        gsap.to(card, {
          scale: 1,
          opacity: 1,
          rotateY: 0,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            containerAnimation: scrollTween,
            start: "left 80%",
            end: "left 40%",
            scrub: 0.5
          }
        });

        // Animate card out as it leaves the active zone
        gsap.to(card, {
          scale: 0.9,
          opacity: 0.6,
          rotateY: 5,
          ease: "power2.in",
          scrollTrigger: {
            trigger: card,
            containerAnimation: scrollTween,
            start: "left 30%",
            end: "left -10%",
            scrub: 0.5
          }
        });
      });

    }, section);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      title: 'Move-in Ready',
      description: 'Fully-furnished spaces ensure move-in is a breeze. No need to buy furniture or set up utilities. Just bring your suitcase.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      title: 'Everything You Need',
      description: 'Store items like toiletries, a second monitor, work attire, and more. Your space is ready when you return.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
      title: 'Total Flexibility',
      description: 'Switch neighborhoods seasonally, or keep your spot indefinitely. Discover the freedom of a second-home lifestyle.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      title: 'Business Ready',
      description: 'High-speed Wi-Fi and dedicated workspaces in every unit. Perfect for the hybrid commuter.',
    }
  ];

  // Helper to set card refs
  const setCardRef = (index) => (el) => {
    cardRefs.current[index] = el;
  };

  return (
    <section className="local-journey-section" ref={sectionRef}>
      {/* Progress indicator */}
      <div className="local-journey-progress-container">
        <div className="local-journey-progress-bar" ref={progressRef} />
        <div className="local-journey-progress-dots">
          {features.map((_, index) => (
            <div
              key={index}
              className={`local-journey-progress-dot ${activeCardIndex >= index ? 'active' : ''}`}
            />
          ))}
          <div className={`local-journey-progress-dot cta ${activeCardIndex >= features.length ? 'active' : ''}`} />
        </div>
      </div>

      <div className="local-journey-wrapper">
        <div className="local-journey-header" ref={headerRef}>
          <span className="local-journey-eyebrow">Flexible Living</span>
          <h2>Choose when to be a local</h2>
          <p>Enjoy a second-home lifestyle on your schedule. Stay in the city on the days you need, relax in fully-set spaces.</p>
        </div>

        <div className="local-journey-track" ref={trackRef}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`local-journey-card ${activeCardIndex === index ? 'is-active' : ''}`}
              ref={setCardRef(index)}
            >
              <div className="local-journey-card-number">
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="local-journey-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <div className="local-journey-card-accent" />
            </div>
          ))}

          {/* Final CTA Card */}
          <div
            className={`local-journey-card cta-card ${activeCardIndex >= features.length ? 'is-active' : ''}`}
            ref={setCardRef(features.length)}
          >
            <div className="cta-card-content">
              <h3>Ready to start?</h3>
              <p>Find your perfect split lease today.</p>
              <button className="local-journey-button" onClick={onExploreRentals}>
                <span>Explore Rentals</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
