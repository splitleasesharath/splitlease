import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

export default function InternalTestPage() {
  const handleButtonClick = (buttonNumber) => {
    console.log(`Button ${buttonNumber} clicked`);
  };

  return (
    <>
      <Header />

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Internal Test Page
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => handleButtonClick(num)}
              style={{
                padding: '16px 24px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: '#7C3AED',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '60px'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#6D28D9';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#7C3AED';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Button {num}
            </button>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
