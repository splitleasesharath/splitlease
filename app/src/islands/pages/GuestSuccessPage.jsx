import { useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

gsap.registerPlugin(ScrollTrigger);

// ============================================================================
// DATA: Success Stories
// ============================================================================

const successStories = [
  {
    name: 'Priya Sharma',
    role: 'Senior Product Designer',
    schedule: '12 nights/month in NYC',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop',
    quote: "I work with NYC clients regularly and needed a consistent place to stay. Split Lease gave me the consistency I needed without the commitment I didn't. Saved $24K last year and never had a booking nightmare.",
    fullStory: "Working remotely for a San Francisco tech company while maintaining NYC client relationships meant I was flying in 3 times a month. Hotels were eating my entire travel budget, and Airbnb was a gamble—one time I showed up to find the 'high-speed WiFi' was barely good enough for video calls. Split Lease changed everything. Same apartment in Chelsea, same desk setup, same coffee shop downstairs. My clients think I live here.",
    savings: '$24,000/year',
    location: 'Chelsea, Manhattan'
  },
  {
    name: 'Marcus Chen',
    role: 'Strategy Consultant',
    schedule: '8 nights/month in NYC',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
    quote: "Every week I'm in NYC for client meetings. Split Lease is my second home—literally. Same apartment, same key, zero hassle. It's transformed how I work and live.",
    fullStory: "Management consulting means I'm on the road constantly. Before Split Lease, I was spending 4 hours every trip just figuring out logistics—where to stay, how to get there, whether the place would have decent workspace. Now I just show up. My suits hang in the closet, my favorite coffee mug is in the cabinet. The host and I have never even met, but we share an apartment perfectly.",
    savings: '$18,000/year',
    location: 'Midtown East'
  },
  {
    name: 'David Martinez',
    role: 'Father & Finance Director',
    schedule: 'Every weekend in NYC',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop',
    quote: "I live in Boston but have custody every weekend. Split Lease gave me a consistent place for my kids—their clothes, toys, and favorite books are always there. They call it 'Dad's NYC home.' Worth every penny for that stability.",
    fullStory: "After the divorce, I moved to Boston for work but wasn't giving up weekends with my kids. Hotels were impersonal and expensive. Airbnb meant explaining to an 8-year-old why her room looked different every week. Now Emma has her own bed with her stuffed animals, and Jake has his PlayStation set up. When they walk in on Friday night, they're home.",
    savings: '$2,100/month',
    location: 'Upper West Side'
  },
  {
    name: 'Sarah Kim',
    role: 'MBA Student at Columbia',
    schedule: '3 nights/week in NYC',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop',
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=600&h=400&fit=crop',
    quote: "My program has me in NYC every Tuesday-Thursday. Split Lease saved me from drowning in hotel costs or commuting 4 hours daily. I can focus on my studies, not logistics. My textbooks and study materials stay there—it's my second dorm.",
    fullStory: "The hybrid MBA program sounded perfect until I realized what 3 days a week in NYC actually costs. Hotels near campus? $350/night minimum. A full lease for 3 nights? Insane. Commuting from Philly? 4 hours of my life, gone. Split Lease was the answer I didn't know existed. I share a beautiful studio with a nurse who works weekends. My study corner is always ready.",
    savings: '$15,000/year',
    location: 'Morningside Heights'
  }
];

// ============================================================================
// INTERNAL COMPONENT: Simple Hero Section
// ============================================================================

function HeroSection() {
  const heroRef = useRef(null);
  const contentRef = useRef(null);
  const statsRef = useRef([]);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    const stats = statsRef.current.filter(Boolean);

    if (!hero || !content) return;

    const ctx = gsap.context(() => {
      // Simple fade-in animation on page load
      gsap.from(content, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power2.out'
      });

      // Stats fade in with stagger
      gsap.from(stats, {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.4
      });

      // Subtle parallax on scroll
      gsap.to(content, {
        y: -50,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="hero-section">
      <div ref={contentRef} className="hero-content">
        <span className="hero-eyebrow">Guest Success Stories</span>
        <h1 className="hero-title">
          Real guests. Real results.
        </h1>
        <p className="hero-subtitle">
          See how professionals, students, and parents use Split Lease
          for consistent, affordable NYC stays.
        </p>
        <a href="#stories" className="hero-cta">
          Read Their Stories
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      <div className="hero-stats">
        <div ref={el => statsRef.current[0] = el} className="hero-stat">
          <span className="stat-value">$18K</span>
          <span className="stat-label">Avg. Annual Savings</span>
        </div>
        <div ref={el => statsRef.current[1] = el} className="hero-stat">
          <span className="stat-value">89%</span>
          <span className="stat-label">Return Rate</span>
        </div>
        <div ref={el => statsRef.current[2] = el} className="hero-stat">
          <span className="stat-value">4.9</span>
          <span className="stat-label">Avg. Rating</span>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Simple Problem/Solution Section
// ============================================================================

function ProblemSolutionSection() {
  const sectionRef = useRef(null);
  const problemsRef = useRef([]);
  const solutionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const problems = problemsRef.current.filter(Boolean);
    const solution = solutionRef.current;

    if (!section) return;

    const ctx = gsap.context(() => {
      // Problems fade in with stagger on scroll
      gsap.from(problems, {
        opacity: 0,
        x: -30,
        stagger: 0.15,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      });

      // Solution fades in after problems
      gsap.from(solution, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: solution,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="problem-solution-section">
      <div className="problem-solution-container">
        <div className="problems-side">
          <span className="section-label">The Problem</span>
          <div className="problems-list">
            <div ref={el => problemsRef.current[0] = el} className="problem-item">
              <span className="problem-icon">✕</span>
              <span className="problem-text">Hotels drain your budget</span>
            </div>
            <div ref={el => problemsRef.current[1] = el} className="problem-item">
              <span className="problem-icon">✕</span>
              <span className="problem-text">Airbnb is inconsistent</span>
            </div>
            <div ref={el => problemsRef.current[2] = el} className="problem-item">
              <span className="problem-icon">✕</span>
              <span className="problem-text">Full leases waste money</span>
            </div>
          </div>
        </div>

        <div ref={solutionRef} className="solution-side">
          <span className="section-label">The Solution</span>
          <h2 className="solution-title">Split Lease</h2>
          <p className="solution-text">
            Flexible, recurring rentals that match your schedule.
            Same space every time. No surprises. No wasted nights.
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Simple Stories Section
// ============================================================================

function StoriesSection({ stories, onFindSplitLease }) {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const cards = cardsRef.current.filter(Boolean);

    if (!section || cards.length === 0) return;

    const ctx = gsap.context(() => {
      // Cards fade in with stagger on scroll
      gsap.from(cards, {
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      });
    }, section);

    return () => ctx.revert();
  }, [stories]);

  return (
    <section ref={sectionRef} id="stories" className="stories-section">
      <div className="stories-header">
        <span className="stories-eyebrow">Guest Stories</span>
        <h2 className="stories-title">Hear from our guests</h2>
      </div>

      <div className="stories-grid">
        {stories.map((story, index) => (
          <div
            key={index}
            ref={el => cardsRef.current[index] = el}
            className="story-card"
          >
            <div className="story-card-header">
              <img src={story.avatar} alt={story.name} className="story-avatar" loading="lazy" />
              <div className="story-person">
                <h3 className="story-name">{story.name}</h3>
                <p className="story-role">{story.role}</p>
                <p className="story-schedule">{story.schedule}</p>
              </div>
            </div>

            <blockquote className="story-quote">
              "{story.quote}"
            </blockquote>

            <div className="story-meta">
              <span className="story-savings">{story.savings} saved</span>
              <span className="story-location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {story.location}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="stories-cta">
        <button className="stories-cta-button" onClick={onFindSplitLease}>
          Find Your Space
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN COMPONENT: GuestSuccessPage
// ============================================================================

export default function GuestSuccessPage() {
  const handleFindSplitLease = () => {
    window.location.href = SEARCH_URL;
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Problem/Solution Section */}
      <ProblemSolutionSection />

      {/* Stories Section */}
      <StoriesSection
        stories={successStories}
        onFindSplitLease={handleFindSplitLease}
      />

      {/* Stats Section - Light Gray with Purple Circle Accents */}
      <section className="success-stats-section">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>
        <div className="circle-accent circle-accent-3"></div>

        <div className="success-stats-container">
          <div className="success-stats-header">
            <div className="success-stats-eyebrow">By the Numbers</div>
            <h2 className="success-stats-title">Platform Statistics</h2>
          </div>
          <div className="success-stats-grid">
            <div className="success-stat-card">
              <div className="success-stat-value">$2.4M+</div>
              <div className="success-stat-label">Total Guest Savings</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">12,000+</div>
              <div className="success-stat-label">Nights Booked</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">89%</div>
              <div className="success-stat-label">Return Rate</div>
            </div>
            <div className="success-stat-card">
              <div className="success-stat-value">4.9</div>
              <div className="success-stat-label">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Brand Purple Hero with Gradient Circles */}
      <section className="success-final-cta">
        <div className="gradient-circle gradient-circle-1"></div>
        <div className="gradient-circle gradient-circle-2"></div>
        <div className="gradient-circle gradient-circle-3"></div>

        <div className="success-cta-card">
          <h2 className="success-cta-title">Find your NYC space</h2>
          <p className="success-cta-subtitle">
            Browse available listings and start your flexible rental arrangement.
          </p>
          <div className="success-hero-cta">
            <button className="cta-button cta-primary" onClick={handleFindSplitLease}>
              <span>Browse Listings</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
