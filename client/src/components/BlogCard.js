// client/src/components/BlogCard.js
'use client';

import React from 'react';
import { Calendar, User } from 'lucide-react';

export default function BlogCard({ title, category, date, author, excerpt, icon: IconComponent }) {
  return (
    <div className="blog-card" onClick={(e) => e.preventDefault()}>
      <div className="blog-image">
        {IconComponent ? (
          <IconComponent style={{ width: '60px', height: '60px' }} />
        ) : (
          <span style={{ fontSize: '3rem' }}>📰</span>
        )}
      </div>
      <div className="blog-content">
        <span className="blog-category">{category}</span>
        <h3 className="blog-title">{title}</h3>
        <div className="blog-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Calendar width="14" height="14" /> {date}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <User width="14" height="14" /> {author}
          </span>
        </div>
        <p className="blog-excerpt">{excerpt}</p>
        <span className="blog-read-more" style={{ cursor: 'pointer' }}>
          Lire la suite →
        </span>
      </div>
    </div>
  );
}
