import { useState, useEffect } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import './AboutUsPage.css';

// Team member data - replicated from ZAT-Split Lease Team database structure
const teamMembers = [
  {
    id: 1,
    name: "Sharath Koppu",
    title: "CEO & Co-Founder",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/in/sharathkoppu/",
    active: true,
    order: 1
  },
  {
    id: 2,
    name: "Alex Chen",
    title: "CTO & Co-Founder",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 2
  },
  {
    id: 3,
    name: "Jordan Martinez",
    title: "Head of Operations",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 3
  },
  {
    id: 4,
    name: "Taylor Brooks",
    title: "Head of Product",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 4
  },
  {
    id: 5,
    name: "Morgan Lee",
    title: "Lead Designer",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 5
  },
  {
    id: 6,
    name: "Casey Williams",
    title: "Business Development",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 6
  },
  {
    id: 7,
    name: "Riley Johnson",
    title: "Customer Success",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 7
  },
  {
    id: 8,
    name: "Jamie Kim",
    title: "Marketing Lead",
    image: "/assets/images/team/placeholder.svg",
    clickThroughLink: "https://www.linkedin.com/",
    active: true,
    order: 8
  }
];

function TeamCard({ member }) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (member.clickThroughLink) {
      window.open(member.clickThroughLink, '_blank');
    }
  };

  return (
    <div className="about-team-card" onClick={handleClick} data-member-id={member.id}>
      <div className="about-team-image" style={imageError ? { backgroundColor: '#4B47CE' } : {}}>
        {!imageError && (
          <img
            src={member.image}
            alt={member.name}
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <h3 className="about-team-name">{member.name}</h3>
      <p className="about-team-title">{member.title}</p>
    </div>
  );
}

export default function AboutUsPage() {
  const activeMembers = teamMembers
    .filter(member => member.active)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <Header />

      <main className="about-us-main">
        {/* Section 1: Mission Statement Hero */}
        <section className="about-hero-section">
          <div className="about-container">
            <h1 className="about-mission-statement">
              Our Mission is to Make Repeat Travel Flexible, Fast and Affordable
            </h1>
          </div>
        </section>

        {/* Section 2: Why We Created Split Lease */}
        <section className="about-story-section">
          <div className="about-container">
            <h2 className="about-section-heading">Why We Created Split Lease</h2>

            <div className="about-story-content">
              <p className="about-story-text">
                Some of us were driving 3 hours each way with traffic. Some of us were missing trains after work and scrambling. Some of us were missing catch up sessions with co-workers and friends. Turns out all of us were missing an opportunity – a Split Lease.
              </p>

              <p className="about-story-text about-highlight">
                <strong>We built this company because we were living the need.</strong> Trying to be two places at once. Trying to make hybrid work suck less. And coming up short. We realized a few things:
              </p>

              <ul className="about-pain-points">
                <li>We needed to be in the city part of the time</li>
                <li>But we weren't willing to give up our primary residences.</li>
                <li>Random nights at hotels and Airbnbs add up.</li>
                <li>Carrying a suitcase around everywhere does not make you feel like a local.</li>
              </ul>

              <p className="about-story-text about-highlight">
                <strong>So we crafted a solution for people like ourselves.</strong> Who want to be multi-local without the cost of a second mortgage. And we didn't want to schlep suitcases across NYC. We wanted a reliable place to stay where we could store our stuff and get to know the neighborhood.
              </p>

              <p className="about-story-text about-highlight about-standalone">
                <strong>And it worked.</strong>
              </p>

              <p className="about-story-text">
                We shared space and alternated nights based on our schedules. We each took certain nights of the week that we needed week after week. And most importantly, everybody saved money. It's not the solution for everybody. But it's our mission to make it possible for everyone who needs it.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Meet the Team */}
        <section className="about-team-section">
          <div className="about-container">
            <h2 className="about-section-heading-large">Meet the Team Empowering Multi-Locality</h2>

            <div className="about-team-grid">
              {activeMembers.map(member => (
                <TeamCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: What Split Lease Can Do for You */}
        <section className="about-features-section">
          <div className="about-container">
            <h2 className="about-section-heading-large">What Split Lease Can Do for You</h2>

            <div className="about-features-grid">
              {/* Flexible */}
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                  </svg>
                </div>
                <h3 className="about-feature-title">Flexible</h3>
                <p className="about-feature-description">
                  Part-time, furnished rentals on your terms; stay for a few days or a few months, without abandoning your current home.
                </p>
              </div>

              {/* Fast */}
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h3 className="about-feature-title">Fast</h3>
                <p className="about-feature-description">
                  Experience less booking, less packing, less hassle, to focus on the work at hand or the people you love.
                </p>
              </div>

              {/* Affordable */}
              <div className="about-feature-card">
                <div className="about-feature-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <h3 className="about-feature-title">Affordable</h3>
                <p className="about-feature-description">
                  Extending your stay is saving on booking, cleaning and tax fees, meaning that money is going straight back into your pocket.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
