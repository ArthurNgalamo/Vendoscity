// client/src/app/dashboard/components/ProfileSection.js
import React from 'react';
import { User, Pencil, Eye, EyeOff, Loader } from 'lucide-react';
import { COUNTRIES, parsePhoneNumber } from '../constants';
import { getUserAvatarUrl } from '../../../core/api';

export default function ProfileSection({
  profileData,
  setProfileData,
  isEditingProfile,
  setIsEditingProfile,
  submittingProfile,
  selectedCountry,
  setSelectedCountry,
  nationalPhone,
  setNationalPhone,
  countryDropdownOpen,
  setCountryDropdownOpen,
  countrySearchQuery,
  setCountrySearchQuery,
  newPassword,
  setNewPassword,
  showPassword,
  setShowPassword,
  handleProfileSave,
  handleAvatarUpload,
  isSellerApproved
}) {
  return (
    <div className="dashboard-section active">
      <h2 style={{ color: 'var(--primary-blue)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontWeight: '800' }}>
        <User width="22" height="22" /> Mon Profil
      </h2>

      {/* Photo de profil (Avatar) Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px 0 24px 0' }}>
        <div 
          style={{ 
            position: 'relative', 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '3px solid var(--primary-blue)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            backgroundColor: '#e2e8f0',
            transition: 'transform 0.2s'
          }}
          className="avatar-container-hover"
          onClick={() => {
            document.getElementById('avatar-file-input').click();
          }}
        >
          <img 
            src={getUserAvatarUrl(profileData?.avatar_url, profileData?.shopName || 'V')} 
            alt="Avatar" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div 
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              background: 'rgba(15, 23, 42, 0.75)', 
              color: '#fff', 
              fontSize: '0.68rem', 
              fontWeight: '700', 
              textAlign: 'center', 
              padding: '4px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
          >
            <Pencil width="10" height="10" /> Changer
          </div>
        </div>
        <input 
          type="file" 
          id="avatar-file-input" 
          accept="image/jpeg,image/png,image/webp,image/jpg" 
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && handleAvatarUpload) {
              handleAvatarUpload(file);
            }
          }}
        />
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
          Cliquez sur la photo pour la modifier directement
        </span>
      </div>

      <form className="dashboard-form" onSubmit={handleProfileSave}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={profileData.email}
            disabled
            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div className="form-group">
            <label htmlFor="firstName">Prénom</label>
            <input
              type="text"
              id="firstName"
              value={profileData.firstName}
              onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
              required
              disabled={!isEditingProfile}
              style={{ backgroundColor: !isEditingProfile ? '#f3f4f6' : '#fff' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Nom</label>
            <input
              type="text"
              id="lastName"
              value={profileData.lastName}
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
              required
              disabled={!isEditingProfile}
              style={{ backgroundColor: !isEditingProfile ? '#f3f4f6' : '#fff' }}
            />
          </div>
        </div>

        {isSellerApproved && (
          <div className="form-group">
            <label htmlFor="shopName">Nom de la Boutique</label>
            <input
              type="text"
              id="shopName"
              value={profileData.shopName}
              onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
              required={isSellerApproved}
              disabled={!isEditingProfile}
              style={{ backgroundColor: !isEditingProfile ? '#f3f4f6' : '#fff' }}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="phone">
            {isSellerApproved ? 'WhatsApp (commandes) *' : 'Numéro de téléphone (optionnel)'}
            {!isSellerApproved && <span className="field-hint"> (ex: 681570075)</span>}
          </label>
          {isEditingProfile ? (
            <div className="phone-selector-wrapper" style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <div className={`country-selector ${countryDropdownOpen ? 'open' : ''}`} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="country-trigger"
                  onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                  style={{ border: '2px solid #ddd', borderRadius: '5px', height: '48px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px', background: '#fff', cursor: 'pointer' }}
                >
                  <span className="country-flag" style={{ fontSize: '1.4rem' }}>{selectedCountry.flag}</span>
                  <span className="country-code" style={{ fontWeight: '600', color: 'var(--primary-blue)' }}>{selectedCountry.dial}</span>
                  <span style={{ fontSize: '0.65rem', color: '#666' }}>▼</span>
                </button>

                {countryDropdownOpen && (
                  <div className="country-dropdown" style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: '100%', left: 0, zIndex: 1000, background: '#fff', border: '2px solid var(--primary-blue)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '280px', maxHeight: '300px', overflow: 'hidden' }}>
                    <div className="country-search" style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      <input
                        type="text"
                        placeholder="Rechercher un pays..."
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div className="country-list" style={{ overflowY: 'auto', flex: 1 }}>
                      {COUNTRIES.filter(c => 
                        c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) || 
                        c.dial.includes(countrySearchQuery)
                      ).map((c) => (
                        <div
                          key={c.code}
                          className="country-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCountry(c);
                            setCountryDropdownOpen(false);
                            setCountrySearchQuery('');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        >
                          <span className="flag" style={{ fontSize: '1.4rem' }}>{c.flag}</span>
                          <span className="name" style={{ flex: 1, fontWeight: '500', textAlign: 'left' }}>{c.name}</span>
                          <span className="dial" style={{ color: 'var(--primary-blue)', fontWeight: '600' }}>{c.dial}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                type="tel"
                id="phone"
                placeholder="6XXXXXXX"
                value={nationalPhone}
                onChange={(e) => setNationalPhone(e.target.value.replace(/\D/g, ''))}
                required={isSellerApproved}
                style={{ border: '2px solid #ddd', borderRadius: '5px', padding: '12px', fontSize: '1rem', flex: 1 }}
              />
            </div>
          ) : (
            <input
              type="text"
              id="phone"
              value={profileData.phone || ''}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          )}
        </div>

        {isSellerApproved && (
          <div className="form-group">
            <label htmlFor="bio">Biographie</label>
            <textarea
              id="bio"
              placeholder="Présentez votre boutique..."
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              disabled={!isEditingProfile}
              rows="4"
              style={{ backgroundColor: !isEditingProfile ? '#f3f4f6' : '#fff', fontFamily: 'inherit' }}
            />
          </div>
        )}

        {isEditingProfile && (
          <div className="form-group">
            <label htmlFor="newPassword">Nouveau Mot de Passe (laisser vide pour ne pas changer)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                placeholder="Minimum 6 caractères"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength="6"
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                {showPassword ? <EyeOff width="18" height="18" /> : <Eye width="18" height="18" />}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="btn-primary pressable"
              style={{ background: 'var(--color-yellow)', color: 'var(--primary-blue)' }}
            >
              <Pencil width="16" height="16" style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Modifier mon profil
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setNewPassword('');
                  const parsed = parsePhoneNumber(profileData.phone);
                  setSelectedCountry(parsed.country);
                  setNationalPhone(parsed.national);
                }}
                className="btn-secondary pressable"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submittingProfile}
                className="btn-primary pressable"
                style={{ minWidth: '150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {submittingProfile ? <Loader className="animate-spin" width="16" height="16" /> : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
