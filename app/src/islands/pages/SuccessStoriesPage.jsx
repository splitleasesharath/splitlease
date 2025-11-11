import { useState, useEffect, useRef } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SEARCH_URL } from '../../lib/constants.js';

// ============================================================================
// INTERNAL COMPONENT: Hero Section
// ============================================================================

function Hero({ onFindSplitLease }) {
  return (
    <section className="success-hero">
      <div className="success-hero-content">
        <div className="success-hero-text">
          <h1>Helping People Find the Ideal Housing Solution</h1>
          <p>
            Discover how Split Lease transforms travel by connecting you to affordable, private
            housing options. Explore stories of travelers like you who have found their perfect
            temporary home and enjoyed unique stays while saving money.
          </p>
          <button className="success-btn-primary" onClick={onFindSplitLease}>
            Find Your Ideal Split Lease
          </button>
        </div>
        <div className="success-hero-image">
          <img
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1603247553911x165995697495644260/RentalRepeat-Graphic.svg"
            alt="Rental Repeat Graphic"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Story Card
// ============================================================================

function StoryCard({ story, onFindSplitLease }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`success-story-card ${isVisible ? 'visible' : ''}`}
    >
      <div className="success-story-header">
        <img
          src={story.avatar}
          alt={story.name}
          className="success-story-avatar"
          loading="lazy"
        />
        <div className="success-story-person">
          <h3>{story.name}</h3>
          <p>{story.profession}</p>
        </div>
      </div>
      <div className="success-story-content">
        <h4>{story.title}</h4>
        <p>{story.story}</p>
        <div className="success-story-cta">
          <p>Let's Find Your Perfect Solution, Too</p>
          <button className="success-btn-secondary" onClick={onFindSplitLease}>
            Find Your Split Lease
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: SuccessStoriesPage
// ============================================================================

export default function SuccessStoriesPage() {
  // Success stories data
  const stories = [
    {
      name: 'Richard Thornton',
      profession: 'Lawyer',
      avatar:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1628195334709x669100317545697300/brad%20circle.png',
      title: 'Split Lease Helps Richard Avoid His 90 min Commute',
      story:
        '"I worked in the city but lived with my wife and kids in Long Island. The commute was killing me. It took 90 minutes either way, so I was wasting about 3 hours each day. I started looking for solutions and stumbled upon Split Lease. I realized there were apartments in the city that were empty during the week. It only took me a few minutes to find one that was perfect for me. It was a 10-minute walk from work and gave me a long-term solution that was much cheaper than I expected! Now I save a dozen hours of commuting time each week, and I\'m home with my family every weekend. Split Lease was perfect for me."',
    },
    {
      name: 'Arvind Chopra',
      profession: 'Business Owner',
      avatar:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1606752112120x678210779169741800/arvind-image-success-story.jpg',
      title: 'Split Lease Helps Business Owner',
      story:
        '"I travel twice a month and was looking for something like Split Lease for a long time. I own a pharmacy in the Bronx, NYC but live in Tampa, cause I hate the cold winters there. Because of COVID, I was doing everything I could to avoid staying at a hotel, so I had a friend who was nice enough to let me stay with him for several visits until I felt guilty for having to ask. I came across Split Lease and was really happy to find an apartment that was only 3 blocks away from my pharmacy. I\'ve been staying here almost two months now, it\'s truly a home away from home."',
    },
    {
      name: 'Blaire Price',
      profession: 'Nursing Student',
      avatar:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1606752218906x606942443627566600/blaire-image-success-story.jpg',
      title: 'Split Lease Helps Doctoral Student',
      story:
        '"I\'m a full-time doctoral CRNA student studying in Manhattan but commuting from Newark. I had a 4 week clinical rotation that required me to be at the partnered hospital 12+ hours a day from Monday to Thursday. I really didn\'t want to have to worry about trying to drive home and come back everyday for my shifts, so I ended up renting a shared Split Lease apartment with two roommates (one who happened to also be a medical student!). Best decision ever. The house was clean, the roommates were nice and overall it was a very pleasant experience. I\'ll definitely consider Split Lease again if I end up working for a hospital in the city."',
    },
    {
      name: 'Natasha S.',
      profession: 'Para-Legal',
      avatar:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1612367322574x246944419010215900/NatashaS.jpg',
      title: 'Split Lease Helps ParaLegal Maintain Pod',
      story:
        'Since the start of the pandemic, I took my kids out of school (my husband is diabetic and at-risk). I was having a hard time keeping my kids focused on working on the laptop all day, I could barely get them to hold still for more than 30 minutes. So I placed my kids in a "learning pod" that some of the neighborhood wives came together to rotate hosting 6-8 kids at a time in their home to teach. It worked out for a couple of months until the case numbers spiked again. I found out one of the kids in the pod had been exposed and later tested positive for covid, but the mother still dropped him off to attend the pod session! I was furious and immediately took my children out. I was seeking an alternative and Split Lease came up. We ended up renting a house with a great kitchen/dining area that I was able to homeschool my kids and also get some work done myself (I work remote for a lawyer and was having to share my office with my husband, who was also newly remote). My kids are doing better with school and the house has a park right across the street, which I\'ll take the kids out over there for "recess". I love being able to earn points on the site too! I\'ve almost earned enough for a free day and it\'s only been 3 weeks',
    },
  ];

  // Handle "Find Your Split Lease" button click
  const handleFindSplitLease = () => {
    window.location.href = SEARCH_URL;
  };

  // Scroll effect for header (implemented in Header component)
  useEffect(() => {
    // Load Lottie player if needed for any future enhancements
    console.log('Success Stories page loaded successfully');

    // Performance monitoring
    const loadTime = performance.now();
    console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
  }, []);

  return (
    <>
      <Header />

      <Hero onFindSplitLease={handleFindSplitLease} />

      <section className="success-stories-section">
        <h2 className="success-stories-title">Our Guests' Success Stories</h2>

        {stories.map((story, index) => (
          <StoryCard key={index} story={story} onFindSplitLease={handleFindSplitLease} />
        ))}
      </section>

      <Footer />
    </>
  );
}
