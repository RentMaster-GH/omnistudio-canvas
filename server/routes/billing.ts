// Add function inside CanvasStudio component
const handleUpgradeToPro = async () => {
  setStatus('Redirecting to Stripe Pro Checkout ($9/mo)...');
  try {
    const res = await axios.post(`${API_BASE}/billing/create-checkout-session`, {
      userId: mockUserId,
      email: 'user@example.com'
    });
    if (res.data?.url) {
      window.location.href = res.data.url; // Redirect to Stripe Checkout page
    }
  } catch (err) {
    alert(`Checkout error: ${err.message}`);
  }
};

// Render button in top navigation bar:
<button 
  onClick={handleUpgradeToPro}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }}
>
  ⚡ Upgrade Pro ($9/mo)
</button>