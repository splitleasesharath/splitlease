import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

// ============================================================================
// DATA: Success Stories - Real NYC hosts earning from nights away
// ============================================================================

const successStories = [
  {
    name: 'Monica Reyes',
    situation: 'Flight attendant based at JFK',
    schedule: 'Away Tue–Fri most weeks',
    days: [false, false, true, true, true, true, false], // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    quote: "I'm flying three or four days a week. My apartment just sat empty. Now a consultant from Boston stays Tuesday through Thursday every single week. Same person, same routine. She has her own shelf in my fridge. I come home to a clean apartment and an extra $1,400 in my account.",
    connection: "My guest is a management consultant who flies in for client work. We've never actually met—our schedules are perfect opposites.",
    earnings: '$1,400/month',
    location: 'Astoria'
  },
  {
    name: 'David Okonkwo',
    situation: 'Consultant traveling Mon–Thu',
    schedule: 'Away Mon–Thu for clients',
    days: [false, true, true, true, true, false, false], // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    quote: "I'm in Chicago or Atlanta four days a week for client projects. My Hell's Kitchen studio was costing me $3,200 a month to sit empty. Now I cover half my rent with a professor who teaches Monday through Wednesday. He leaves Thursday morning, I'm back Thursday night.",
    connection: "My guest is a Columbia professor who lives in Philadelphia. He needed a consistent weekday spot near campus.",
    earnings: '$1,600/month',
    location: "Hell's Kitchen"
  },
  {
    name: 'Rachel Steinberg',
    situation: 'Weekends at her Hudson Valley house',
    schedule: 'Upstate every Fri–Sun',
    days: [true, false, false, false, false, true, true], // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    quote: "We bought a place in Beacon and now we're up there every weekend. The city apartment was just sitting there Friday through Sunday. Our guest is a divorced dad who has his kids on weekends—he needed a real home for them, not a hotel. It's been the same family for eight months now.",
    connection: "My guest needed a stable weekend spot for custody visits. His kids have their own room setup now.",
    earnings: '$1,200/month',
    location: 'Upper East Side'
  },
  {
    name: 'James Okafor',
    situation: 'Nurse working night shifts',
    schedule: 'Working nights Sun–Wed',
    days: [true, true, true, true, false, false, false], // Sun, Mon, Tue, Wed, Thu, Fri, Sat
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    quote: "I work 7pm to 7am four nights a week. I sleep at the hospital most of those nights anyway. My guest is an MBA student who needs a quiet place to study Sunday through Wednesday. He's gone by the time I actually need my apartment. Easiest money I've ever made.",
    connection: "My guest is in NYU's executive MBA program. He flies in Sunday, leaves Wednesday, same schedule every week.",
    earnings: '$1,100/month',
    location: 'Washington Heights'
  }
];

// ============================================================================
// INTERNAL COMPONENT: Why It Works Section (Host-specific)
// ============================================================================

function WhyItWorksSection() {
  return (
    <section className="why-it-works-section">
      <div className="why-it-works-container">
        <h2 className="why-it-works-title">Why this works</h2>
        <div className="why-it-works-grid">
          <div className="why-card">
            <div className="why-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h3 className="why-card-title">Income from empty nights</h3>
            <p className="why-card-text">Your apartment sits empty when you travel, work nights, or head upstate. Now those nights pay you $1,000–2,000/month.</p>
          </div>
          <div className="why-card">
            <div className="why-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="why-card-title">Vetted professionals</h3>
            <p className="why-card-text">Your guests are consultants, professors, and executives—not tourists. Same person every week, not strangers.</p>
          </div>
          <div className="why-card">
            <div className="why-card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h3 className="why-card-title">You control the schedule</h3>
            <p className="why-card-text">Set exactly which nights are available. Change it anytime. Your guest only books the nights you're actually away.</p>
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
        <h1 className="stories-title">Your nights away, your income</h1>
        <p className="stories-subtitle">
          Hosts who turned empty apartments into $1,000+ monthly income—with the same guest every week.
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
                <div className="story-schedule-row">
                  <span className="story-schedule">{story.schedule}</span>
                  <div className="schedule-dots">
                    {story.days.map((active, i) => (
                      <span key={i} className={`schedule-dot ${active ? 'active' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <blockquote className="story-quote">
              "{story.quote}"
            </blockquote>

            <div className="story-connection">
              <span className="connection-label">The guest:</span> {story.connection}
            </div>

            <div className="story-meta">
              <span className="story-savings">{story.earnings}</span>
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
// MAIN COMPONENT: HostSuccessPage
// ============================================================================

export default function HostSuccessPage() {
  const handleListProperty = () => {
    window.location.href = '/self-listing-v2';
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
          <h2 className="success-cta-title">Start earning from your empty nights</h2>
          <p className="success-cta-subtitle">
            List your space in 10 minutes. We'll match you with a guest whose schedule fits yours.
          </p>
          <button className="cta-button cta-primary" onClick={handleListProperty}>
            List Your Property
          </button>
        </div>
      </section>

      <Footer />
    </>
  );
}
