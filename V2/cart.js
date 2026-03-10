import { products, formatCurrency } from './data.js';

export let cartItems = [];
const CART_STORAGE_KEY = 'dbor_cart';

export function loadCartFromStorage() {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
        try { cartItems = JSON.parse(saved); } catch (e) { console.error(e); }
    }
}

function saveCartToStorage() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

export function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        window.showToast('Sin stock disponible', 'error');
        return;
    }

    const existingItem = cartItems.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            window.showToast('Máximo alcanzado', 'warning');
            return;
        }
    } else {
        cartItems.push({ ...product, quantity: 1 });
    }
    
    saveCartToStorage();
    renderCart();
}

export function updateQuantity(productId, delta) {
    const index = cartItems.findIndex(item => item.id === productId);
    if (index === -1) return;

    const item = cartItems[index];
    const product = products.find(p => p.id === productId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        cartItems.splice(index, 1);
    } else if (newQty <= product.stock) {
        item.quantity = newQty;
    }
    saveCartToStorage();
    renderCart();
}

export function clearCart() {
    cartItems = [];
    localStorage.removeItem(CART_STORAGE_KEY);
    renderCart();
}

export function renderCart() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (cartItems.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-textMuted opacity-50"><i data-lucide="shopping-cart" class="w-12 h-12 mb-4"></i><p>Vacío</p></div>`;
        updateTotals(0);
    } else {
        let total = 0;
        container.innerHTML = cartItems.map(item => {
            total += item.price * item.quantity;
            return `
            <div class="bg-background rounded-xl p-3 border border-border flex gap-3 items-center">
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-medium text-textMain truncate">${item.name}</h3>
                    <p class="text-primary font-semibold text-sm">${formatCurrency(item.price)}</p>
                </div>
                <div class="flex items-center gap-2 bg-surface rounded-lg p-1 border border-border">
                    <button class="w-6 h-6 flex items-center justify-center hover:bg-surfaceHover rounded" onclick="window.updateCartQty('${item.id}', -1)">-</button>
                    <span class="text-xs font-medium w-4 text-center">${item.quantity}</span>
                    <button class="w-6 h-6 flex items-center justify-center hover:bg-surfaceHover rounded" onclick="window.updateCartQty('${item.id}', 1)">+</button>
                </div>
            </div>`;
        }).join('');
        updateTotals(total);
    }
    if (window.lucide) window.lucide.createIcons();
}

function updateTotals(total) {
    document.getElementById('cart-count').textContent = `${cartItems.length} items`;
    document.getElementById('cart-subtotal').textContent = formatCurrency(total);
    document.getElementById('checkout-btn').disabled = cartItems.length === 0;
}

// HACER GLOBAL PARA EL ONCLICK
window.updateCartQty = updateQuantity;
window.addItemToCart = addToCart;