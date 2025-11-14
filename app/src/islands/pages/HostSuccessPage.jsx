import { useState, useEffect, useRef } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';

// ============================================================================
// INTERNAL COMPONENT: Hero Section
// ============================================================================

function Hero({ onListProperty }) {
  return (
    <section className="host-success-hero">
      <div className="host-success-hero-content">
        <div className="host-success-hero-text">
          <h1>Helping People Find the Ideal Housing Solution</h1>
          <p>
            Discover how Split Lease helps you make extra income by renting out your property for the part of the week it is available or unused. Read success stories from hosts who have turned their temporarily vacant spaces into valuable income sources, providing travelers with affordable and comfortable places to stay.
          </p>
          <button className="host-success-btn-primary" onClick={onListProperty}>
            List Your Ideal Property
          </button>
        </div>
        <div className="host-success-hero-image">
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

function StoryCard({ story, onListProperty }) {
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
      className={`host-success-story-card ${isVisible ? 'visible' : ''}`}
    >
      <div className="host-success-story-header">
        <img
          src={story.avatar}
          alt={story.name}
          className="host-success-story-avatar"
          loading="lazy"
        />
        <div className="host-success-story-person">
          <h3>{story.name}</h3>
          <p>{story.profession}</p>
        </div>
      </div>
      <div className="host-success-story-content">
        <h4>{story.title}</h4>
        {story.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <div className="host-success-story-cta">
          <p>Let's Find Your Ideal Tenant</p>
          <button className="host-success-btn-secondary" onClick={onListProperty}>
            List Your Property
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: HostSuccessPage
// ============================================================================

export default function HostSuccessPage() {
  // Success stories data
  const stories = [
    {
      name: 'Emily Johnson',
      profession: 'Graphic Designer',
      avatar:
        'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1756215264078x737048307341117100/Emily%20Johnson%20-%20Fake%20Profile%20Photo.jfif',
      title: 'Maximize your unused space with Split Lease—flexible, reliable, and profitable short-term rentals.',
      paragraphs: [
        'As a graphic designer in New York City, I travel frequently for work, leaving my apartment empty for days. Split Lease has been a game-changer, allowing me to rent out my space during these periods. The registration and listing process was straightforward, and the platform\'s flexibility is perfect for my needs, letting me rent out my apartment only on the nights I\'m away.',
        'The verification process for guests gave me peace of mind, ensuring trustworthy renters. Communication tools made coordinating with guests easy, and my first experience was seamless, with the guest leaving my apartment in great condition. Over the past six months, I\'ve hosted several guests, earning extra income that has helped me save for a vacation and cover unexpected expenses.',
        'One of the highlights of using Split Lease is the supportive community and excellent customer service. Connecting with other hosts and getting prompt assistance from the Split Lease team has made the experience smooth and stress-free.',
        'Split Lease has provided a flexible, reliable, and profitable way to rent out my apartment. I highly recommend it to anyone looking to make the most of their unused space.',
      ],
    },
  ];

  // Handle "List Your Property" button click
  const handleListProperty = () => {
    window.location.href = SIGNUP_LOGIN_URL;
  };

  // Page load effects
  useEffect(() => {
    console.log('Host Success Stories page loaded successfully');

    // Performance monitoring
    const loadTime = performance.now();
    console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
  }, []);

  return (
    <>
      <Header />

      <Hero onListProperty={handleListProperty} />

      <section className="host-success-section">
        <h2 className="host-success-title">Our Hosts' Success Stories</h2>

        {stories.map((story, index) => (
          <StoryCard key={index} story={story} onListProperty={handleListProperty} />
        ))}
      </section>

      <Footer />
    </>
  );
}
