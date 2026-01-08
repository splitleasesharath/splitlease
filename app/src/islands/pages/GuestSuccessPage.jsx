import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

// ============================================================================
// DATA: Success Stories - Real life situations that need a second home
// ============================================================================

const successStories = [
  {
    name: 'Dr. Robert Callahan',
    situation: 'Professor with split appointment',
    schedule: 'Tues–Thurs in NYC',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
    quote: "I teach at Columbia two days a week and live in Boston with my family. For years I did the Amtrak shuffle and crashed on colleagues' couches. Now I have my own place in Morningside Heights—my books are there, my reading chair, my coffee routine. It's my academic home.",
    connection: "My host is a Columbia alum who works weekends. We've never met in person, but we swap book recommendations.",
    savings: '$19,000/year vs. hotels',
    location: 'Morningside Heights'
  },
  {
    name: 'James McAllister',
    situation: 'Divorced dad with weekend custody',
    schedule: 'Every Fri–Sun in NYC',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop',
    quote: "After the divorce, I moved to Connecticut for work but I wasn't giving up weekends with my kids. Hotels felt cold and temporary. Now my daughter has her own bed with her stuffed animals, my son has his Xbox set up. When they walk in Friday night, they're home—not visiting.",
    connection: "The host is a nurse who works weekend shifts. Perfect schedule match, and she left a welcome note for my kids.",
    savings: '$2,400/month vs. Airbnb',
    location: 'Upper West Side'
  },
  {
    name: 'Catherine Webb',
    situation: 'Splits time between Connecticut & NYC',
    schedule: 'Mon–Wed in the city',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop',
    quote: "I kept my apartment in Greenwich when I took a role that requires three days in Manhattan. Buying a second place? Insane. Hotels every week? Exhausting and expensive. This is my city home—my clothes hang in the closet, my favorite tea is in the cabinet.",
    connection: "My host went to Yale, I went to Dartmouth. We joke that we're Ivy League roommates who've never met.",
    savings: '$26,000/year vs. hotels',
    location: 'Murray Hill'
  },
  {
    name: 'Michael Thornton',
    situation: 'Executive MBA student',
    schedule: 'Thurs–Sat for classes',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    quote: "The executive program at NYU has me in the city every weekend for two years. Hotels near campus are $350/night. A full lease for three nights a week? Wasteful. Now I have a proper study setup, my textbooks stay there, and I can actually focus on the work.",
    connection: "Host is a Stern alum who remembers the grind. He even left his old case study notes.",
    savings: '$21,000/year vs. hotels',
    location: 'Greenwich Village'
  }
];

// ============================================================================
// INTERNAL COMPONENT: Why It Works Section
// ============================================================================

function WhyItWorksSection() {
  return (
    <section className="why-it-works-section">
      <div className="why-it-works-container">
        <h2 className="why-it-works-title">Why this works</h2>
        <div className="why-it-works-grid">
          <div className="why-card">
            <div className="why-card-icon">🏠</div>
            <h3 className="why-card-title">Your space, every time</h3>
            <p className="why-card-text">Same apartment, same key, same routine. Your things stay there. No more packing a suitcase for a two-night trip.</p>
          </div>
          <div className="why-card">
            <div className="why-card-icon">🤝</div>
            <h3 className="why-card-title">Host someone like you</h3>
            <p className="why-card-text">Ex-locals who probably went to your school, work in your industry, or share your interests. Not strangers—almost-neighbors.</p>
          </div>
          <div className="why-card">
            <div className="why-card-icon">💰</div>
            <h3 className="why-card-title">Fraction of the cost</h3>
            <p className="why-card-text">Pay only for the nights you need. No wasted rent on empty apartments. No $400/night hotels draining your budget.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Stories Section - Static, trustworthy, no animations
// ============================================================================

function StoriesSection({ stories }) {
  return (
    <section id="stories" className="stories-section">
      <div className="stories-header">
        <h1 className="stories-title">Find your second home</h1>
        <p className="stories-subtitle">
          People like you already have one. No need to buy—just share with someone whose schedule is the opposite of yours.
        </p>
      </div>

      <div className="stories-grid">
        {stories.map((story, index) => (
          <div key={index} className="story-card">
            <div className="story-card-header">
              <img src={story.avatar} alt={story.name} className="story-avatar" loading="lazy" />
              <div className="story-person">
                <h3 className="story-name">{story.name}</h3>
                <p className="story-situation">{story.situation}</p>
                <p className="story-schedule">{story.schedule}</p>
              </div>
            </div>

            <blockquote className="story-quote">
              "{story.quote}"
            </blockquote>

            <div className="story-connection">
              <span className="connection-label">The match:</span> {story.connection}
            </div>

            <div className="story-meta">
              <span className="story-savings">{story.savings}</span>
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
    </section>
  );
}

// ============================================================================
// MAIN COMPONENT: GuestSuccessPage
// ============================================================================

export default function GuestSuccessPage() {
  const handleFindSpace = () => {
    window.location.href = SEARCH_URL;
  };

  return (
    <>
      <Header />

      {/* Stories Section - Lead with testimonials first */}
      <StoriesSection stories={successStories} />

      {/* Why It Works Section */}
      <WhyItWorksSection />

      {/* Final CTA Section */}
      <section className="success-final-cta">
        <div className="success-cta-card">
          <h2 className="success-cta-title">Ready to find your second home?</h2>
          <p className="success-cta-subtitle">
            Browse available spaces and connect with hosts whose schedule matches yours.
          </p>
          <button className="cta-button cta-primary" onClick={handleFindSpace}>
            Browse Listings
          </button>
        </div>
      </section>

      <Footer />
    </>
  );
}
