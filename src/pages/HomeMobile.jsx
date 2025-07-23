import React from 'react';
import Header from '../components/Header';
import BottomNav from '../components/ui/BottomNav';
import FlashSaleSection from '../components/FlashSaleSection';
import TopSaleSection from '../components/TopSaleSection';
import NewArrivalsSection from '../components/NewArrivalsSection';
import './HomeMobile.css';

const HomeMobile = () => {
  return (
    <div className="home-mobile">
      <Header />
      <main>
        <FlashSaleSection />
        <TopSaleSection />
        <NewArrivalsSection />
        {/* Add more mobile-specific sections here */}
      </main>
      <BottomNav />
    </div>
  );
};

export default HomeMobile; 