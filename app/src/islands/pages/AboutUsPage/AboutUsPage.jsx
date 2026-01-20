import { useState, useEffect } from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { supabase } from '../../../lib/supabase.js';
import './AboutUsPage.css';

/**
 * Formats image URL from Supabase to ensure it has the correct protocol
 * @param {string} imageUrl - The image URL from the database
 * @returns {string} - Properly formatted image URL
 */
function formatImageUrl(imageUrl) {
  if (!imageUrl) return '/assets/images/team/placeholder.svg';

  // If URL starts with //, add https:
  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }

  return imageUrl;
}

function TeamCard({ member }) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (member.clickThroughLink) {
      window.open(member.clickThroughLink, '_blank');
    }
  };

  const imageUrl = formatImageUrl(member.image);

  return (
    <div
      className={`about-team-card ${member.clickThroughLink ? 'clickable' : ''}`}
      onClick={handleClick}
      data-member-id={member.id}
    >
      <div className="about-team-image" style={imageError ? { backgroundColor: '#4B47CE' } : {}}>
        {!imageError && (
          <img
            src={imageUrl}
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

function TeamSkeleton() {
  return (
    <div className="about-team-card about-team-skeleton">
      <div className="about-team-image skeleton-pulse"></div>
      <div className="about-team-name skeleton-pulse skeleton-text"></div>
      <div className="about-team-title skeleton-pulse skeleton-text-small"></div>
    </div>
  );
}

/**
 * Hero carousel avatar component (no names - just photos)
 */
function HeroAvatar({ member }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = formatImageUrl(member.image);

  return (
    <div className="hero-carousel-avatar">
      <div className="hero-avatar-image" style={imageError ? { backgroundColor: '#4B47CE' } : {}}>
        {!imageError && (
          <img
            src={imageUrl}
            alt={member.name}
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
}

export default function AboutUsPage() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        console.log('[AboutUsPage] Fetching team members from Supabase...');

        const { data, error: fetchError } = await supabase
          .schema('reference_table')
          .from('zat_splitleaseteam')
          .select('_id, name, title, image, "click through link", "order"')
          .order('order', { ascending: true });

        if (fetchError) {
          console.error('[AboutUsPage] Error fetching team members:', fetchError);
          setError(fetchError.message);
          return;
        }

        // Transform data to match component expectations
        const transformedData = data.map(member => ({
          id: member._id,
          name: member.name,
          title: member.title,
          image: member.image,
          clickThroughLink: member['click through link'],
          order: member.order
        }));

        console.log('[AboutUsPage] Fetched team members:', transformedData.length);
        setTeamMembers(transformedData);
      } catch (err) {
        console.error('[AboutUsPage] Unexpected error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeamMembers();
  }, []);

  return (
    <>
      <Header />

      <main className="about-us-main">
        {/* Section 1: Mission Statement Hero with Team Carousel */}
        <section className="about-hero-section">
          <div className="about-container">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>MEET OUR TEAM</span>
            </div>

            <h1 className="about-mission-statement">
              Our Mission is to Make Repeat Travel <span className="highlight">Flexible</span>, <span className="highlight">Fast</span> and <span className="highlight">Affordable</span>
            </h1>

            <p className="hero-subtitle">
              We're a team of multilocals who built Split Lease because we were living the need. Now we're making flexible housing accessible to everyone.
            </p>

            {/* Team Avatar Carousel */}
            {!isLoading && teamMembers.length > 0 && (
              <div className="hero-carousel-container">
                <div className="hero-carousel-track">
                  {/* First set of avatars */}
                  {teamMembers.map((member, index) => (
                    <HeroAvatar key={`first-${member.id}`} member={member} index={index} />
                  ))}
                  {/* Duplicate set for seamless loop */}
                  {teamMembers.map((member, index) => (
                    <HeroAvatar key={`second-${member.id}`} member={member} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="hero-cta">
              <a href="#team" className="cta-primary">
                Meet the Team
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
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
        <section id="team" className="about-team-section">
          <div className="about-container">
            <h2 className="about-section-heading-large">Meet the Team Empowering Multi-Locality</h2>

            <div className="about-team-grid">
              {isLoading ? (
                // Show skeleton loaders while loading
                <>
                  <TeamSkeleton />
                  <TeamSkeleton />
                  <TeamSkeleton />
                  <TeamSkeleton />
                </>
              ) : error ? (
                <p className="about-team-error">Unable to load team members. Please try again later.</p>
              ) : teamMembers.length === 0 ? (
                <p className="about-team-empty">No team members to display.</p>
              ) : (
                teamMembers.map(member => (
                  <TeamCard key={member.id} member={member} />
                ))
              )}
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
