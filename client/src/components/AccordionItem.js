// client/src/components/AccordionItem.js
'use client';

import React, { useState } from 'react';
import { ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function AccordionItem({ question, answer, category }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`} data-category={category}>
      <div
        className={`faq-question ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        role="button"
        tabIndex="0"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDown
          className="faq-icon"
          style={{
            width: '22px',
            height: '22px',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          aria-hidden="true"
        />
      </div>
      {isOpen && (
        <div className="faq-answer" style={{ display: 'block' }}>
          <div dangerouslySetInnerHTML={{ __html: answer }} />
          <div className="faq-helpful">
            <button
              type="button"
              className="faq-helpful-btn"
              onClick={(e) => e.preventDefault()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                padding: '8px 15px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              <ThumbsUp width="14" height="14" /> Utile
            </button>
            <button
              type="button"
              className="faq-helpful-btn"
              onClick={(e) => e.preventDefault()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f0f0f0',
                border: '1px solid #ddd',
                padding: '8px 15px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                marginLeft: '8px'
              }}
            >
              <ThumbsDown width="14" height="14" /> Pas utile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
