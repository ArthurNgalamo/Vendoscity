// client/src/app/vendeur/page.js
'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VendeurRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) {
      router.replace(`/vendeur/${id}`);
    } else {
      router.replace('/boutique');
    }
  }, [id, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="vc-spinner" style={{
        border: '3px solid #f3f3f3',
        borderTop: '3px solid var(--primary-blue)',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{ marginLeft: '12px', color: '#666' }}>Redirection en cours...</p>
    </div>
  );
}

export default function VendeurRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <p style={{ color: '#666' }}>Chargement...</p>
      </div>
    }>
      <VendeurRedirectHandler />
    </Suspense>
  );
}
