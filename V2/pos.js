import { categories, products, formatCurrency } from './data.js';

let currentCategory = 'all';
let searchQuery = '';

export function initPOS() {
    renderCategories();
    renderProducts();
    
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderProducts();
    });
}

export function renderProducts() {
    const container = document.getElementById('product-grid');
    if (!container) return;

    const filtered = products.filter(p => {
        const matchCat = currentCategory === 'all' || p.category === currentCategory;
        const matchSearch = p.name.toLowerCase().includes(searchQuery);
        return matchCat && matchSearch;
    });

    container.innerHTML = filtered.map(p => {
        const imageUrl = p.image || `https://placehold.co/400x400/18181b/10b981?text=${p.name.replace(/[^a-zA-Z0-9]/g, '+').substring(0, 15)}`;
        
        return `
        <div class="product-card bg-surface border border-border rounded-2xl overflow-hidden cursor-pointer group" 
             onclick="window.addItemToCart('${p.id}')">
            <div class="aspect-square bg-surfaceHover relative overflow-hidden">
                <img src="${imageUrl}" 
                     class="w-full h-full object-cover transition-all group-hover:scale-105"
                     onerror="this.src='https://placehold.co/400x400/18181b/10b981?text=Producto'">
                <div class="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-[10px] border border-border">
                    Stock: ${p.stock}
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-xs font-medium text-textMain line-clamp-2 h-8">${p.name}</h3>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-primary font-bold">${formatCurrency(p.price)}</span>
                    <div class="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center">+</div>
                </div>
            </div>
        </div>
    `}).join('');
    
    if (window.lucide) window.lucide.createIcons();
}

function renderCategories() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = categories.map(cat => `
        <button class="px-4 py-2 rounded-full text-xs font-medium border border-border ${cat.id === currentCategory ? 'bg-primary text-white' : 'bg-surface text-textMuted'}"
                onclick="window.setCategory('${cat.id}')">
            ${cat.name}
        </button>
    `).join('');
}

window.setCategory = (id) => {
    currentCategory = id;
    renderCategories();
    renderProducts();
};