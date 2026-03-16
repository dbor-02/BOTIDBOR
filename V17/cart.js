import { products, formatCurrency } from './data.js';

export let cartItems = [];
const CART_STORAGE_KEY = 'dbor_cart';

export function loadCartFromStorage() {
    console.log('Cargando carrito del storage...');
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
        try { 
            cartItems = JSON.parse(saved); 
            console.log('Carrito cargado:', cartItems);
        } catch (e) { 
            console.error('Error cargando carrito:', e); 
        }
    }
}

function saveCartToStorage() {
    console.log('Guardando carrito en storage:', cartItems);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

export function addToCart(productId) {
    console.log('Añadiendo producto al carrito:', productId);
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
    if (window.updateMobileCartCount) window.updateMobileCartCount();
}

export function updateQuantity(productId, delta) {
    console.log('Actualizando cantidad:', productId, delta);
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
    if (window.updateMobileCartCount) window.updateMobileCartCount();
}

export function clearCart() {
    console.log('Limpiando carrito');
    cartItems = [];
    localStorage.removeItem(CART_STORAGE_KEY);
    renderCart();
    if (window.updateMobileCartCount) window.updateMobileCartCount();
}

export function renderCart() {
    console.log('Renderizando carrito...');
    const container = document.getElementById('cart-items');
    if (!container) {
        console.log('Contenedor del carrito no encontrado');
        return;
    }

    if (cartItems.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-textMuted opacity-50 p-8"><i data-lucide="shopping-cart" class="w-12 h-12 mb-4"></i><p class="text-center">Carrito vacío</p></div>`;
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
                    <button class="w-7 h-7 flex items-center justify-center hover:bg-surfaceHover rounded" onclick="window.updateCartQty('${item.id}', -1)">-</button>
                    <span class="text-sm font-medium w-6 text-center">${item.quantity}</span>
                    <button class="w-7 h-7 flex items-center justify-center hover:bg-surfaceHover rounded" onclick="window.updateCartQty('${item.id}', 1)">+</button>
                </div>
            </div>`;
        }).join('');
        updateTotals(total);
    }
    
    // Actualizar iconos de Lucide
    if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 50);
    }
}

function updateTotals(total) {
    const cartCount = document.getElementById('cart-count');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (cartCount) cartCount.textContent = `${cartItems.length} items`;
    if (cartSubtotal) cartSubtotal.textContent = formatCurrency(total);
    if (checkoutBtn) checkoutBtn.disabled = cartItems.length === 0;
}

// HACER GLOBAL PARA EL ONCLICK
window.updateCartQty = updateQuantity;
window.addItemToCart = addToCart;
window.clearCart = clearCart;