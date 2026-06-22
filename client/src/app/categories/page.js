// client/src/app/categories/page.js
'use client';

import React from 'react';
import Link from 'next/link';
import './categories.css';
import { 
  Smartphone,
  Laptop,
  Shirt,
  Home,
  Utensils,
  Baby,
  HeartPulse,
  PawPrint,
  Sprout,
  Gamepad2,
  Headphones,
  Car,
  Wrench,
  Dumbbell,
  Book,
  Briefcase
} from 'lucide-react';
import Sparkles from '../../components/Sparkles';

const CATEGORIES = [
  { key: 'electronique', label: 'Électronique', icon: Smartphone },
  { key: 'informatique', label: 'Informatique', icon: Laptop },
  { key: 'vetements', label: 'Vêtements', icon: Shirt },
  { key: 'beaute', label: 'Beauté', icon: Sparkles },
  { key: 'maison', label: 'Maison & Déco', icon: Home },
  { key: 'cuisine', label: 'Cuisine', icon: Utensils },
  { key: 'bebe-enfants', label: 'Bébé & Enfants', icon: Baby },
  { key: 'sante', label: 'Santé', icon: HeartPulse },
  { key: 'animaux', label: 'Animaux', icon: PawPrint },
  { key: 'jardin', label: 'Jardin', icon: Sprout },
  { key: 'jeux', label: 'Jeux & Consoles', icon: Gamepad2 },
  { key: 'musique', label: 'Musique', icon: Headphones },
  { key: 'vehicules', label: 'Véhicules', icon: Car },
  { key: 'immobilier', label: 'Immobilier', icon: Home },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'sports', label: 'Sports & Loisirs', icon: Dumbbell },
  { key: 'livres', label: 'Livres & BD', icon: Book },
  { key: 'emploi', label: 'Emploi & Recrutement', icon: Briefcase },
  { key: 'autres', label: 'Autres', icon: Sparkles }
];

export default function CategoriesPage() {
  return (
    <div className="categories-page-container">
      <div className="categories-page-header">
        <h1>Toutes les catégories</h1>
        <p>Sélectionnez une catégorie pour voir ses articles sur Vendoscity</p>
      </div>

      <div className="categories-page-grid">
        {CATEGORIES.map((c) => {
          const IconComponent = c.icon;
          return (
            <Link 
              key={c.key} 
              href={`/boutique?category=${c.key}`} 
              className="categories-page-tile pressable"
            >
              <span className="categories-page-ico">
                <IconComponent width="24" height="24" />
              </span>
              <span className="categories-page-label">{c.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
