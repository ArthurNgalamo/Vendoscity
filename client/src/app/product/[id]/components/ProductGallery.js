// client/src/app/product/[id]/components/ProductGallery.js
import React from 'react';
import Image from 'next/image';

export default function ProductGallery({
  product,
  images,
  activeImgIdx,
  setActiveImgIdx,
  discountPercent,
  normalizeSupabaseImageUrl
}) {
  return (
    <div>
      <div className="product-detail-main-image">
        {discountPercent > 0 && (
          <div className="product-badge-discount" style={{ zIndex: 1 }}>-{discountPercent}%</div>
        )}
        <Image
          src={normalizeSupabaseImageUrl(images[activeImgIdx])}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          style={{ objectFit: 'contain' }}
          className="vc-skeleton vc-loaded"
          priority
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="product-detail-thumbnails">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImgIdx(idx)}
              className="product-detail-thumb-btn"
              style={{
                borderColor: activeImgIdx === idx ? 'var(--primary-blue)' : '#ddd',
              }}
            >
              <Image
                src={normalizeSupabaseImageUrl(img)}
                alt=""
                fill
                sizes="64px"
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
