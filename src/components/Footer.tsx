"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaTiktok, FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  const { language } = useLanguage();
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [footerSettings, setFooterSettings] = useState({
    facebook_link: 'https://www.facebook.com/maborongmphs',
    instagram_link: 'https://www.instagram.com/mpaborong_mphs',
    youtube_link: 'https://www.youtube.com/@MajlisPerbandranHuluSelango',
    tiktok_link: 'https://www.tiktok.com/@mphs_official',
    whatsapp_link: 'https://wa.me/60360641331',
    asset_number: '1029392',
  });

  useEffect(() => {
    // Get visitor count from localStorage or initialize
    const storedCount = localStorage.getItem('visitorCount');
    const sessionVisited = sessionStorage.getItem('hasVisited');
    
    let count = storedCount ? parseInt(storedCount, 10) : 0;
    
    // Only increment if this is a new session
    if (!sessionVisited) {
      count += 1;
      localStorage.setItem('visitorCount', count.toString());
      sessionStorage.setItem('hasVisited', 'true');
    }
    
    setVisitorCount(count);

    // Load footer settings from API
    fetch('/api/footer-settings')
      .then(res => res.json())
      .then(data => {
        setFooterSettings({
          facebook_link: data.facebook_link || 'https://www.facebook.com/maborongmphs',
          instagram_link: data.instagram_link || 'https://www.instagram.com/mpaborong_mphs',
          youtube_link: data.youtube_link || 'https://www.youtube.com/@MajlisPerbandranHuluSelango',
          tiktok_link: data.tiktok_link || 'https://www.tiktok.com/@mphs_official',
          whatsapp_link: data.whatsapp_link || 'https://wa.me/60360641331',
          asset_number: data.asset_number || '1029392',
        });
      })
      .catch(err => console.error('Error loading footer settings:', err));
  }, []);

  // Format visitor count with leading zeros (8 digits)
  const formatVisitorCount = (count: number): string[] => {
    return count.toString().padStart(8, '0').split('');
  };

  return (
    <footer className="bg-muted border-t mt-20">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Left Section - QR Code & Address (rapat) */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Image
                src="/QR_MPHS.png"
                alt="QR Code MPHS"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>

            {/* Address Section */}
            <div className="text-left">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Majlis Perbandaran Hulu Selangor (MPHS),<br />
              Jalan Bukit Kerajaan,<br />
              44000 Kuala Kubu Bharu,<br />
              Selangor Darul Ehsan.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Isnin - Jumaat : 8:00ptg - 5:00ptg
            </p>
          </div>
          </div>

          {/* Contact Info - Centered container with left-aligned text */}
          <div className="flex justify-center">
            <div className="space-y-0 text-sm text-muted-foreground text-left">
              <p>T : +603.6064 1331</p>
              <p>F : +603.6064 3991</p>
              <p>E : webmaster@mphs.gov.my</p>
            </div>
          </div>

          {/* Right Section - Social Media */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-3">
              {footerSettings.facebook_link && (
                <a href={footerSettings.facebook_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  <Facebook className="h-5 w-5 text-primary" />
                </a>
              )}
              {footerSettings.instagram_link && (
                <a href={footerSettings.instagram_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  <Instagram className="h-5 w-5 text-primary" />
                </a>
              )}
              {footerSettings.youtube_link && (
                <a href={footerSettings.youtube_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  <Youtube className="h-5 w-5 text-primary" />
                </a>
              )}
              {footerSettings.tiktok_link && (
                <a href={footerSettings.tiktok_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  <FaTiktok className="h-5 w-5 text-primary" />
                </a>
              )}
              {footerSettings.whatsapp_link && (
                <a href={footerSettings.whatsapp_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  <FaWhatsapp className="h-5 w-5 text-primary" />
                </a>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Jumlah Pelawat :</span>
                <div className="flex gap-0.5">
                  {formatVisitorCount(visitorCount).map((digit, index) => (
                    <span
                      key={index}
                      className="bg-blue-600 text-white text-xs font-mono px-1.5 py-0.5 rounded"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">No Asset: {footerSettings.asset_number}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - PDPA Notice */}
      <div className="bg-muted border-t py-4">
        <div className="container mx-auto px-4">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Majlis Perbandaran Hulu Selangor (MPHS) menghargai data peribadi dan memastikan semua data yang dikumpul adalah selaras dengan PDPA (Personal Data Protection Act 2010). MPHS tidak bertanggungjawab terhadap sebarang kehilangan atau kerosakan yang dialami kerana menggunakan maklumat dalam laman ini.
          </p>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Paparan terbaik menggunakan pelayar versi terkini Google Chrome, Mozilla Firefox, Microsoft Edge dan Safari.
          </p>
        </div>
      </div>
    </footer>
  );
}
