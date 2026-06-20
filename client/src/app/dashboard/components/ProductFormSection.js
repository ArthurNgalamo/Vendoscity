// client/src/app/dashboard/components/ProductFormSection.js
import React from 'react';
import { UploadCloud, Plus, Minus, Loader, Image as ImageIcon, Trash2 } from 'lucide-react';
import { CATEGORIES, POPULAR_NEIGHBORHOODS } from '../constants';

export default function ProductFormSection({
  isEditingProduct,
  handleProductSubmit,
  prodTitle,
  setProdTitle,
  prodCategory,
  setProdCategory,
  selectVal,
  handleSelectQuartierChange,
  customQuartier,
  handleCustomQuartierChange,
  prodPrice,
  setProdPrice,
  prodOldPrice,
  setProdOldPrice,
  prodDesc,
  setProdDesc,
  prodSpecsPaste,
  setProdSpecsPaste,
  handlePasteSpecs,
  prodSpecs,
  handleSpecChange,
  handleRemoveSpecRow,
  handleAddSpecRow,
  fileInputRef,
  handleImageChange,
  selectedImages,
  handleRemoveImage,
  existingImages,
  handleRemoveExistingImage,
  submittingProduct,
  handleCancelProductEdit,
  normalizeSupabaseImageUrl
}) {
  return (
    <div className="dashboard-form-card">
      <h3 className="dashboard-form-title">
        <UploadCloud width="20" height="20" /> {isEditingProduct ? 'Modifier l\'article' : 'Publier un nouvel article'}
      </h3>

      <form onSubmit={handleProductSubmit} className="dashboard-form">
        <div className="form-group">
          <label htmlFor="prod-title">Titre de l&apos;article *</label>
          <input
            type="text"
            id="prod-title"
            placeholder="Ex: iPhone 14 Pro Max 256GB"
            value={prodTitle}
            onChange={(e) => setProdTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prod-category">Catégorie *</label>
            <select
              id="prod-category"
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              required
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="prod-quartier-select">Quartier (localisation) *</label>
            <select
              id="prod-quartier-select"
              value={selectVal}
              onChange={(e) => handleSelectQuartierChange(e.target.value)}
              required
            >
              <option value="">-- Choisir un quartier --</option>
              {POPULAR_NEIGHBORHOODS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>

            {selectVal === 'Autre' && (
              <div className="custom-quartier-wrapper" style={{ marginTop: '12px' }}>
                <label htmlFor="prod-quartier-custom" style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Entrez votre quartier personnalisé *</label>
                <input
                  type="text"
                  id="prod-quartier-custom"
                  placeholder="Saisissez le quartier..."
                  value={customQuartier}
                  onChange={(e) => handleCustomQuartierChange(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prod-price">Prix (FCFA) *</label>
            <input
              type="number"
              id="prod-price"
              placeholder="Ex: 500000"
              value={prodPrice}
              onChange={(e) => setProdPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-old-price">Prix barré (optionnel, pour promo)</label>
            <input
              type="number"
              id="prod-old-price"
              placeholder="Ex: 550000"
              value={prodOldPrice}
              onChange={(e) => setProdOldPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="prod-desc">Description de l&apos;article</label>
          <textarea
            id="prod-desc"
            placeholder="Indiquez l'état du produit, les options de livraison..."
            value={prodDesc}
            onChange={(e) => setProdDesc(e.target.value)}
            rows="4"
          />
        </div>

        {/* Technical Specs Editor */}
        <div className="specs-editor-container">
          <h4 className="specs-editor-title">Fiche Technique / Caractéristiques</h4>
          
          {/* Paste area for quick insertion */}
          <div className="spec-paste-row">
            <input
              type="text"
              className="spec-paste-input"
              placeholder="Coller rapide (ex: Couleur: Noir; RAM: 8GB)"
              value={prodSpecsPaste}
              onChange={(e) => setProdSpecsPaste(e.target.value)}
            />
            <button
              type="button"
              className="btn-import pressable"
              onClick={handlePasteSpecs}
            >
              Importer
            </button>
          </div>

          <div className="specs-list">
            {prodSpecs.map((row, idx) => (
              <div key={idx} className="spec-row">
                <input
                  type="text"
                  placeholder="Propriété (ex: RAM)"
                  value={row.label}
                  onChange={(e) => handleSpecChange(idx, 'label', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Valeur (ex: 8GB)"
                  value={row.value}
                  onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                />
                <button
                  type="button"
                  className="btn-remove-spec pressable"
                  onClick={() => handleRemoveSpecRow(idx)}
                  disabled={prodSpecs.length <= 1}
                >
                  <Minus width="16" height="16" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-add-spec pressable"
            onClick={handleAddSpecRow}
          >
            <Plus width="16" height="16" /> Ajouter une ligne
          </button>
        </div>

        {/* Images Pickers */}
        <div className="form-group">
          <div className="image-upload-section-title">
            <span>Images du Produit <span className="field-hint">(1 à 6 images)</span></span>
            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>
              {selectedImages.length + existingImages.length}/6
            </span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          
          <div className="image-upload-grid">
            {/* Upload button slot */}
            {selectedImages.length + existingImages.length < 6 && (
              <button
                type="button"
                className="image-upload-slot pressable"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="image-upload-slot-icon" width="24" height="24" />
                <span className="image-upload-slot-text">Ajouter</span>
              </button>
            )}

            {/* Display existing images thumbnails (when editing) */}
            {existingImages.map((img, idx) => (
              <div key={`exist-${idx}`} className="image-upload-thumbnail">
                <img src={normalizeSupabaseImageUrl(img)} alt="" />
                {idx === 0 && <span className="image-upload-badge">Principal</span>}
                <button
                  type="button"
                  className="btn-remove-image"
                  onClick={() => handleRemoveExistingImage(idx)}
                  title="Supprimer l'image"
                >
                  <Trash2 width="12" height="12" />
                </button>
              </div>
            ))}

            {/* Display freshly selected images thumbnails */}
            {selectedImages.map((img, idx) => {
              const isFirst = existingImages.length === 0 && idx === 0;
              return (
                <div key={`new-${idx}`} className="image-upload-thumbnail">
                  <img src={img.previewUrl} alt="" />
                  {isFirst && <span className="image-upload-badge">Principal</span>}
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={() => handleRemoveImage(idx)}
                    title="Supprimer l'image"
                  >
                    <Trash2 width="12" height="12" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit buttons */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={submittingProduct}
            className="btn-primary-form pressable"
          >
            {submittingProduct ? <Loader className="animate-spin" width="16" height="16" /> : isEditingProduct ? 'Enregistrer' : 'Publier le Produit'}
          </button>

          <button
            type="button"
            onClick={handleCancelProductEdit}
            className="btn-secondary-form pressable"
          >
            {isEditingProduct ? 'Annuler' : 'Retour'}
          </button>
        </div>
      </form>
    </div>
  );
}
